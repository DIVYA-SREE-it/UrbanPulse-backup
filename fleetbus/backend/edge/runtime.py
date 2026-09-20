"""Two independent bounded camera workers on one bus edge device."""
import base64
from collections import Counter, deque
from datetime import datetime, timezone
import json
import logging
import math
import os
from pathlib import Path
import threading
import time
from uuid import uuid4

from edge.outbox import Outbox
from edge.traffic_labels import canonical_name, selected_class_ids, model_identity, inference_settings, vehicle_count as count_vehicles
from edge.road_stabilizer import RoadDetectionStabilizer
from edge.road_overlay import draw_road_detections

BASE = Path(__file__).resolve().parent.parent
LOG = logging.getLogger("urbanpulse.edge")


def load_config():
    path = Path(os.getenv("EDGE_CONFIG", str(BASE / "edge" / "config.json")))
    config = json.loads(path.read_text())
    for key in ("road_model", "road_video", "traffic_model", "traffic_video"):
        value = Path(os.getenv(key.upper(), config[key])).expanduser()
        config[key] = str(value if value.is_absolute() else BASE / value)
    config["device"] = os.getenv("AI_DEVICE", config["device"])
    if Path(config["road_video"]).resolve() == Path(config["traffic_video"]).resolve():
        raise ValueError("Road and traffic cameras require independent video sources")
    for key in ("target_fps", "imgsz", "display_width", "cpu_threads", "route_duration_seconds",
                "congestion_window_seconds", "congestion_hold_seconds",
                "congestion_cooldown_seconds", "road_cooldown_seconds"):
        if config[key] <= 0:
            raise ValueError(f"{key} must be positive")
    if not 0 <= config["congestion_low_max"] < config["congestion_medium_max"]:
        raise ValueError("Congestion thresholds must be ordered")
    if not 0 < config["confidence"] <= 1:
        raise ValueError("confidence must be in (0,1]")
    if len(config["prototype_route"]) < 2:
        raise ValueError("Prototype route requires at least two coordinates")
    for lat, lon in config["prototype_route"]:
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise ValueError("Invalid route coordinate")
    return config


def route_position(config, elapsed):
    # Shared bus clock: different camera durations do not put the bus in two places.
    progress = (elapsed % config["route_duration_seconds"]) / config["route_duration_seconds"]
    route = config["prototype_route"]
    offset = progress * (len(route) - 1)
    index = min(int(offset), len(route) - 2)
    fraction = offset - index
    a, b = route[index], route[index + 1]
    return tuple(a[i] + fraction * (b[i] - a[i]) for i in (0, 1))


class CameraWorker:
    def __init__(self, kind, config, outbox, started):
        self.kind, self.config, self.outbox, self.started = kind, config, outbox, started
        self.camera_id = "FRONT_CAMERA" if kind == "road" else "TRAFFIC_CAMERA"
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.jpeg = None
        self.sequence = 0
        self.published_at = None
        self.road_stabilizer = RoadDetectionStabilizer() if kind == "road" else None
        self.state = {"status": "starting", "error": None, "camera_id": self.camera_id,
                      "bus_id": config["bus_id"], "source": "PRERECORDED_VIDEO_AI",
                      "gps_source": "SIMULATED_ROUTE", "classes": {}, "inference_ms": None,
                      "processed_fps": None, "vehicle_count": None, "counts": {},
                      "congestion_level": "UNKNOWN", "signal_state": "UNKNOWN",
                      "violations_enabled": False}
        self.thread = threading.Thread(target=self.run, name=f"{kind}-camera", daemon=True)

    def snapshot(self):
        with self.lock:
            value = dict(self.state)
            value["frame_age_ms"] = (time.monotonic() - self.published_at) * 1000 if self.published_at else None
            return value

    def event(self, event_type, severity, source_seconds, source_frame, metadata, confidence=None,
              vehicle_count=None, evidence=None):
        lat, lon = route_position(self.config, time.monotonic() - self.started)
        value = {"event_id": str(uuid4()), "event_type": event_type, "severity": severity,
                 "confidence": confidence, "timestamp": datetime.now(timezone.utc).isoformat(),
                 "bus_id": self.config["bus_id"], "camera_id": self.camera_id,
                 "latitude": lat, "longitude": lon, "gps_source": "SIMULATED_ROUTE",
                 "source": "PRERECORDED_VIDEO_AI", "vehicle_count": vehicle_count,
                 "metadata": {**metadata, "source_video_seconds": source_seconds,
                              "source_frame": source_frame, "model": self.model_name,
                              "inference_ms": self.inference_ms}}
        if evidence is not None and self.config["evidence"]:
            value["evidence_jpeg_base64"] = base64.b64encode(evidence).decode("ascii")
        return value

    def run(self):
        cap = None
        try:
            import cv2
            import torch
            from ultralytics import YOLO
            from edge.traffic_core import CONGESTION_THRESHOLDS, congestion_level, classify_light_color
            cfg = self.config
            model_path, video_path = Path(cfg[f"{self.kind}_model"]), Path(cfg[f"{self.kind}_video"])
            if not model_path.is_file():
                raise FileNotFoundError(f"Model missing: {model_path}. Supply the existing trained weights.")
            if not video_path.is_file():
                raise FileNotFoundError(f"Video missing: {video_path}. Supply this camera's independent recording.")
            device = cfg["device"]
            if device == "auto":
                device = "0" if torch.cuda.is_available() else "cpu"
            if device != "cpu" and not torch.cuda.is_available():
                raise RuntimeError("CUDA requested but unavailable in this Python environment")
            self.model_name = model_path.name
            model = YOLO(str(model_path))
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                raise RuntimeError(f"Cannot decode video: {video_path}")
            fps, total = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if not math.isfinite(fps) or fps <= 0 or total <= 0:
                raise RuntimeError("Prerecorded source requires valid FPS and frame count")
            duration = total / fps
            names = model.names
            class_ids = selected_class_ids(names) if self.kind == "traffic" else None
            if self.kind == "traffic":
                if model.task != "detect":
                    raise ValueError("Traffic pipeline requires object-detection weights, not lane segmentation weights")
                identity = model_identity(model_path)
                traffic_conf, traffic_size = inference_settings(cfg, os.environ)
                with self.lock:
                    self.state.update(model_description=identity["description"], model_sha256=identity["sha256"],
                                      detection_confidence=traffic_conf, inference_size=traffic_size)
                LOG.info("Traffic model: %s; classes: %s", identity["description"], names)
            kwargs = dict(imgsz=(cfg["road_imgsz"] if self.kind == "road" else cfg["imgsz"]),
                      conf=(cfg["road_confidence"] if self.kind == "road" else cfg["confidence"]), device=device,
                      half=device != "cpu", verbose=False)
            if self.kind == "traffic":
                kwargs.update(classes=class_ids, conf=traffic_conf, imgsz=traffic_size)
            # Initialize inference/tracker once before starting playback timing.
            ok, warm_frame = cap.read()
            if not ok:
                raise RuntimeError("Cannot read first source frame")
            if self.kind == "traffic":
                model.track(warm_frame, persist=True, tracker="bytetrack.yaml", **kwargs)
                for tracker in model.predictor.trackers:
                    tracker.reset()
            else:
                model.predict(warm_frame, **kwargs)
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            CONGESTION_THRESHOLDS.update(low=cfg["congestion_low_max"], medium=cfg["congestion_medium_max"])
            with self.lock:
                self.state.update(status="running", device=str(device), fp16=device != "cpu",
                    model=self.model_name, classes=names, source_fps=fps,
                    source_width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                    source_height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)), source_duration_seconds=duration)
            playback_start = time.monotonic()
            samples, counts_window = deque(maxlen=240), deque(maxlen=240)
            level_since, previous_level = None, "UNKNOWN"
            last_absolute, last_loop = -1, 0
            while not self.stop.is_set():
                cycle = time.monotonic()
                absolute = int((cycle - playback_start) * fps)
                if absolute <= last_absolute:
                    self.stop.wait(0.005)
                    continue
                loop, target = divmod(absolute, total)
                if loop != last_loop:
                    if self.kind == "traffic":
                        for tracker in model.predictor.trackers:
                            tracker.reset()
                    counts_window.clear()
                    previous_level, level_since = "UNKNOWN", None
                next_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
                # Decode only up to the scheduled frame; large gaps seek, never queue.
                gap = target - next_frame
                if loop != last_loop or gap < 0 or gap > 6:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, target)
                else:
                    for _ in range(gap):
                        cap.grab()
                captured_at = time.monotonic()
                ok, frame = cap.read()
                if not ok:
                    raise RuntimeError(f"Video decode failed at frame {target}")
                source_frame = max(0, int(cap.get(cv2.CAP_PROP_POS_FRAMES)) - 1)
                begin = time.perf_counter()
                if self.kind == "traffic":
                    result = model.track(frame, persist=True, tracker="bytetrack.yaml", **kwargs)[0]
                else:
                    result = model.predict(frame, **kwargs)[0]
                # Ultralytics returns xyxy in original image coordinates and measured inference timing.
                self.inference_ms = float(result.speed["inference"])
                predict_ms = (time.perf_counter() - begin) * 1000
                boxes = []
                counts = Counter()
                signal_candidates = []
                height, width = frame.shape[:2]
                for box in result.boxes:
                    class_id = int(box.cls.item())
                    raw_label = result.names[class_id]
                    label = canonical_name(raw_label) if self.kind == "traffic" else raw_label
                    confidence = float(box.conf.item())

                    # Road model uses class-specific thresholds.
                    # Traffic keeps its normal YOLO confidence handling.
                    if self.kind == "road":
                        class_thresholds = {
                            "crack": 0.45,
                            "pothole": 0.35,
                            "patch": 0.35,
                            "other": 0.45,
                        }

                        if confidence < class_thresholds.get(raw_label, 0.45):
                            continue

                    xyxy = box.xyxy[0].tolist()
                    track = int(box.id.item()) if box.id is not None else None

                    boxes.append({
                        "class_name": label,
                        "raw_class_name": raw_label,
                        "confidence": confidence,
                        "track_id": track,
                        "xyxy": xyxy,
                    })

                    if self.kind == "traffic":
                        counts[label] += 1

                    if self.kind == "traffic" and label == "traffic light":
                        x1, y1, x2, y2 = [int(x) for x in xyxy]
                        crop = frame[
                            max(0, y1):min(height, y2),
                            max(0, x1):min(width, x2)
                        ]

                        color, score = classify_light_color(crop)

                        if color != "unknown":
                            signal_candidates.append({
                                "state": color.upper(),
                                "color_score": score,
                                "detector_confidence": confidence,
                            })
                if self.kind == "road":
                    boxes = self.road_stabilizer.update(boxes)
                vehicle_count = count_vehicles(counts)
                if self.kind == "road":
                    annotated = draw_road_detections(frame, boxes)
                else:
                    annotated = result.plot()
                if annotated.shape[1] > cfg["display_width"]:
                    scale = cfg["display_width"] / annotated.shape[1]
                    annotated = cv2.resize(annotated, (cfg["display_width"], round(annotated.shape[0] * scale)))
                encoded_ok, encoded = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, cfg["jpeg_quality"]])
                if not encoded_ok:
                    raise RuntimeError("JPEG encoding failed")
                jpeg = encoded.tobytes()
                now = time.monotonic()
                samples.append(now)
                while len(samples) > 2 and now - samples[0] > 5:
                    samples.popleft()
                processed_fps = (len(samples) - 1) / (samples[-1] - samples[0]) if len(samples) > 1 else None
                signal_states = {s["state"] for s in signal_candidates}
                signal = next(iter(signal_states)) if len(signal_states) == 1 else "UNKNOWN"
                level, average = "UNKNOWN", None
                if self.kind == "traffic":
                    counts_window.append((now, vehicle_count))
                    while counts_window and now - counts_window[0][0] > cfg["congestion_window_seconds"]:
                        counts_window.popleft()
                    average = sum(n for _, n in counts_window) / len(counts_window)
                    level = congestion_level(average).upper()
                    if level != previous_level:
                        previous_level, level_since = level, now
                    if level in ("MEDIUM", "HIGH") and now - level_since >= cfg["congestion_hold_seconds"]:
                        event = self.event("TRAFFIC_CONGESTION", level, source_frame/fps, source_frame,
                            {"congestion_level": level, "average_vehicle_count": round(average,2),
                             "counts": dict(counts), "model_sha256": identity["sha256"],
                             "model_description": identity["description"],
                             "detection_confidence": traffic_conf,
                             "method": "vehicle-count heuristic; not measured road speed",
                             "thresholds": {"low_max": cfg["congestion_low_max"], "medium_max": cfg["congestion_medium_max"]}},
                            vehicle_count=vehicle_count, evidence=jpeg)
                        self.outbox.put(event, f"{cfg['bus_id']}:{self.camera_id}:congestion:{level}", cfg["congestion_cooldown_seconds"])
                else:
                    grouped = {}
                    for box in boxes:
                        grouped.setdefault(box["class_name"], []).append(box)
                    for label, observations in grouped.items():
                        # A supported class is an observation, never an invented depth/size/damage claim.
                        event = self.event("ROAD_OBSERVATION", "MEDIUM", source_frame/fps, source_frame,
                            {"class_name": label, "detections": observations,
                             "severity_basis": "prototype review priority; physical severity not estimated"},
                            confidence=max(b["confidence"] for b in observations), evidence=jpeg)
                        self.outbox.put(event, f"{cfg['bus_id']}:{self.camera_id}:road:{label}", cfg["road_cooldown_seconds"])
                with self.lock:
                    self.jpeg, self.published_at = jpeg, now
                    self.sequence += 1
                    self.state.update(inference_ms=self.inference_ms, prediction_wall_ms=predict_ms,
                        processed_fps=processed_fps, processing_latency_ms=(now-captured_at)*1000,
                        playback_lag_ms=max(0, (now-playback_start)-(loop*duration+source_frame/fps))*1000,
                        source_video_seconds=source_frame/fps, source_frame=source_frame,
                        skipped_frames=max(0, absolute-last_absolute-1), loop=loop,
                        vehicle_count=vehicle_count if self.kind == "traffic" else None,
                        counts=dict(counts), detection_count=len(boxes), detections=boxes,
                        congestion_level=level, average_vehicle_count=average,
                        signal_state=signal, signals=signal_candidates,
                        updated_at=datetime.now(timezone.utc).isoformat())
                last_absolute, last_loop = absolute, loop
                self.stop.wait(max(0, 1/cfg["target_fps"] - (time.monotonic()-cycle)))
        except Exception as exc:
            LOG.exception("%s camera stopped", self.kind)
            with self.lock:
                self.state.update(status="error", error=str(exc))
        finally:
            if cap is not None:
                cap.release()


class EdgeRuntime:
    def __init__(self):
        self.config = load_config()
        self.started = time.monotonic()
        self.outbox = Outbox(BASE / "data" / "edge-outbox.sqlite3", self.config["central_url"])
        self.workers = {kind: CameraWorker(kind, self.config, self.outbox, self.started)
                        for kind in ("road", "traffic")}
        self.sync_thread = threading.Thread(target=self.outbox.run, name="event-sync", daemon=True)

    def start(self):
        try:
            import cv2
            import torch
            cv2.setNumThreads(1)
            torch.set_num_threads(self.config["cpu_threads"])
        except ImportError:
            pass  # Workers publish the concrete dependency failure independently.
        self.sync_thread.start()
        for worker in self.workers.values():
            worker.thread.start()

    def close(self):
        self.outbox.stop.set()
        for worker in self.workers.values():
            worker.stop.set()
        for worker in self.workers.values():
            worker.thread.join(timeout=8)
        self.sync_thread.join(timeout=6)

    def status(self):
        lat, lon = route_position(self.config, time.monotonic()-self.started)
        return {"bus_id": self.config["bus_id"], "gps": {"latitude": lat, "longitude": lon,
                    "source": "SIMULATED_ROUTE"}, "outbox": self.outbox.status(),
                "cameras": {kind: worker.snapshot() for kind, worker in self.workers.items()}}

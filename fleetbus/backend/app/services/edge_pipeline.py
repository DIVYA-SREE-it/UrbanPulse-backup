"""Edge-side video inference pipeline: YOLO detection + ByteTrack + ANPR.

Pipeline stages per frame:
  1. Vehicle detection + ByteTrack tracking  (yolov8n.pt)
  2. Road hazard detection                    (road_hazard.pt, optional)
  3. ANPR on suspicious vehicles              (EasyOCR on vehicle crops)
  4. Traffic density events                   (aggregate vehicle count)
  5. POST structured events to central API    (POST /api/events)

Design notes:
  - Models are lazy-loaded singletons via get_vehicle_model()/get_hazard_model().
  - ANPR only runs on vehicles flagged suspicious (speed-based heuristic).
  - Hazard detection gracefully no-ops if road_hazard.pt is absent.
  - The event payload exactly matches EdgeEvent in app/events.py.
"""

from __future__ import annotations

import base64
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

import cv2
import numpy as np
import requests

# Reuse your existing model loader + lock from app.model
from app.model import BASE_DIR, model_lock

# Local sibling imports
try:
    from .tracker import VehicleTracker
    from .anpr import extract_plate
except ImportError:
    from tracker import VehicleTracker  # type: ignore
    from anpr import extract_plate  # type: ignore


# ---------------------------------------------------------------------------
# Hazard label remapping
# road_hazard.pt (YOLOv8n, 50 epochs) has 4 classes:
#   0: crack, 1: pothole, 2: patch, 3: other
# Confirmed via:
#   python3 -c "from ultralytics import YOLO; m=YOLO('models/road_hazard.pt'); print(m.names)"
# UrbanPulse vocabulary is a subset — collapse patch/other into road_damage.
# ---------------------------------------------------------------------------

HAZARD_LABEL_MAP = {
    "crack":   "crack",
    "pothole": "pothole",
    "patch":   "road_damage",
    "other":   "road_damage",
}


def remap_hazard_label(raw_label: str) -> str:
    """Map road_hazard.pt class name -> UrbanPulse hazard vocabulary."""
    return HAZARD_LABEL_MAP.get(raw_label, raw_label)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODELS_DIR = Path(os.getenv("MODELS_DIR", str(BASE_DIR / "models")))

VEHICLE_MODEL_PATH = Path(
    os.getenv("VEHICLE_MODEL", str(MODELS_DIR / "yolov8n.pt"))
)
HAZARD_MODEL_PATH = Path(
    os.getenv("HAZARD_MODEL", str(MODELS_DIR / "road_hazard.pt"))
)

CENTRAL_API = os.getenv("CENTRAL_API", "http://127.0.0.1:8000/api/events")
BUS_ID = os.getenv("BUS_ID", "BUS-104")
CAMERA_ID = os.getenv("CAMERA_ID", "FRONT_CAMERA")
GPS_SOURCE = os.getenv("GPS_SOURCE", "SIMULATED_ROUTE")
SOURCE_TYPE = os.getenv("SOURCE_TYPE", "PRERECORDED_VIDEO_AI")

VEHICLE_CONF = float(os.getenv("VEHICLE_CONF", "0.35"))
HAZARD_CONF = float(os.getenv("HAZARD_CONF", "0.40"))

SUSPICIOUS_SPEED_PX_PER_FRAME = float(os.getenv("SUSPICIOUS_SPEED", "25.0"))
ANPR_MIN_CROP_PX = 80
ALERT_COOLDOWN_S = float(os.getenv("ALERT_COOLDOWN", "8.0"))
CONGESTION_MIN_VEHICLES = int(os.getenv("CONGESTION_MIN", "15"))


# ---------------------------------------------------------------------------
# Singletons (separate from app.model's singleton — this is a different model)
# ---------------------------------------------------------------------------

_vehicle_model = None
_hazard_model = None
_vehicle_lock = Lock()
_hazard_lock = Lock()

_tracker = VehicleTracker()
_last_alert: dict[int, float] = {}
_prev_center: dict[int, tuple[float, float]] = {}

# --- Event deduplication ---
_recent_events: dict[tuple, float] = {}
_dedup_lock = Lock()
DEDUP_WINDOW_S = float(os.getenv("DEDUP_WINDOW_S", "60"))
DEDUP_GEO_PRECISION = 4  # ~11 meters at equator


def _dedup_key(event_type: str, lat: float, lon: float) -> tuple:
    return (event_type, round(lat, DEDUP_GEO_PRECISION), round(lon, DEDUP_GEO_PRECISION))


def _is_duplicate(event: dict) -> bool:
    """Return True if a similar event was posted within DEDUP_WINDOW_S at nearby GPS."""
    key = _dedup_key(event["event_type"], event["latitude"], event["longitude"])
    now = time.time()
    with _dedup_lock:
        last = _recent_events.get(key, 0.0)
        if now - last < DEDUP_WINDOW_S:
            return True
        _recent_events[key] = now
        if len(_recent_events) > 5000:
            cutoff = now - DEDUP_WINDOW_S * 2
            for k in [k for k, v in _recent_events.items() if v < cutoff]:
                del _recent_events[k]
    return False


# ---------------------------------------------------------------------------
# Model singletons
# ---------------------------------------------------------------------------

def get_vehicle_model():
    """Lazy-load the vehicle model (yolov8n.pt)."""
    global _vehicle_model
    if _vehicle_model is None:
        with _vehicle_lock:
            if _vehicle_model is None:
                if not VEHICLE_MODEL_PATH.is_file():
                    raise FileNotFoundError(
                        f"Vehicle model missing: {VEHICLE_MODEL_PATH}"
                    )
                from ultralytics import YOLO
                _vehicle_model = YOLO(str(VEHICLE_MODEL_PATH))
    return _vehicle_model


def get_hazard_model():
    """Lazy-load road_hazard.pt if it exists; return None otherwise."""
    global _hazard_model
    if _hazard_model is None:
        with _hazard_lock:
            if _hazard_model is None:
                if not HAZARD_MODEL_PATH.is_file():
                    print(f"[edge_pipeline] road_hazard.pt not found at {HAZARD_MODEL_PATH} — hazard events disabled")
                    return None
                from ultralytics import YOLO
                _hazard_model = YOLO(str(HAZARD_MODEL_PATH))
                print(f"[edge_pipeline] Loaded custom road hazard model: {HAZARD_MODEL_PATH}")
                print(f"[edge_pipeline] Hazard classes: {_hazard_model.names}")
    return _hazard_model


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def encode_jpeg_b64(image_bgr: np.ndarray, quality: int = 80) -> str:
    ok, buf = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def estimate_speed_px(det: dict) -> float:
    """Per-frame pixel displacement of track center."""
    bb = det["bounding_box"]
    cx = (bb["x1"] + bb["x2"]) / 2.0
    cy = (bb["y1"] + bb["y2"]) / 2.0
    tid = det["track_id"]
    prev = _prev_center.get(tid)
    _prev_center[tid] = (cx, cy)
    if prev is None:
        return 0.0
    dx = cx - prev[0]
    dy = cy - prev[1]
    return float((dx * dx + dy * dy) ** 0.5)


def is_suspicious(det: dict, speed_px: float) -> bool:
    suspicious_types = {"car", "truck", "bus", "motorcycle"}
    if det["vehicle_type"] not in suspicious_types:
        return False
    return speed_px >= SUSPICIOUS_SPEED_PX_PER_FRAME


def should_alert(track_id: int) -> bool:
    now = time.time()
    last = _last_alert.get(track_id, 0.0)
    if now - last < ALERT_COOLDOWN_S:
        return False
    _last_alert[track_id] = now
    return True


def crop_vehicle(frame_bgr: np.ndarray, bb: dict) -> np.ndarray | None:
    h, w = frame_bgr.shape[:2]
    x1 = max(0, int(bb["x1"]))
    y1 = max(0, int(bb["y1"]))
    x2 = min(w, int(bb["x2"]))
    y2 = min(h, int(bb["y2"]))
    if x2 - x1 < 20 or y2 - y1 < 20:
        return None
    return frame_bgr[y1:y2, x1:x2]


def build_event(
    *,
    event_type: str,
    severity: str,
    confidence: float | None,
    lat: float,
    lon: float,
    track_id: int | None = None,
    vehicle_type: str | None = None,
    vehicle_count: int | None = None,
    plate: str | None = None,
    plate_confidence: float | None = None,
    plate_raw_text: str | None = None,
    metadata: dict | None = None,
    evidence_jpeg_b64: str | None = None,
    evidence_crop_jpeg_b64: str | None = None,
) -> dict:
    """Build a payload matching EdgeEvent in app/events.py."""
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "severity": severity,
        "confidence": float(confidence) if confidence is not None else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bus_id": BUS_ID,
        "camera_id": CAMERA_ID,
        "latitude": lat,
        "longitude": lon,
        "gps_source": GPS_SOURCE,
        "source": SOURCE_TYPE,
        "track_id": track_id,
        "vehicle_type": vehicle_type,
        "vehicle_count": vehicle_count,
        "plate": plate,
        "plate_confidence": plate_confidence,
        "plate_raw_text": plate_raw_text,
        "metadata": metadata or {},
        "evidence_jpeg_base64": evidence_jpeg_b64,
        "evidence_crop_jpeg_base64": evidence_crop_jpeg_b64,
    }


def post_event(payload: dict) -> bool:
    try:
        r = requests.post(CENTRAL_API, json=payload, timeout=5)
        return r.status_code in (200, 201)
    except requests.RequestException:
        return False


# ---------------------------------------------------------------------------
# Main per-frame pipeline
# ---------------------------------------------------------------------------

def process_frame(
    frame_bgr: np.ndarray,
    gps: tuple[float, float],
) -> list[dict]:
    """Run the full pipeline on one frame. Returns list of posted events."""
    lat, lon = gps
    posted: list[dict] = []

    # 1. Vehicle detection + tracking
    vehicle_model = get_vehicle_model()
    result = _tracker.update(frame_bgr, vehicle_model, conf=VEHICLE_CONF)
    detections = _tracker.to_detections(result)

    # 2. Hazard detection (optional)
    hazard_model = get_hazard_model()
    if hazard_model is not None:
        hazard_result = hazard_model.predict(
            source=frame_bgr, conf=HAZARD_CONF, verbose=False
        )[0]
        if hazard_result.boxes is not None:
            for box in hazard_result.boxes:
                cls_id = int(box.cls.cpu().numpy()[0])
                conf = float(box.conf.cpu().numpy()[0])

                # Pull raw label from the hazard model's own names dict,
                # then remap into UrbanPulse vocabulary.
                raw_label = hazard_result.names.get(int(cls_id), "unknown")
                label = remap_hazard_label(raw_label)

                severity = "HIGH" if conf >= 0.7 else "MEDIUM"

                event = build_event(
                    event_type=label.upper().replace(" ", "_"),
                    severity=severity,
                    confidence=conf,
                    lat=lat,
                    lon=lon,
                    metadata={
                        "class_id": cls_id,
                        "class_name": label,
                        "raw_class_name": raw_label,
                    },
                    evidence_jpeg_b64=encode_jpeg_b64(frame_bgr),
                )
                if not _is_duplicate(event) and post_event(event):
                    posted.append(event)

    # 3. Per-vehicle: speed + ANPR + incident
    for det in detections:
        speed_px = estimate_speed_px(det)
        if not is_suspicious(det, speed_px):
            continue
        if not should_alert(det["track_id"]):
            continue

        crop = crop_vehicle(frame_bgr, det["bounding_box"])
        if crop is None or crop.shape[0] < ANPR_MIN_CROP_PX:
            continue

        anpr = extract_plate(crop)
        if not anpr["plate"]:
            continue

        event = build_event(
            event_type="HIT_AND_RUN_SUSPECT",
            severity="HIGH",
            confidence=anpr["confidence"],
            lat=lat,
            lon=lon,
            track_id=det["track_id"],
            vehicle_type=det["vehicle_type"],
            plate=anpr["plate"],
            plate_confidence=anpr["confidence"],
            plate_raw_text=anpr["raw_text"],
            metadata={
                "speed_px_per_frame": round(speed_px, 2),
                "hit_count": det["hit_count"],
                "detection_confidence": det["confidence"],
            },
            evidence_jpeg_b64=encode_jpeg_b64(frame_bgr),
            evidence_crop_jpeg_b64=encode_jpeg_b64(crop),
        )
        if not _is_duplicate(event) and post_event(event):
            posted.append(event)

    # 4. Traffic density event
    if len(detections) >= CONGESTION_MIN_VEHICLES:
        density_event = build_event(
            event_type="TRAFFIC_CONGESTION",
            severity="MEDIUM" if len(detections) < 25 else "HIGH",
            confidence=min(1.0, len(detections) / 40.0),
            lat=lat,
            lon=lon,
            vehicle_count=len(detections),
            metadata={"frame_vehicle_count": len(detections)},
        )
        if not _is_duplicate(density_event) and post_event(density_event):
            posted.append(density_event)

    return posted


# ---------------------------------------------------------------------------
# Video runner
# ---------------------------------------------------------------------------

def run_on_video(
    source_path: str,
    gps_start: tuple[float, float] = (12.9010, 80.2279),
    gps_step: tuple[float, float] = (0.0001, 0.0001),
    frame_skip: int = 1,
) -> int:
    """Process a video file end-to-end; return count of posted events."""
    cap = cv2.VideoCapture(source_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {source_path}")

    lat, lon = gps_start
    posted_count = 0
    idx = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % frame_skip != 0:
                idx += 1
                continue

            lat += gps_step[0]
            lon += gps_step[1]

            events = process_frame(frame, gps=(lat, lon))
            posted_count += len(events)
            idx += 1
    finally:
        cap.release()

    return posted_count


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run edge inference pipeline.")
    parser.add_argument(
        "--source",
        default=str(BASE_DIR.parent / "videos" / "traffic.mp4"),
        help="Path to input video file",
    )
    parser.add_argument("--frame-skip", type=int, default=2)
    args = parser.parse_args()

    print(f"[edge_pipeline] vehicle model: {VEHICLE_MODEL_PATH}")
    print(f"[edge_pipeline] hazard model : {HAZARD_MODEL_PATH}")
    print(f"[edge_pipeline] source       : {args.source}")
    print(f"[edge_pipeline] bus_id       : {BUS_ID}")
    print(f"[edge_pipeline] central API  : {CENTRAL_API}")

    n = run_on_video(args.source, frame_skip=args.frame_skip)
    print(f"[edge_pipeline] done. {n} events posted.")
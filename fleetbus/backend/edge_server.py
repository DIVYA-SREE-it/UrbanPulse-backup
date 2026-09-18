"""Edge node FastAPI server — Live Camera status + MJPEG streams + video upload."""
from __future__ import annotations

import os
import time
import threading
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

try:
    from app.services.edge_pipeline import (
        get_vehicle_model, get_hazard_model,
        VEHICLE_MODEL_PATH, HAZARD_MODEL_PATH, BUS_ID,
    )
except Exception:
    get_vehicle_model = None
    get_hazard_model = None
    VEHICLE_MODEL_PATH = Path("models/yolov8n.pt")
    HAZARD_MODEL_PATH = Path("models/road_hazard.pt")
    BUS_ID = "BUS-104"

BASE_DIR = Path(__file__).resolve().parent
VIDEO_PATH_ROAD = Path(os.getenv("EDGE_VIDEO_ROAD", str(BASE_DIR / "videos" / "road.mp4")))
VIDEO_PATH_TRAFFIC = Path(os.getenv("EDGE_VIDEO_TRAFFIC", str(BASE_DIR / "videos" / "traffic.mp4")))
UPLOAD_DIR = BASE_DIR / "videos" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# SPEED KNOBS
INFERENCE_WIDTH = 320          # downscale before inference
TARGET_FPS = 8                 # frames pushed to browser per second
INFER_EVERY_N_FRAMES = 4       # run YOLO only every Nth frame (big CPU saving)

app = FastAPI(title="UrbanPulse Edge Node")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_lock = threading.Lock()
STATE = {
    "status": "starting", "bus_id": BUS_ID, "inference_ms": 0.0,
    "processed_fps": 0.0, "frame_age_ms": 0.0, "vehicle_count": 0,
    "congestion_level": "UNKNOWN", "signal_state": "UNKNOWN", "counts": {},
    "classes": {}, "model": "yolov8n.pt", "device": "cpu", "fp16": False,
    "model_description": "YOLOv8 nano", "error": None,
    "gps": {"latitude": 12.9010, "longitude": 80.2279},
    "outbox": {"pending_events": 0, "error": None},
}
_latest_frame_road = None
_latest_frame_traffic = None
_frame_lock = threading.Lock()
_current_video_path = {"road": None, "traffic": None}
_video_reload_flag = {"road": False, "traffic": False}


def _synthetic_frame(width=640, height=360, label="EDGE"):
    f = np.zeros((height, width, 3), dtype=np.uint8)
    f[:] = (40, 50, 60)
    cv2.putText(f, f"URBANPULSE {label}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    cv2.putText(f, time.strftime("%H:%M:%S"), (20, height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 220, 255), 2)
    return f


def _open_video(kind):
    up = _current_video_path.get(kind)
    if up and Path(up).is_file():
        cap = cv2.VideoCapture(str(up))
        if cap.isOpened():
            return cap
    dflt = VIDEO_PATH_ROAD if kind == "road" else VIDEO_PATH_TRAFFIC
    if dflt.is_file():
        cap = cv2.VideoCapture(str(dflt))
        if cap.isOpened():
            return cap
    other = VIDEO_PATH_TRAFFIC if kind == "road" else VIDEO_PATH_ROAD
    if other.is_file():
        cap = cv2.VideoCapture(str(other))
        if cap.isOpened():
            return cap
    return None


def _annotate(frame, dets, label):
    for d in dets:
        bb = d.get("bounding_box") or {}
        x1, y1 = int(bb.get("x1", 0)), int(bb.get("y1", 0))
        x2, y2 = int(bb.get("x2", 0)), int(bb.get("y2", 0))
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{d.get('vehicle_type','obj')} {d.get('confidence',0):.2f}",
                    (x1, max(y1 - 8, 20)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    cv2.putText(frame, label, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 220, 255), 2)
    return frame


def _loop(kind):
    global _latest_frame_road, _latest_frame_traffic
    cap = _open_video(kind)
    interval = 1.0 / TARGET_FPS
    vehicle_model = get_vehicle_model() if get_vehicle_model else None
    hazard_model = get_hazard_model() if get_hazard_model else None

    frame_idx = 0
    cached_dets = []
    last_inference_ms = 0.0

    while True:
        t0 = time.time()

        if _video_reload_flag.get(kind):
            if cap is not None:
                cap.release()
            cap = _open_video(kind)
            _video_reload_flag[kind] = False
            frame_idx = 0
            cached_dets = []

        # Read frame
        if cap is not None:
            ok, frame = cap.read()
            if not ok:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = cap.read()
            if not ok:
                frame = _synthetic_frame(label=kind.upper())
        else:
            frame = _synthetic_frame(label=kind.upper())

        # Downscale before everything
        if frame.shape[1] > INFERENCE_WIDTH:
            s = INFERENCE_WIDTH / frame.shape[1]
            frame = cv2.resize(frame, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)

        # Inference ONLY every Nth frame
        frame_idx += 1
        if frame_idx % INFER_EVERY_N_FRAMES == 0:
            dets = []
            t_inf = time.time()
            try:
                res = None
                if kind == "road" and hazard_model is not None:
                    res = hazard_model.predict(source=frame, conf=0.35, verbose=False)[0]
                elif vehicle_model is not None:
                    res = vehicle_model.predict(source=frame, conf=0.35, verbose=False)[0]
                if res is not None and res.boxes is not None:
                    for box in res.boxes:
                        cid = int(box.cls.cpu().numpy()[0])
                        cf = float(box.conf.cpu().numpy()[0])
                        xy = box.xyxy.cpu().numpy()[0].tolist()
                        dets.append({
                            "vehicle_type": res.names.get(cid, "obj"),
                            "confidence": cf,
                            "bounding_box": {"x1": xy[0], "y1": xy[1], "x2": xy[2], "y2": xy[3]},
                        })
                cached_dets = dets
            except Exception as e:
                with _lock:
                    STATE["error"] = f"{kind}: {e}"
                dets = cached_dets
            last_inference_ms = (time.time() - t_inf) * 1000
        else:
            dets = cached_dets

        annotated = _annotate(frame, dets, kind.upper())

        # Update shared state
        with _lock:
            STATE["status"] = "running"
            STATE["inference_ms"] = round(last_inference_ms, 1)
            STATE["processed_fps"] = round(1.0 / max(time.time() - t0, 0.001), 1)
            if kind == "traffic":
                counts = {}
                for d in dets:
                    counts[d["vehicle_type"]] = counts.get(d["vehicle_type"], 0) + 1
                road_types = {"car", "motorcycle", "bus", "truck", "bicycle"}
                STATE["vehicle_count"] = sum(v for k, v in counts.items() if k in road_types)
                STATE["counts"] = counts
                STATE["congestion_level"] = (
                    "high" if STATE["vehicle_count"] > 20
                    else "medium" if STATE["vehicle_count"] > 8 else "low"
                )
            else:
                STATE["classes"] = {i: d["vehicle_type"] for i, d in enumerate(dets)}
                STATE["model"] = HAZARD_MODEL_PATH.name if hazard_model else "yolov8n.pt"
                STATE["model_description"] = (
                    "Custom road hazard model" if hazard_model
                    else "Pretrained COCO — road_hazard.pt not found"
                )

        ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
        if ok:
            with _frame_lock:
                if kind == "road":
                    _latest_frame_road = jpg.tobytes()
                else:
                    _latest_frame_traffic = jpg.tobytes()

        elapsed = time.time() - t0
        if elapsed < interval:
            time.sleep(interval - elapsed)


def _mjpeg_stream(kind):
    boundary = "frame"
    while True:
        with _frame_lock:
            jpg = _latest_frame_road if kind == "road" else _latest_frame_traffic
        if jpg:
            yield (b"--" + boundary.encode() + b"\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n")
        else:
            time.sleep(0.1)
        time.sleep(0.05)


@app.get("/api/status")
def status():
    with _lock:
        return {
            "status": STATE["status"], "bus_id": STATE["bus_id"],
            "gps": STATE["gps"], "outbox": STATE["outbox"],
            "cameras": {
                "road": {
                    "status": STATE["status"], "bus_id": STATE["bus_id"],
                    "inference_ms": STATE["inference_ms"],
                    "processed_fps": STATE["processed_fps"], "frame_age_ms": 0.0,
                    "model": STATE["model"], "device": STATE["device"],
                    "fp16": STATE["fp16"], "classes": STATE["classes"],
                    "model_description": STATE["model_description"],
                    "error": STATE["error"],
                },
                "traffic": {
                    "status": STATE["status"], "bus_id": STATE["bus_id"],
                    "inference_ms": STATE["inference_ms"],
                    "processed_fps": STATE["processed_fps"], "frame_age_ms": 0.0,
                    "model": STATE["model"], "device": STATE["device"],
                    "fp16": STATE["fp16"], "vehicle_count": STATE["vehicle_count"],
                    "congestion_level": STATE["congestion_level"],
                    "signal_state": STATE["signal_state"], "counts": STATE["counts"],
                    "model_description": STATE["model_description"],
                    "error": STATE["error"],
                },
            },
        }


@app.get("/api/live/road")
def live_road():
    return StreamingResponse(_mjpeg_stream("road"),
                             media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/api/live/traffic")
def live_traffic():
    return StreamingResponse(_mjpeg_stream("traffic"),
                             media_type="multipart/x-mixed-replace; boundary=frame")


@app.post("/api/upload-video")
async def upload_video(file: UploadFile = File(...), camera: str = Form("both")):
    if camera not in ("road", "traffic", "both"):
        return {"ok": False, "error": "camera must be road, traffic, or both"}
    safe = f"{int(time.time())}_{file.filename or 'upload.mp4'}"
    target = UPLOAD_DIR / safe
    with target.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    test = cv2.VideoCapture(str(target))
    if not test.isOpened():
        test.release()
        return {"ok": False, "error": "Unsupported video format"}
    frames = int(test.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = test.get(cv2.CAP_PROP_FPS)
    test.release()
    targets = ["road", "traffic"] if camera == "both" else [camera]
    for k in targets:
        _current_video_path[k] = str(target)
        _video_reload_flag[k] = True
    return {"ok": True, "filename": safe, "camera": camera, "frames": frames,
            "fps": round(fps, 2) if fps and fps > 0 else None}


@app.post("/api/reset-video")
def reset_video(camera: str = "both"):
    if camera not in ("road", "traffic", "both"):
        return {"ok": False, "error": "camera must be road, traffic, or both"}
    targets = ["road", "traffic"] if camera == "both" else [camera]
    for k in targets:
        _current_video_path[k] = None
        _video_reload_flag[k] = True
    return {"ok": True, "message": f"Reverted {camera} to default video"}


@app.on_event("startup")
def _start_threads():
    threading.Thread(target=_loop, args=("road",), daemon=True).start()
    threading.Thread(target=_loop, args=("traffic",), daemon=True).start()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
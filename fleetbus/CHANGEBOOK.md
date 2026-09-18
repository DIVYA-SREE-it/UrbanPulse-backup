# Complete integration file contents

All paths are relative to fleetbus. Files are already applied in this package; copying snippets is unnecessary. See SPRINT_README.md before running.

## Unchanged application files

Sidebar, styles, package.json/package-lock.json, vite.config.js, all unlisted pages/components/data files, backend/app/schemas.py, and the original traffic repository are unchanged. The original NotificationDrawer.jsx is reused unchanged.

## Reused binary assets

backend/models/yolov8n.pt and backend/videos/traffic.mp4 are copied byte-for-byte from the audited traffic repository. Road weights and video are not included because neither supplied repository contains them.

## File inventory

| File | Action | Purpose |
|---|---|---|
| `.gitignore` | Modify | Exclude local environments, recordings, runtime databases and generated outputs. |
| `backend/app/events.py` | Create | Validate geospatial events, persist them idempotently, and save ordered workflow updates. |
| `backend/app/main.py` | Modify | Preserve /predict and host persistent event ingestion without requiring road weights at import time. |
| `backend/app/model.py` | Modify | Load the legacy road model lazily and serialize concurrent inference access. |
| `backend/app/services/inference.py` | Modify | Keep the existing image prediction response contract with bounded uploads and unique evidence filenames. |
| `backend/edge/TRAFFIC-LICENSE.txt` | Create | Retain the license distributed by the traffic source repository. |
| `backend/edge/__init__.py` | Create | Declare the edge Python package. |
| `backend/edge/config.json` | Create | Configure independent camera assets, inference settings, event thresholds, and labelled route simulation. |
| `backend/edge/main.py` | Create | Expose local MJPEG previews and camera readiness outside the central event backend. |
| `backend/edge/outbox.py` | Create | Persist unsent events and cooldowns and retry delivery with stable UUIDs. |
| `backend/edge/runtime.py` | Create | Run two long-lived camera workers with scheduled frame dropping, tracking, analysis, and structured events. |
| `backend/edge/traffic_core.py` | Create | Reuse the existing congestion and HSV functions with an ambiguity safeguard. |
| `backend/preflight.py` | Create | Print actual model classes, source properties, CUDA availability and optional first-frame inference results. |
| `backend/requirements.txt` | Create | Declare the minimum integrated Python dependencies. |
| `backend/tests/test_api.py` | Create | Verify central API schema, persistence, idempotency, pagination and status workflow after dependencies are installed. |
| `backend/tests/test_edge.py` | Create | Verify transport persistence, retries, concurrent writers, cooldowns and route interpolation in isolated test storage. |
| `setup-windows.ps1` | Create | Set up the local Windows environment and run preflight checks. |
| `src/App.jsx` | Modify | Keep all routes and add a persistent prototype/sample-data notice. |
| `src/components/camera/EdgeCameraPanels.jsx` | Create | Display independent annotated streams, real metrics, errors and offline-queue status. |
| `src/components/common/Header.jsx` | Modify | Label simulation state accurately and expose central event connection status. |
| `src/components/common/ReportModal.jsx` | Modify | Display real edge metadata and persist workflow changes without invented confidence or timing. |
| `src/components/dashboard/LiveDetectionStream.jsx` | Modify | Avoid fabricated fallback confidence for rule-based traffic events. |
| `src/components/map/CustomMarkerIcons.js` | Modify | Add a congestion-event marker using the existing icon system. |
| `src/components/map/GISMap.jsx` | Modify | Show actual geospatial event records and metadata in the existing GIS view. |
| `src/components/map/MapFilterBar.jsx` | Modify | Count real congestion-event records in the existing filter bar. |
| `src/context/UrbanPulseContext.jsx` | Modify | Import backend events into the existing notification/report state without legacy random fallback values. |
| `src/pages/AllDetectionLogsPage.jsx` | Modify | Render rule-based event confidence honestly in existing logs. |
| `src/pages/IncidentCenterPage.jsx` | Modify | Show traffic events without fabricated confidence or an ANPR-in-progress claim. |
| `src/pages/LiveCameraPage.jsx` | Modify | Insert independent side-by-side edge previews and retain explicitly labelled legacy simulator tools. |
| `src/services/edgeApi.js` | Create | Normalize central events into existing UI records and configure local API origins. |
| `start-demo.ps1` | Create | Start one central process, one edge process, and the existing Vite application. |

## Complete contents and tests

### FILE: `.gitignore`

PURPOSE: Exclude local environments, recordings, runtime databases and generated outputs.

CHANGE — complete file:

```text
node_modules/
venv/
__pycache__/
*.pyc

.env
.env.*
!.env.example

backend/uploads/
backend/results/

.vscode/
.idea/
.pytest_cache/
.mypy_cache/

dist/
build/

.DS_Store
Thumbs.db

*.pt
*.onnx
*.weights
.venv/
backend/data/
backend/videos/
.sites-runtime/
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `backend/app/events.py`

PURPOSE: Validate geospatial events, persist them idempotently, and save ordered workflow updates.

CHANGE — complete file:

```python
"""One central event contract, idempotent ingestion, and SQLite persistence."""
import base64
import json
from contextlib import contextmanager
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.getenv("CENTRAL_DATA_DIR", str(BASE / "data")))
DATA.mkdir(parents=True, exist_ok=True)
EVIDENCE = DATA / "evidence"
EVIDENCE.mkdir(exist_ok=True)
DB = DATA / "events.sqlite3"
router = APIRouter()


class EdgeEvent(BaseModel):
    event_id: UUID
    event_type: str = Field(min_length=1, max_length=80, pattern=r"^[A-Z_]+$")
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    confidence: float | None = Field(default=None, ge=0, le=1)
    timestamp: datetime
    bus_id: str = Field(min_length=1, max_length=60)
    camera_id: Literal["FRONT_CAMERA", "TRAFFIC_CAMERA"]
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    gps_source: Literal["SIMULATED_ROUTE", "HARDWARE_GPS"]
    source: Literal["PRERECORDED_VIDEO_AI", "CAMERA_AI"]
    track_id: int | None = None
    vehicle_type: str | None = None
    vehicle_count: int | None = Field(default=None, ge=0)
    metadata: dict = Field(default_factory=dict)
    evidence_jpeg_base64: str | None = Field(default=None, max_length=2_000_000)

    @field_validator("timestamp")
    @classmethod
    def timezone_required(cls, value):
        if value.tzinfo is None:
            raise ValueError("timestamp must include a timezone")
        return value


@contextmanager
def connect():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    try:
        with con:
            yield con
    finally:
        con.close()


def initialize():
    with connect() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS events (
            seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL,
            payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DETECTED',
            history TEXT NOT NULL DEFAULT '[]')""")


initialize()


def decode(row):
    value = json.loads(row["payload"])
    value.update(sequence=row["seq"], status=row["status"],
                 status_history=json.loads(row["history"]))
    return value


@router.post("/api/events")
def ingest(event: EdgeEvent):
    payload = event.model_dump(mode="json", exclude={"evidence_jpeg_base64"})
    event_id = str(event.event_id)
    with connect() as con:
        existing = con.execute("SELECT * FROM events WHERE event_id=?", (event_id,)).fetchone()
        if existing:
            return {"accepted": True, "duplicate": True, "event_id": event_id}
        payload["evidence_path"] = None
        if event.evidence_jpeg_base64:
            try:
                data = base64.b64decode(event.evidence_jpeg_base64, validate=True)
                if not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
                    raise ValueError("JPEG required")
            except Exception as exc:
                raise HTTPException(422, "Invalid JPEG evidence") from exc
            target = EVIDENCE / f"{event_id}.jpg"
            temporary = EVIDENCE / f"{event_id}.tmp"
            temporary.write_bytes(data)
            temporary.replace(target)
            payload["evidence_path"] = f"/evidence/{event_id}.jpg"
        history = [{"status": "DETECTED", "time": payload["timestamp"],
                    "note": "Structured event received from bus edge service"}]
        con.execute("INSERT OR IGNORE INTO events(event_id,payload,history) VALUES(?,?,?)",
                    (event_id, json.dumps(payload), json.dumps(history)))
    return {"accepted": True, "duplicate": False, "event_id": event_id}


@router.get("/api/events")
def events(after: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=500)):
    with connect() as con:
        rows = con.execute("SELECT * FROM events WHERE seq>? ORDER BY seq LIMIT ?",
                           (after, limit)).fetchall()
    return {"events": [decode(row) for row in rows],
            "next_cursor": rows[-1]["seq"] if rows else after}


@router.get("/api/congestion")
def congestion():
    with connect() as con:
        rows = con.execute("SELECT * FROM events ORDER BY seq DESC LIMIT 1000").fetchall()
    return [decode(r) for r in rows if json.loads(r["payload"])["event_type"] == "TRAFFIC_CONGESTION"]


class StatusUpdate(BaseModel):
    status: str
    note: str = Field(default="", max_length=2000)
    department: dict | None = None


@router.patch("/api/events/{event_id}/status")
def update_status(event_id: UUID, update: StatusUpdate):
    transitions = {"DETECTED": "VERIFIED", "VERIFIED": "ASSIGNED", "ASSIGNED": "IN PROGRESS",
                   "IN PROGRESS": "RESOLVED", "RESOLVED": "VERIFIED CLOSED"}
    with connect() as con:
        con.execute("BEGIN IMMEDIATE")
        row = con.execute("SELECT * FROM events WHERE event_id=?", (str(event_id),)).fetchone()
        if not row:
            raise HTTPException(404, "Event not found")
        if transitions.get(row["status"]) != update.status:
            raise HTTPException(409, "Invalid workflow transition")
        history = json.loads(row["history"])
        history.append({"status": update.status, "time": datetime.now(timezone.utc).isoformat(),
                        "note": update.note or f"Event moved to {update.status}"})
        payload = json.loads(row["payload"])
        if update.department:
            payload["metadata"]["assigned_department"] = update.department
        con.execute("UPDATE events SET status=?,history=?,payload=? WHERE event_id=?",
                    (update.status, json.dumps(history), json.dumps(payload), str(event_id)))
        result = con.execute("SELECT * FROM events WHERE event_id=?", (str(event_id),)).fetchone()
    return decode(result)
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/app/main.py`

PURPOSE: Preserve /predict and host persistent event ingestion without requiring road weights at import time.

CHANGE — complete file:

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.schemas import PredictionResponse
from app.events import router, EVIDENCE
from app.model import BASE_DIR, MODEL_PATH

RESULTS = BASE_DIR / "results"
RESULTS.mkdir(exist_ok=True)
app = FastAPI(title="UrbanPulse Central Event Backend", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=[f"http://{host}:{port}" for host in ("localhost", "127.0.0.1")
                   for port in (5173, 5174)],
    allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
app.mount("/results", StaticFiles(directory=str(RESULTS)), name="results")
app.mount("/evidence", StaticFiles(directory=str(EVIDENCE)), name="evidence")
app.include_router(router)


@app.get("/")
def root():
    return {"message": "UrbanPulse central event backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "central-events",
            "road_model_present": MODEL_PATH.is_file(),
            "note": "Camera model classes and readiness are reported by edge /api/status"}


@app.post("/predict", response_model=PredictionResponse)
def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(400, "Only JPG and PNG images are supported")
    try:
        from app.services.inference import run_inference
        return run_inference(file)
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/app/model.py`

PURPOSE: Load the legacy road model lazily and serialize concurrent inference access.

CHANGE — complete file:

```python
"""Legacy image endpoint model: lazy, shared and protected from concurrent calls."""
import os
from pathlib import Path
from threading import Lock

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = Path(os.getenv("ROAD_MODEL", str(BASE_DIR / "models" / "best.pt")))
model_lock = Lock()
_model = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Road model missing: {MODEL_PATH}")
        from ultralytics import YOLO
        _model = YOLO(str(MODEL_PATH))
    return _model
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/app/services/inference.py`

PURPOSE: Keep the existing image prediction response contract with bounded uploads and unique evidence filenames.

CHANGE — complete file:

```python
"""Preserve /predict for the existing optional uploaded-image/video workflow."""
from uuid import uuid4
import cv2
import numpy as np
from app.model import get_model, model_lock, BASE_DIR

RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)


def run_inference(uploaded_file):
    content = uploaded_file.file.read(12_000_001)
    if len(content) > 12_000_000:
        raise ValueError("Image exceeds 12 MB")
    frame = cv2.imdecode(np.frombuffer(content, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image")
    with model_lock:
        model = get_model()
        result = model.predict(frame, verbose=False)[0]
        detections = []
        for box in result.boxes:
            class_id = int(box.cls.item())
            xyxy = box.xyxy[0].tolist()
            detections.append({"class_id": class_id, "class_name": result.names[class_id],
                               "confidence": float(box.conf.item()),
                               "bounding_box": dict(zip(("x1", "y1", "x2", "y2"), xyxy))})
        filename = f"result_{uuid4()}.jpg"
        result.save(filename=str(RESULTS_DIR / filename))
    return {"success": True, "total_detections": len(detections), "detections": detections,
            "annotated_image": f"/results/{filename}"}
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/TRAFFIC-LICENSE.txt`

PURPOSE: Retain the license distributed by the traffic source repository.

CHANGE — complete file:

```text
MIT License

Copyright (c) 2019 aler9

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/__init__.py`

PURPOSE: Declare the edge Python package.

CHANGE — complete file:

```python
"""Local bus edge inference and durable event transport."""
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/config.json`

PURPOSE: Configure independent camera assets, inference settings, event thresholds, and labelled route simulation.

CHANGE — complete file:

```json
{
  "bus_id": "BUS-104",
  "central_url": "http://127.0.0.1:8000",
  "device": "auto",
  "cpu_threads": 4,
  "target_fps": 12,
  "imgsz": 416,
  "confidence": 0.35,
  "display_width": 960,
  "jpeg_quality": 75,
  "evidence": true,
  "congestion_low_max": 8,
  "congestion_medium_max": 20,
  "congestion_window_seconds": 3,
  "congestion_hold_seconds": 3,
  "congestion_cooldown_seconds": 30,
  "road_cooldown_seconds": 30,
  "route_duration_seconds": 120,
  "prototype_route": [[13.0140,80.2235],[13.0144,80.2240],[13.0148,80.2246],[13.0152,80.2252],[13.0157,80.2258],[13.0162,80.2264]],
  "road_model": "models/best.pt",
  "road_video": "videos/road.mp4",
  "traffic_model": "models/yolov8n.pt",
  "traffic_video": "videos/traffic.mp4"
}
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/main.py`

PURPOSE: Expose local MJPEG previews and camera readiness outside the central event backend.

CHANGE — complete file:

```python
"""Local demonstration previews. Central service receives events, not these streams."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from edge.runtime import EdgeRuntime

runtime = None


@asynccontextmanager
async def lifespan(app):
    global runtime
    runtime = EdgeRuntime()
    runtime.start()
    yield
    runtime.close()


app = FastAPI(title="UrbanPulse Bus Edge Preview", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[
    f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in (5173,5174)],
    allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/status")
def status():
    return runtime.status()


@app.get("/api/live/{camera}")
async def live(camera: str):
    worker = runtime.workers.get(camera)
    if worker is None:
        raise HTTPException(404, "Unknown camera")
    if worker.snapshot()["status"] == "error":
        raise HTTPException(503, worker.snapshot()["error"])

    async def frames():
        last = -1
        while not worker.stop.is_set():
            with worker.lock:
                jpeg, sequence = worker.jpeg, worker.sequence
                failed = worker.state["status"] == "error"
            if failed:
                break
            if jpeg is not None and sequence != last:
                last = sequence
                yield (b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " +
                       str(len(jpeg)).encode() + b"\r\n\r\n" + jpeg + b"\r\n")
            await asyncio.sleep(0.04)

    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame",
                             headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/outbox.py`

PURPOSE: Persist unsent events and cooldowns and retry delivery with stable UUIDs.

CHANGE — complete file:

```python
"""Durable edge outbox; cooldown insertion and queueing share a transaction."""
import json
from contextlib import contextmanager
import sqlite3
import threading
import time
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler


class Outbox:
    def __init__(self, path, central_url):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.url = central_url.rstrip("/") + "/api/events"
        self.stop = threading.Event()
        self.error = None
        self.last_sync = None
        with self.connect() as con:
            con.execute("CREATE TABLE IF NOT EXISTS pending (id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
            con.execute("CREATE TABLE IF NOT EXISTS cooldowns (key TEXT PRIMARY KEY, until REAL NOT NULL)")

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.path, timeout=10)
        con.execute("PRAGMA journal_mode=WAL")
        try:
            with con:
                yield con
        finally:
            con.close()

    def put(self, event, key, cooldown):
        now = time.time()
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT until FROM cooldowns WHERE key=?", (key,)).fetchone()
            if row and row[0] > now:
                return False
            con.execute("INSERT INTO pending VALUES(?,?)", (event["event_id"], json.dumps(event)))
            con.execute("INSERT OR REPLACE INTO cooldowns VALUES(?,?)", (key, now + cooldown))
            con.execute("DELETE FROM cooldowns WHERE until<?", (now,))
        return True

    def status(self):
        with self.connect() as con:
            count = con.execute("SELECT COUNT(*) FROM pending").fetchone()[0]
        return {"pending_events": count, "last_sync": self.last_sync, "error": self.error}

    def sync_once(self, client=None):
        opener = client or build_opener(ProxyHandler({}))
        with self.connect() as con:
            rows = con.execute("SELECT id,payload FROM pending ORDER BY rowid LIMIT 20").fetchall()
        for event_id, payload in rows:
            request = Request(self.url, data=payload.encode(),
                              headers={"Content-Type": "application/json"}, method="POST")
            with opener.open(request, timeout=5) as response:
                ack = json.load(response)
            if not ack.get("accepted") or ack.get("event_id") != event_id:
                raise RuntimeError("Backend did not acknowledge this event")
            with self.connect() as con:
                con.execute("DELETE FROM pending WHERE id=?", (event_id,))
            self.last_sync = time.time()
        self.error = None

    def run(self):
        delay = 1
        client = build_opener(ProxyHandler({}))
        while not self.stop.is_set():
            try:
                self.sync_once(client)
                delay = 1
            except Exception as exc:
                self.error = str(exc)
                delay = min(delay * 2, 30)
            self.stop.wait(delay)
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/runtime.py`

PURPOSE: Run two long-lived camera workers with scheduled frame dropping, tracking, analysis, and structured events.

CHANGE — complete file:

```python
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
            allowed_names = {"person", "bicycle", "car", "motorcycle", "bus", "truck", "traffic light"}
            class_ids = [i for i, name in names.items() if name in allowed_names]
            if self.kind == "traffic" and not any(names[i] == "car" for i in class_ids):
                raise RuntimeError("Traffic weights do not contain the required vehicle classes")
            kwargs = dict(imgsz=cfg["imgsz"], conf=cfg["confidence"], device=device,
                          half=device != "cpu", verbose=False)
            if self.kind == "traffic":
                kwargs["classes"] = class_ids
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
                    label, confidence = result.names[class_id], float(box.conf.item())
                    xyxy = box.xyxy[0].tolist()
                    track = int(box.id.item()) if box.id is not None else None
                    boxes.append({"class_name": label, "confidence": confidence, "track_id": track,
                                  "xyxy": xyxy})
                    if label in {"bicycle", "car", "motorcycle", "bus", "truck", "person"}:
                        counts[label] += 1
                    if self.kind == "traffic" and label == "traffic light":
                        x1, y1, x2, y2 = [int(x) for x in xyxy]
                        crop = frame[max(0,y1):min(height,y2), max(0,x1):min(width,x2)]
                        color, score = classify_light_color(crop)
                        if color != "unknown":
                            signal_candidates.append({"state": color.upper(), "color_score": score,
                                                      "detector_confidence": confidence})
                vehicle_count = sum(counts[n] for n in ("bicycle", "car", "motorcycle", "bus", "truck"))
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
                             "counts": dict(counts), "method": "vehicle-count heuristic; not measured road speed",
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
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/edge/traffic_core.py`

PURPOSE: Reuse the existing congestion and HSV functions with an ambiguity safeguard.

CHANGE — complete file:

```python
"""Functions reused from SIH26124-Traffic-Intelligence @132240b.
HSV score is a color heuristic, not calibrated model confidence.
"""
import cv2
import numpy as np

CONGESTION_THRESHOLDS = {
    "low": 8,
    "medium": 20,
}

def congestion_level(count):

    if count <= CONGESTION_THRESHOLDS["low"]:
        return "low"

    if count <= CONGESTION_THRESHOLDS["medium"]:
        return "medium"

    return "high"

COLOR_RANGES = {
    "red": [
        ((0, 100, 120), (10, 255, 255)),
        ((160, 100, 120), (179, 255, 255)),
    ],

    "yellow": [
        ((15, 100, 120), (35, 255, 255)),
    ],

    "green": [
        ((40, 80, 100), (90, 255, 255)),
    ],
}

def classify_light_color(crop_bgr):

    if crop_bgr is None or crop_bgr.size == 0:
        return "unknown", 0.0

    # Resize small crops so color analysis is more stable
    crop_bgr = cv2.resize(crop_bgr, (100, 100))

    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)

    scores = {}

    for color, ranges in COLOR_RANGES.items():

        mask_total = np.zeros(hsv.shape[:2], dtype=np.uint8)

        for lower, upper in ranges:

            lower = np.array(lower, dtype=np.uint8)
            upper = np.array(upper, dtype=np.uint8)

            mask = cv2.inRange(hsv, lower, upper)

            mask_total = cv2.bitwise_or(mask_total, mask)

        # Count colored pixels
        colored_pixels = cv2.countNonZero(mask_total)

        scores[color] = colored_pixels

    # Find dominant color
    best_color = max(scores, key=scores.get)

    total_pixels = hsv.shape[0] * hsv.shape[1]

    ratio = scores[best_color] / max(total_pixels, 1)

    # Require enough colored pixels
    if ratio < 0.01:
        return "unknown", 0.0

    # Integration safeguard: mixed red/green aspects may govern different lanes.
    # Original HSV thresholds are retained; do not report one authoritative state.
    runner_up = sorted(scores.values(), reverse=True)[1]
    if runner_up / max(total_pixels, 1) >= 0.01 and runner_up >= scores[best_color] * 0.25:
        return "unknown", 0.0

    confidence = min(ratio * 4.0, 0.99)

    return best_color, confidence
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/preflight.py`

PURPOSE: Print actual model classes, source properties, CUDA availability and optional first-frame inference results.

CHANGE — complete file:

```python
"""Run on the demo laptop before starting services; prints only measured values."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
from edge.runtime import load_config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inference', action='store_true', help='Run one measured frame per available camera')
    args = parser.parse_args()
    config = load_config()
    problems = []
    output = {'cameras':{}, 'python':sys.version, 'gps_source':'SIMULATED_ROUTE'}
    try:
        import cv2
        import torch
        from ultralytics import YOLO
    except ImportError as exc:
        print(json.dumps({'error':str(exc), 'action':'Install backend/requirements.txt in this Python environment'},indent=2))
        return 1
    output.update(torch_version=torch.__version__, cuda_available=torch.cuda.is_available(),
                  torch_cuda_build=torch.version.cuda)
    if torch.cuda.is_available():
        output['gpu'] = torch.cuda.get_device_name(0)
    device = ('0' if torch.cuda.is_available() else 'cpu') if config['device']=='auto' else config['device']
    cv2.setNumThreads(1)
    torch.set_num_threads(config['cpu_threads'])
    hashes = []
    for kind in ('road','traffic'):
        record = {}
        try:
            model_path, video_path = Path(config[f'{kind}_model']), Path(config[f'{kind}_video'])
            for path in (model_path,video_path):
                if not path.is_file(): raise FileNotFoundError(str(path))
            hashes.append(hashlib.sha256(video_path.read_bytes()).hexdigest())
            model = YOLO(str(model_path))
            record['classes'] = model.names
            cap = cv2.VideoCapture(str(video_path))
            try:
                if not cap.isOpened(): raise RuntimeError(f'Cannot open {video_path}')
                record.update(width=cap.get(cv2.CAP_PROP_FRAME_WIDTH),height=cap.get(cv2.CAP_PROP_FRAME_HEIGHT),
                              source_fps=cap.get(cv2.CAP_PROP_FPS),frames=cap.get(cv2.CAP_PROP_FRAME_COUNT))
                ok,frame=cap.read()
                if not ok: raise RuntimeError('Cannot decode first video frame')
                if args.inference:
                    params=dict(imgsz=config['imgsz'],conf=config['confidence'],device=device,half=device!='cpu',verbose=False)
                    if kind=='traffic':
                        result=model.track(frame,persist=True,tracker='bytetrack.yaml',**params)[0]
                    else:
                        result=model.predict(frame,**params)[0]
                    record['first_frame_timing_ms']=result.speed
                    record['first_frame_detections']=[{'class':result.names[int(b.cls.item())],
                        'confidence':float(b.conf.item())} for b in result.boxes]
                    record['timing_note']='Single cold-start frame; not sustained dual-camera performance'
                del model
                if torch.cuda.is_available(): torch.cuda.empty_cache()
            finally:
                cap.release()
            record['status']='passed'
        except Exception as exc:
            record.update(status='failed',error=str(exc))
            problems.append(f'{kind}: {exc}')
        output['cameras'][kind]=record
    if len(hashes)==2 and hashes[0]==hashes[1]:
        problems.append('Both video files contain identical bytes; supply independent recordings')
    output['problems']=problems
    print(json.dumps(output,indent=2))
    return 1 if problems else 0


if __name__=='__main__':
    raise SystemExit(main())
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/requirements.txt`

PURPOSE: Declare the minimum integrated Python dependencies.

CHANGE — complete file:

```text
fastapi>=0.115,<1
pydantic>=2.7,<3
uvicorn>=0.30,<1
python-multipart>=0.0.18
httpx>=0.27,<1
ultralytics==8.3.0
opencv-python==4.10.0.84
numpy==1.26.4
lap==0.5.12
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/tests/test_api.py`

PURPOSE: Verify central API schema, persistence, idempotency, pagination and status workflow after dependencies are installed.

CHANGE — complete file:

```python
"""FastAPI checks require installed dependencies and use temporary storage."""
import importlib.util
import os
import tempfile
import unittest
from datetime import datetime, timezone
from uuid import uuid4

HAS_DEPS = all(importlib.util.find_spec(m) for m in ('fastapi','httpx','multipart'))


@unittest.skipUnless(HAS_DEPS, 'Install backend requirements for FastAPI checks')
class TestCentralAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        os.environ['CENTRAL_DATA_DIR'] = cls.temp.name
        from fastapi.testclient import TestClient
        from app.main import app
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.temp.cleanup()
        os.environ.pop('CENTRAL_DATA_DIR', None)

    def fixture(self):
        return {'event_id': str(uuid4()), 'event_type': 'TRAFFIC_CONGESTION',
                'severity':'HIGH', 'confidence':None,
                'timestamp':datetime.now(timezone.utc).isoformat(), 'bus_id':'TEST-BUS',
                'camera_id':'TRAFFIC_CAMERA', 'latitude':13.01, 'longitude':80.22,
                'gps_source':'SIMULATED_ROUTE', 'source':'PRERECORDED_VIDEO_AI',
                'vehicle_count':25, 'metadata':{'test_fixture':True}}

    def test_health_without_road_weights(self):
        self.assertEqual(self.client.get('/health').status_code, 200)

    def test_idempotency_cursor_and_persistence(self):
        event = self.fixture()
        self.assertEqual(self.client.post('/api/events', json=event).status_code, 200)
        self.assertTrue(self.client.post('/api/events', json=event).json()['duplicate'])
        page = self.client.get('/api/events').json()
        self.assertEqual(sum(r['event_id']==event['event_id'] for r in page['events']),1)
        from app.events import connect, initialize
        initialize()
        with connect() as con:
            count = con.execute('SELECT COUNT(*) FROM events WHERE event_id=?',(event['event_id'],)).fetchone()[0]
        self.assertEqual(count,1)
        self.assertEqual(self.client.get(f"/api/events?after={page['next_cursor']}").json()['events'],[])

    def test_invalid_coordinates_and_naive_timestamp(self):
        event = self.fixture()
        event['latitude'] = 200
        self.assertEqual(self.client.post('/api/events',json=event).status_code,422)
        event['latitude'] = 13
        event['timestamp'] = '2026-09-11T12:00:00'
        self.assertEqual(self.client.post('/api/events',json=event).status_code,422)

    def test_workflow_order_and_persistence(self):
        event = self.fixture()
        self.client.post('/api/events',json=event)
        url = f"/api/events/{event['event_id']}/status"
        self.assertEqual(self.client.patch(url,json={'status':'RESOLVED'}).status_code,409)
        response = self.client.patch(url,json={'status':'VERIFIED','note':'Test review'})
        self.assertEqual(response.status_code,200)
        row = next(r for r in self.client.get('/api/events').json()['events'] if r['event_id']==event['event_id'])
        self.assertEqual(row['status'],'VERIFIED')
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `backend/tests/test_edge.py`

PURPOSE: Verify transport persistence, retries, concurrent writers, cooldowns and route interpolation in isolated test storage.

CHANGE — complete file:

```python
"""Dependency-free transport checks. Test fixtures never enter the demo database."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from uuid import uuid4
from edge.outbox import Outbox
from edge.runtime import load_config, route_position


class TestOutbox(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'outbox.sqlite3'
        self.received = []
        owner = self
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                event = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                owner.received.append(event)
                self.send_response(owner.response_status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'accepted': True, 'event_id': event['event_id']}).encode())
            def log_message(self, *_):
                pass
        self.response_status = 200
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        self.box = Outbox(self.path, self.url)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def event(self):
        return {'event_id': str(uuid4()), 'event_type': 'TEST_FIXTURE'}

    def test_cooldown_survives_restart(self):
        self.assertTrue(self.box.put(self.event(), 'same', 30))
        reopened = Outbox(self.path, self.url)
        self.assertFalse(reopened.put(self.event(), 'same', 30))
        self.assertEqual(reopened.status()['pending_events'], 1)

    def test_failure_retains_then_retry_clears(self):
        event = self.event()
        self.box.put(event, 'condition', 30)
        self.response_status = 503
        with self.assertRaises(HTTPError): self.box.sync_once()
        self.assertEqual(self.box.status()['pending_events'], 1)
        self.response_status = 200
        self.box.sync_once()
        self.assertEqual(self.box.status()['pending_events'], 0)
        self.assertEqual(self.received[0]['event_id'], self.received[1]['event_id'])

    def test_parallel_camera_writers_preserve_both_events(self):
        threads = [threading.Thread(target=self.box.put, args=(self.event(), camera, 30)) for camera in ('road','traffic')]
        for t in threads: t.start()
        for t in threads: t.join()
        self.assertEqual(self.box.status()['pending_events'], 2)
        self.box.sync_once()
        self.assertEqual(len(self.received), 2)

    def test_expired_cooldown_allows_new_observation(self):
        self.box.put(self.event(), 'condition', 30)
        with self.box.connect() as con: con.execute('UPDATE cooldowns SET until=0')
        self.assertTrue(self.box.put(self.event(), 'condition', 30))


class TestRoute(unittest.TestCase):
    def test_shared_clock_and_loop(self):
        config = load_config()
        self.assertEqual(route_position(config, 0), tuple(config['prototype_route'][0]))
        self.assertEqual(route_position(config, config['route_duration_seconds']), route_position(config, 0))
        self.assertEqual(route_position(config, 60), route_position(config, 180))
        lat, lon = route_position(config, 10)
        self.assertTrue(-90 <= lat <= 90 and -180 <= lon <= 180)
```

TEST: From fleetbus: `.\.venv\Scripts\python.exe -m compileall -q .\backend`. Then from backend: `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`. For camera/model changes also run preflight and the dual-camera acceptance checks in SPRINT_README.md.

### FILE: `setup-windows.ps1`

PURPOSE: Set up the local Windows environment and run preflight checks.

CHANGE — complete file:

```powershell
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path '.venv\Scripts\python.exe')) {
    py -3.12 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 venv creation failed. Check py -0p.' }
}
$PythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $PythonExe -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'pip update failed.' }
# Compatible CUDA-enabled PyTorch baseline for the repository-pinned Ultralytics 8.3.0.
& $PythonExe -m pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124
if ($LASTEXITCODE -ne 0) { throw 'CUDA PyTorch installation failed.' }
& $PythonExe -m pip install -r backend\requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
& $PythonExe backend\preflight.py --inference
if ($LASTEXITCODE -ne 0) { Write-Warning 'Preflight found missing assets or runtime errors. Read the JSON above before the demo.' }
```

TEST: Inspect prerequisites in SPRINT_README.md; execute this script from PowerShell only after the required assets and dependencies exist. Windows execution is not verified in the development environment.

### FILE: `src/App.jsx`

PURPOSE: Keep all routes and add a persistent prototype/sample-data notice.

CHANGE — complete file:

```jsx
import React from 'react';
import { UrbanPulseProvider, useUrbanPulse } from './context/UrbanPulseContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ReportModal } from './components/common/ReportModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { LiveCityPage } from './pages/LiveCityPage';
import { FleetMonitoringPage } from './pages/FleetMonitoringPage';
import { RoadIntelligencePage } from './pages/RoadIntelligencePage';
import { TrafficIntelligencePage } from './pages/TrafficIntelligencePage';
import { IncidentCenterPage } from './pages/IncidentCenterPage';
import { PotholeReportsPage } from './pages/PotholeReportsPage';
import { WaterloggingReportsPage } from './pages/WaterloggingReportsPage';
import { TrafficSignalReportsPage } from './pages/TrafficSignalReportsPage';
import { SchoolZoneViolationsPage } from './pages/SchoolZoneViolationsPage';
import { AllDetectionLogsPage } from './pages/AllDetectionLogsPage';
import { DepartmentResponsePage } from './pages/DepartmentResponsePage';
import { MaintenanceTrackingPage } from './pages/MaintenanceTrackingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LiveCameraPage } from './pages/LiveCameraPage';
import { EdgeAiNetworkPage } from './pages/EdgeAiNetworkPage';
import { CameraMonitoringPage } from './pages/CameraMonitoringPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { activeRoute } = useUrbanPulse();

  const renderActivePage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'live-city':
        return <LiveCityPage />;
      case 'fleet':
        return <FleetMonitoringPage />;
      case 'road-intel':
        return <RoadIntelligencePage />;
      case 'traffic-intel':
        return <TrafficIntelligencePage />;
      case 'incident-center':
        return <IncidentCenterPage />;
      case 'potholes':
        return <PotholeReportsPage />;
      case 'waterlogging':
        return <WaterloggingReportsPage />;
      case 'traffic-signals':
        return <TrafficSignalReportsPage />;
      case 'school-violations':
        return <SchoolZoneViolationsPage />;
      case 'all-logs':
        return <AllDetectionLogsPage />;
      case 'department-response':
        return <DepartmentResponsePage />;
      case 'maintenance-tracking':
        return <MaintenanceTrackingPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'live-camera':
        return <LiveCameraPage />;
      case 'edge-network':
        return <EdgeAiNetworkPage />;
      case 'camera-monitoring':
        return <CameraMonitoringPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 240px Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header />

        <div className="px-6 py-2 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
          Prototype: legacy charts, fleet telemetry and scenarios contain sample data. Camera events identify their source; route GPS is simulated.
        </div>
        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Modals & Overlays */}
      <ReportModal />
      <GlobalSearchModal />
      <NotificationDrawer />
    </div>
  );
}

export default function App() {
  return (
    <UrbanPulseProvider>
      <AppContent />
    </UrbanPulseProvider>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/camera/EdgeCameraPanels.jsx`

PURPOSE: Display independent annotated streams, real metrics, errors and offline-queue status.

CHANGE — complete file:

```jsx
import React, { useEffect, useState } from 'react';
import { EDGE_URL, readJson } from '../../services/edgeApi';

const metric = value => Number.isFinite(value) ? value.toFixed(1) : '—';

function CameraPanel({ kind, state, connected }) {
  const [retry, setRetry] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);
  const road = kind === 'road';
  const running = connected && state?.status === 'running';
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-subtle min-w-0">
      <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">{road ? 'ROAD INTELLIGENCE' : 'TRAFFIC INTELLIGENCE'}</h2>
          <p className="text-xs text-slate-500">{state?.bus_id || 'BUS-104'} · {road ? 'FRONT_CAMERA' : 'TRAFFIC_CAMERA'}</p>
        </div>
        <span className="text-xs font-semibold text-blue-700">{connected ? state?.status || 'starting' : 'offline'}</span>
      </div>
      <div className="aspect-video bg-slate-950 flex items-center justify-center relative">
        {running && !streamFailed ? (
          <img key={retry} src={`${EDGE_URL}/api/live/${kind}?retry=${retry}`} alt={`${kind} camera with model annotations`}
            className="w-full h-full object-contain" onError={() => setStreamFailed(true)} />
        ) : (
          <div className="p-5 text-center text-sm text-slate-200 break-words">
            {state?.error || (streamFailed ? 'Preview disconnected.' : connected ? 'Camera is starting…' : 'Start the local edge service on port 8001.')}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 text-sm">
        {streamFailed && <button className="text-blue-700 underline" onClick={() => { setStreamFailed(false); setRetry(n => n + 1); }}>Reconnect preview</button>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-slate-600">
          <span>Inference <b>{metric(state?.inference_ms)} ms</b></span>
          <span>Processed <b>{metric(state?.processed_fps)} FPS</b></span>
          <span>Frame age <b>{metric(state?.frame_age_ms)} ms</b></span>
        </div>
        {!road && <>
          <div className="flex flex-wrap gap-4 font-semibold text-slate-900">
            <span>Vehicles: {state?.vehicle_count ?? '—'}</span>
            <span>Congestion: {state?.congestion_level || 'UNKNOWN'}</span>
            <span>Signal: {state?.signal_state || 'UNKNOWN'}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            {['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'person'].map(name => <span key={name}>{name}: {running ? state?.counts?.[name] ?? 0 : '—'}</span>)}
          </div>
          <p className="text-xs text-slate-500">Congestion uses configurable vehicle-count thresholds. Signal color uses an HSV heuristic. Moving-bus violations are disabled.</p>
        </>}
        {road && <p className="text-xs text-slate-600">Model classes: {Object.values(state?.classes || {}).join(', ') || 'Available after the road weights load.'}</p>}
        <p className="text-xs text-slate-500">{state?.model || 'Model pending'} · {state?.device || 'Device pending'}{state?.fp16 ? ' · FP16' : ''} · prerecorded camera simulation</p>
      </div>
    </section>
  );
}

export function EdgeCameraPanels() {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let cancelled = false, timer;
    async function poll() {
      try {
        const data = await readJson(`${EDGE_URL}/api/status`);
        if (!cancelled) { setStatus(data); setConnected(true); }
      } catch { if (!cancelled) setConnected(false); }
      if (!cancelled) timer = setTimeout(poll, 1000);
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CameraPanel kind="road" state={status?.cameras?.road} connected={connected} />
        <CameraPanel kind="traffic" state={status?.cameras?.traffic} connected={connected} />
      </div>
      <p className="text-xs text-slate-500">
        Local edge previews · GPS: {status?.gps ? `${status.gps.latitude.toFixed(5)}, ${status.gps.longitude.toFixed(5)} (simulated route)` : 'unavailable'}
        {' · '}Unsent events: {status?.outbox?.pending_events ?? '—'}
        {status?.outbox?.error && ' · Central sync unavailable; events remain buffered locally.'}
      </p>
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/common/Header.jsx`

PURPOSE: Label simulation state accurately and expose central event connection status.

CHANGE — complete file:

```jsx
import React from 'react';
import {
  Search,
  Bell,
  Calendar,
  Camera,
  Activity,
  Play,
  Pause
} from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';

export function Header() {
  const {
    centralConnection,
    activeRoute,
    setActiveRoute,
    unreadNotifCount,
    setIsSearchOpen,
    setIsNotificationOpen,
    simulationRunning,
    setSimulationRunning
  } = useUrbanPulse();

  const getBreadcrumb = () => {
    switch (activeRoute) {
      case 'dashboard':
        return 'Overview / Dashboard';
      case 'live-city':
        return 'Overview / Live City Map';
      case 'fleet':
        return 'Overview / Fleet Monitoring';
      case 'road-intel':
        return 'Intelligence / Road Intelligence';
      case 'traffic-intel':
        return 'Intelligence / Traffic Intelligence';
      case 'incident-center':
        return 'Intelligence / Incident Center';
      case 'potholes':
        return 'Reports / Pothole Reports';
      case 'waterlogging':
        return 'Reports / Waterlogging Reports';
      case 'traffic-signals':
        return 'Reports / Traffic Signal Reports';
      case 'school-violations':
        return 'Reports / School Zone Violations';
      case 'all-logs':
        return 'Reports / All Detection Logs';
      case 'department-response':
        return 'Operations / Department Response';
      case 'maintenance-tracking':
        return 'Operations / Maintenance Tracking';
      case 'analytics':
        return 'Operations / Analytics';
      case 'live-camera':
        return 'System / Live Camera (YOLO)';
      case 'edge-network':
        return 'System / Edge AI Network';
      case 'camera-monitoring':
        return 'System / Camera Monitoring';
      case 'settings':
        return 'System / System Settings';
      default:
        return 'Overview / Dashboard';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-subtle">
      {/* Left Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <span className="text-slate-900 font-bold">{getBreadcrumb()}</span>
        </div>

        {/* Live Simulation Indicator */}
        <div
          onClick={() => setSimulationRunning(!simulationRunning)}
          className="cursor-pointer group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 transition-all hover:bg-slate-100 hover:border-slate-300"
          title="Click to pause/resume real-time simulator"
        >
          <span className={`w-2 h-2 rounded-full ${simulationRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
          <span>{simulationRunning ? 'SIMULATION ON' : 'SIMULATION PAUSED'}</span>
          {simulationRunning ? (
            <Pause className="w-3 h-3 ml-0.5 text-slate-400 group-hover:text-slate-600" />
          ) : (
            <Play className="w-3 h-3 ml-0.5 text-slate-400 group-hover:text-slate-600" />
          )}
        </div>
      </div>

      <span className="text-xs text-slate-500 hidden xl:block">Central events: {centralConnection}</span>
      {/* Right Action Tools */}
      <div className="flex items-center gap-3">
        {/* Quick Live Camera Demo Button */}
        <button
          onClick={() => setActiveRoute('live-camera')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Live Camera</span>
        </button>

        {/* Global Search Bar */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 hover:border-blue-500 hover:bg-white transition-all w-48 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search city assets...</span>
          </div>
          <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Date Stamp */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-600 border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{new Date().toLocaleDateString()}</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={() => setIsNotificationOpen(true)}
          className="relative p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-white text-slate-600 hover:text-slate-900 transition-all"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold px-1">
              {unreadNotifCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            TA
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">Transport Authority</p>
            <p className="text-[10px] text-slate-500 leading-tight">Operations Center</p>
          </div>
        </div>
      </div>
    </header>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/common/ReportModal.jsx`

PURPOSE: Display real edge metadata and persist workflow changes without invented confidence or timing.

CHANGE — complete file:

```jsx
import React, { useState } from 'react';
import {
  X,
  MapPin,
  Bus,
  Camera,
  Cpu,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  FileCheck,
  Send,
  Navigation
} from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import { DepartmentBadge } from './DepartmentBadge';
import { printCurrentReport, exportToCSV } from '../../utils/exportUtils';
import { DEPARTMENTS } from '../../data/departmentsData';

export function ReportModal() {
  const { selectedReport, setSelectedReport, updateReportStatus } = useUrbanPulse();
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [showStatusChanger, setShowStatusChanger] = useState(false);

  if (!selectedReport) return null;

  const currentStatus = selectedReport.status || 'PENDING';
  const history = selectedReport.statusHistory || [
    { status: 'DETECTED', time: selectedReport.timestamp, note: 'AI Edge model identified defect' }
  ];

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    let targetDept = null;
    if (selectedDeptId) {
      const d = DEPARTMENTS.find(dept => dept.id === selectedDeptId);
      if (d) {
        targetDept = {
          department: d.name,
          division: d.division,
          deptId: d.id
        };
      }
    }

    const saved = await updateReportStatus(selectedReport.id, newStatus, resolutionNote, targetDept);
    if (selectedReport.edgeEvent && !saved) return;
    setShowStatusChanger(false);
    setResolutionNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-card shadow-modal border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-sm shadow-xs">
              {selectedReport.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {selectedReport.title}
                </h2>
                <SeverityBadge severity={selectedReport.severity} />
                <StatusBadge status={selectedReport.status} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {selectedReport.location} ({selectedReport.lat?.toFixed(4)}°N, {selectedReport.lng?.toFixed(4)}°E)
              </p>
            </div>
          </div>

          {/* Action buttons & close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${selectedReport.lat || 12.9016},${selectedReport.lng || 80.2279}`;
                window.open(url, '_blank');
              }}
              className="p-2 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Open Location in Google Maps"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Google Map</span>
            </button>
            <button
              onClick={() => printCurrentReport()}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Print Formal Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToCSV([selectedReport], `${selectedReport.id}-dossier.csv`)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedReport(null)}
              className="p-2 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {selectedReport.edgeEvent && <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-slate-700 space-y-1">
            <p>{selectedReport.cameraId} · {selectedReport.gpsSource} · {selectedReport.timestamp}</p>
            {selectedReport.vehicleCount != null && <p>Vehicles: {selectedReport.vehicleCount} · Congestion: {selectedReport.congestionLevel || '—'}</p>}
            {selectedReport.trackId != null && <p>Track #{selectedReport.trackId} · {selectedReport.vehicleType}</p>}
            <p>{selectedReport.metadata?.method || selectedReport.metadata?.severity_basis}</p>
          </div>}
          {/* Grid of Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Detection Telemetry */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                Edge AI Telemetry
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Confidence Score</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {Number.isFinite(selectedReport.confidence) ? `${Math.round(selectedReport.confidence * 100)}%` : 'Not calibrated (rule-based)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Detecting Bus</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {selectedReport.busId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Camera Sensor</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedReport.cameraId || 'FRONT-CAM-01'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="font-mono text-[11px] text-slate-800">
                    {selectedReport.timestamp}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Edge Inference</span>
                  <span className="font-medium text-slate-800">{selectedReport.edgeEvent ? `${selectedReport.metadata?.model || 'Unknown model'} · ${selectedReport.metadata?.inference_ms?.toFixed(1) ?? '—'} ms` : 'Legacy / sample telemetry'}</span>
                </div>
              </div>
            </div>

            {/* 2. Responsible Authority */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Government Nodal Agency
              </h4>
              <div className="space-y-2.5">
                <div>
                  <DepartmentBadge
                    department={selectedReport.department}
                    division={selectedReport.division}
                  />
                </div>
                <div className="text-xs space-y-1.5 pt-1">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Assigned Officer</span>
                    <span className="font-medium text-slate-800">
                      {selectedReport.assignedOfficer || 'Junior Engineer (Roads)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Target SLA</span>
                    <span className="font-bold text-amber-600">Within 24 Hours</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Action Status</span>
                    <StatusBadge status={selectedReport.status} size="xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Physical Diagnostics */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Impact & Diagnostics
              </h4>
              <div className="space-y-2 text-xs">
                {selectedReport.depthCm && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Estimated Depth</span>
                    <span className="font-bold text-red-600">{selectedReport.depthCm} cm</span>
                  </div>
                )}
                {selectedReport.waterDepthCm && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Water Depth</span>
                    <span className="font-bold text-sky-600">{selectedReport.waterDepthCm} cm</span>
                  </div>
                )}
                {selectedReport.numberPlate && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">ANPR Plate Detected</span>
                    <span className="font-mono font-black text-slate-900 bg-yellow-300 px-2 py-0.5 rounded border border-yellow-500">
                      {selectedReport.numberPlate}
                    </span>
                  </div>
                )}
                {selectedReport.vehicleDetails && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Suspect Vehicle</span>
                    <span className="font-medium text-slate-800">
                      {selectedReport.vehicleDetails.vehicleType}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Public Hazard Score</span>
                  <span className="font-bold text-slate-900">
                    {selectedReport.impactScore || 85} / 100
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Frame */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              Sensor Camera Evidence Frame (Bus Edge Captured)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-56 group">
                <img
                  src={selectedReport.evidenceImg || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'}
                  alt="Detection Evidence"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 text-blue-400 text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm border border-blue-500/30">
                  {selectedReport.busId} • {selectedReport.cameraId || 'FRONT-CAM-01'} • 1080p
                </div>
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-1 rounded">
                  CONFIDENCE: {Number.isFinite(selectedReport.confidence) ? `${Math.round(selectedReport.confidence * 100)}%` : 'Not calibrated (rule-based)'}
                </div>
              </div>

              {/* Resolution Note */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 mb-1.5">
                    Resolution Status & Field Notes
                  </h5>
                  {selectedReport.resolutionNote ? (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Resolved by: {selectedReport.resolvedBy || selectedReport.department}
                      </div>
                      <p>{selectedReport.resolutionNote}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Date: {selectedReport.resolutionDate}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ticket is currently active in the municipal resolution pipeline. Field engineering squad will update completion photos upon asphalt leveling or repair.
                    </p>
                  )}
                </div>

                {/* Status Changer Button */}
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowStatusChanger(!showStatusChanger)}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Update Resolution Status ({currentStatus})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Status Changer Form */}
          {showStatusChanger && (
            <form onSubmit={handleUpdateStatus} className="p-4 rounded-xl bg-white border-2 border-blue-500 space-y-4 shadow-subtle animate-in fade-in">
              <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Progress Workflow Lifecycle (Demonstration Mode)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600 text-slate-800"
                  >
                    <option value="">Select Status...</option>
                    <option value="DETECTED">1. DETECTED</option>
                    <option value="VERIFIED">2. VERIFIED</option>
                    <option value="ASSIGNED">3. ASSIGNED</option>
                    <option value="IN PROGRESS">4. IN PROGRESS</option>
                    <option value="RESOLVED">5. RESOLVED</option>
                    <option value="VERIFIED CLOSED">6. VERIFIED CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Reassign Department (Optional)</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600 text-slate-800"
                  >
                    <option value="">Keep current department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.division}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Field Resolution Note</label>
                  <input
                    type="text"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="e.g. Surface patched and inspected"
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusChanger(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save Transition
                </button>
              </div>
            </form>
          )}

          {/* Action History Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Action History & Audit Trail
            </h4>
            <div className="relative pl-6 border-l-2 border-blue-200 space-y-4">
              {history.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600">
                      {step.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {step.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {step.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/dashboard/LiveDetectionStream.jsx`

PURPOSE: Avoid fabricated fallback confidence for rule-based traffic events.

CHANGE — complete file:

```jsx
import React from 'react';
import { Activity, ArrowRight, ShieldAlert, Cone, Droplets, Radio, School } from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge } from '../common/StatusBadge';

export function LiveDetectionStream() {
  const { detections, setSelectedReport, setActiveRoute } = useUrbanPulse();

  const getDefectIcon = (type) => {
    switch (type) {
      case 'pothole':
      case 'road_damage':
        return <Cone className="w-3.5 h-3.5 text-amber-600" />;
      case 'waterlogging':
        return <Droplets className="w-3.5 h-3.5 text-sky-600" />;
      case 'damaged_signal':
      case 'damaged_signboard':
        return <Radio className="w-3.5 h-3.5 text-red-600" />;
      case 'school_zone_violation':
        return <School className="w-3.5 h-3.5 text-purple-600" />;
      case 'hit_and_run':
      case 'rash_driving':
      case 'dangerous_overtaking':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
            Live AI Detections
          </h3>
        </div>
        <button
          onClick={() => setActiveRoute('all-logs')}
          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
        >
          View All Logs <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Stream Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
        {detections.slice(0, 7).map(det => {
          const isHitAndRun = det.type === 'hit_and_run';

          return (
            <div
              key={det.id}
              onClick={() => setSelectedReport(det)}
              className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                isHitAndRun
                  ? 'bg-red-50/40 border-red-200 hover:border-red-400'
                  : 'bg-white border-slate-200 hover:bg-blue-50/40 hover:border-blue-300 hover:shadow-subtle'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    {getDefectIcon(det.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {det.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 line-clamp-1">
                        {det.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {det.location} • <strong className="font-mono text-slate-700">{det.busId}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {Number.isFinite(det.confidence) ? `${Math.round(det.confidence * 100)}%` : 'Rule-based'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {det.timeAgo || 'Recent'}
                  </p>
                </div>
              </div>

              {/* Status and Department footer */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 truncate max-w-[170px]">
                  Dept: <strong className="text-slate-700">{det.department}</strong>
                </span>
                <StatusBadge status={det.status} size="xs" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/map/CustomMarkerIcons.js`

PURPOSE: Add a congestion-event marker using the existing icon system.

CHANGE — complete file:

```javascript
import L from 'leaflet';

// Leaflet custom HTML DivIcons for modern, crisp vector pins in clean blue/white style
export function createBusIcon(heading = 0, speed = 30) {
  return L.divIcon({
    className: 'custom-bus-icon',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 99, 235, 0.2); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 26px; height: 26px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(15,23,42,0.25);">
          <svg style="width: 13px; height: 13px; color: #FFFFFF; fill: currentColor;" viewBox="0 0 24 24">
            <rect width="16" height="16" x="4" y="3" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M4 11h16" stroke="currentColor" stroke-width="2"/>
            <path d="M12 3v8" stroke="currentColor" stroke-width="2"/>
            <circle cx="8" cy="15" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="15" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

export function createDefectIcon(type, severity = 'HIGH') {
  let bgColor = '#F59E0B'; // yellow/orange
  let borderColor = '#FFFFFF';
  let symbol = '!';

  switch (type) {
    case 'traffic_congestion':
      bgColor = severity === 'HIGH' ? '#DC2626' : '#F59E0B';
      symbol = 'TC';
      break;
    case 'pothole':
    case 'road_damage':
      bgColor = severity === 'CRITICAL' ? '#DC2626' : '#F59E0B';
      symbol = 'PH';
      break;
    case 'waterlogging':
      bgColor = '#0284C7';
      symbol = 'WL';
      break;
    case 'damaged_signal':
    case 'traffic_light':
      bgColor = '#DC2626';
      symbol = 'TS';
      break;
    case 'school_zone_violation':
      bgColor = '#8B5CF6';
      symbol = 'SZ';
      break;
    case 'hit_and_run':
    case 'rash_driving':
    case 'dangerous_overtaking':
    case 'pedestrian_risk':
      bgColor = '#DC2626';
      symbol = 'INC';
      break;
    default:
      bgColor = '#2563EB';
      symbol = 'UP';
  }

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        ${severity === 'CRITICAL' || severity === 'EMERGENCY' ? '<div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ' + bgColor + '; opacity: 0.35; animation: ping 1.5s infinite;"></div>' : ''}
        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${bgColor}; border: 2px solid ${borderColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(15,23,42,0.25);">
          <span style="color: #FFFFFF; font-size: 9px; font-weight: 800; font-family: monospace;">${symbol}</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/map/GISMap.jsx`

PURPOSE: Show actual geospatial event records and metadata in the existing GIS view.

CHANGE — complete file:

```jsx
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { CHENNAI_CENTER, CHENNAI_DEFAULT_ZOOM } from '../../utils/geoUtils';
import { createBusIcon, createDefectIcon } from './CustomMarkerIcons';
import { CONGESTION_ZONES } from '../../data/edgeNodesData';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge, SeverityBadge } from '../common/StatusBadge';
import {
  ExternalLink,
  Bus,
  MapPin,
  ArrowRight,
  Layers,
  Navigation,
  Flame,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

export function GISMap({ height = '520px' }) {
  const {
    buses,
    detections,
    activeFilter,
    setSelectedReport,
    setSelectedBus,
    setActiveRoute
  } = useUrbanPulse();

  // Google Maps Layer State
  const [mapLayer, setMapLayer] = useState('google_roads');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Heatmap View State
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [heatmapType, setHeatmapType] = useState('ALL'); // 'ALL', 'POTHOLES', 'WATERLOGGING', 'CONGESTION', 'INCIDENTS'
  const [heatRadius, setHeatRadius] = useState(750); // meters
  const [showHeatmapControls, setShowHeatmapControls] = useState(false);

  const MAP_LAYERS = {
    google_roads: {
      name: 'Google Maps (Standard Roads)',
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Maps</a> contributors',
      icon: '🗺️'
    },
    google_traffic: {
      name: 'Google Maps (Live Traffic Flow)',
      url: 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Maps Traffic</a>',
      icon: '🚦'
    },
    google_hybrid: {
      name: 'Google Satellite (Hybrid Imagery)',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Satellite</a> Imagery',
      icon: '🛰️'
    },
    google_terrain: {
      name: 'Google Maps (Terrain / Topo)',
      url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Terrain</a>',
      icon: '⛰️'
    },
    carto: {
      name: 'CartoDB Light Minimal',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      icon: '📐'
    }
  };

  const currentLayer = MAP_LAYERS[mapLayer] || MAP_LAYERS.google_roads;

  const showBuses = activeFilter === 'ALL' || activeFilter === 'BUSES';
  const showPotholes = activeFilter === 'ALL' || activeFilter === 'POTHOLES';
  const showWaterlogging = activeFilter === 'ALL' || activeFilter === 'WATERLOGGING';
  const showTrafficSignals = activeFilter === 'ALL' || activeFilter === 'TRAFFIC_SIGNALS';
  const showSchoolViolations = activeFilter === 'ALL' || activeFilter === 'SCHOOL_VIOLATIONS';
  const showIncidents = activeFilter === 'ALL' || activeFilter === 'INCIDENTS';
  const showCongestion = activeFilter === 'ALL' || activeFilter === 'CONGESTION';

  const visibleDetections = detections.filter(d => {
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) return false;
    if (showCongestion && d.type === 'traffic_congestion') return true;
    if (activeFilter === 'ALL') return true;
    if (showPotholes && (d.type === 'pothole' || d.type === 'road_damage')) return true;
    if (showWaterlogging && d.type === 'waterlogging') return true;
    if (showTrafficSignals && (d.type === 'damaged_signal' || d.type === 'damaged_signboard' || d.type === 'missing_zebra_crossing')) return true;
    if (showSchoolViolations && d.type === 'school_zone_violation') return true;
    if (showIncidents && ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'pedestrian_risk', 'red_light_violation', 'wrong_way_driving'].includes(d.type)) return true;
    return false;
  });

  // Filter items for Heatmap Layer
  const heatmapPoints = detections.filter(d => {
    if (heatmapType === 'ALL') return true;
    if (heatmapType === 'POTHOLES' && (d.type === 'pothole' || d.type === 'road_damage')) return true;
    if (heatmapType === 'WATERLOGGING' && d.type === 'waterlogging') return true;
    if (heatmapType === 'INCIDENTS' && ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'school_zone_violation'].includes(d.type)) return true;
    return false;
  });

  const openInGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const getHeatmapColor = (item) => {
    if (item.severity === 'EMERGENCY' || item.severity === 'CRITICAL') {
      return { core: '#DC2626', outer: '#EA580C', opacity: 0.45 };
    }
    if (item.severity === 'HIGH') {
      return { core: '#EA580C', outer: '#F59E0B', opacity: 0.38 };
    }
    if (item.type === 'waterlogging') {
      return { core: '#0284C7', outer: '#38BDF8', opacity: 0.40 };
    }
    return { core: '#F59E0B', outer: '#FBBF24', opacity: 0.32 };
  };

  return (
    <div style={{ height }} className="relative w-full rounded-card overflow-hidden border border-slate-200 shadow-subtle z-0 bg-white">
      {/* Top Map Action Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Heatmap Mode Toggle Button */}
        <button
          onClick={() => {
            setIsHeatmapMode(!isHeatmapMode);
            if (!isHeatmapMode) setShowHeatmapControls(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border font-bold text-xs shadow-card transition-all ${
            isHeatmapMode
              ? 'bg-red-600 text-white border-red-700 shadow-red-500/20'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
          title="Toggle Urban Density Heat Map"
        >
          <Flame className={`w-4 h-4 ${isHeatmapMode ? 'text-yellow-300 animate-pulse' : 'text-red-500'}`} />
          <span>{isHeatmapMode ? 'HEATMAP ACTIVE' : 'HEATMAP VIEW'}</span>
        </button>

        {/* Google Maps Layer Dropdown Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-blue-700 hover:bg-white transition-colors border border-slate-200 shadow-card font-bold text-xs"
          >
            <span className="text-sm">{currentLayer.icon}</span>
            <span>{currentLayer.name.split(' ')[0]}</span>
            <Layers className="w-3.5 h-3.5 text-blue-600 ml-0.5" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-modal p-1.5 space-y-1 animate-in fade-in zoom-in-95 z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Select Google Map Layer
              </div>
              {Object.entries(MAP_LAYERS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMapLayer(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    mapLayer === key
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <span className="truncate">{config.name}</span>
                  </div>
                  {mapLayer === key && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Heatmap Control & Legend Panel (When Heatmap Active) */}
      {isHeatmapMode && (
        <div className="absolute bottom-6 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-modal w-72 space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-600" />
              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Defect Density Heatmap
              </span>
            </div>
            <button
              onClick={() => setShowHeatmapControls(!showHeatmapControls)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Heatmap Category Filter */}
          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
            {[
              { id: 'ALL', label: 'All Anomalies' },
              { id: 'POTHOLES', label: 'Potholes' },
              { id: 'WATERLOGGING', label: 'Waterlogging' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setHeatmapType(tab.id)}
                className={`py-1 px-1.5 rounded-md text-center transition-all ${
                  heatmapType === tab.id
                    ? 'bg-red-600 text-white font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Density Color Gradient Bar Legend */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Low Density</span>
              <span>Moderate</span>
              <span>Critical Cluster</span>
            </div>
            <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-sky-400 via-amber-400 via-orange-500 to-red-600 shadow-inner" />
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>1-2 defects</span>
              <span>3-5 defects</span>
              <span>6+ high hazards</span>
            </div>
          </div>

          {/* Dynamic Radius Slider */}
          {showHeatmapControls && (
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Cluster Radius:</span>
                <span className="font-mono text-blue-600">{heatRadius}m</span>
              </div>
              <input
                type="range"
                min="350"
                max="1500"
                step="50"
                value={heatRadius}
                onChange={(e) => setHeatRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          )}

          <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5 border-t border-slate-100">
            <Info className="w-3 h-3 text-blue-500 shrink-0" />
            <span>Density computed from {heatmapPoints.length} active detections</span>
          </div>
        </div>
      )}

      {/* Google Maps Attribution Badge */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs flex items-center gap-1.5 select-none pointer-events-none">
        <span className="text-blue-600 font-black tracking-tight">Google</span>
        <span>Maps Live Integration</span>
      </div>

      <MapContainer
        center={CHENNAI_CENTER}
        zoom={CHENNAI_DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={mapLayer}
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          maxZoom={20}
        />

        {/* 1. HEATMAP DENSITY CLUSTERS (Active in Heatmap Mode) */}
        {isHeatmapMode && heatmapPoints.map((item, idx) => {
          const colors = getHeatmapColor(item);
          return (
            <React.Fragment key={`heat-${item.id}-${idx}`}>
              {/* Outer Low-Intensity Dispersion Ring */}
              <Circle
                center={[item.lat, item.lng]}
                radius={heatRadius * 1.3}
                pathOptions={{
                  color: colors.outer,
                  fillColor: colors.outer,
                  fillOpacity: colors.opacity * 0.4,
                  weight: 0
                }}
              />
              {/* Mid-Intensity Density Gradient Ring */}
              <Circle
                center={[item.lat, item.lng]}
                radius={heatRadius * 0.8}
                pathOptions={{
                  color: colors.core,
                  fillColor: colors.core,
                  fillOpacity: colors.opacity * 0.7,
                  weight: 0
                }}
              />
              {/* High-Intensity Core Epicenter */}
              <Circle
                center={[item.lat, item.lng]}
                radius={heatRadius * 0.35}
                pathOptions={{
                  color: '#FFFFFF',
                  fillColor: colors.core,
                  fillOpacity: 0.85,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      HIGH DENSITY HEAT CLUSTER
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">{item.title}</h4>
                    <p className="text-xs text-slate-600">{item.location}</p>
                    <div className="text-[11px] font-bold text-slate-900">
                      Severity: <span className="text-red-600">{item.severity}</span>
                    </div>
                    <button
                      onClick={() => setSelectedReport(item)}
                      className="w-full py-1 px-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-xs mt-1"
                    >
                      <span>Examine Ticket</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Circle>
            </React.Fragment>
          );
        })}

        {/* 2. Congestion Zone Overlays */}
        {showCongestion && CONGESTION_ZONES.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={650}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: isHeatmapMode ? 0.35 : 0.22,
              weight: 2,
              dashArray: '4, 6'
            }}
          >
            <Popup>
              <div className="p-1 space-y-1 font-sans">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  SAMPLE CONGESTION ZONE
                </span>
                <h4 className="font-bold text-xs text-slate-900 mt-1">{zone.zone}</h4>
                <p className="text-xs text-slate-600">Avg Corridor Speed: <strong className="text-slate-900">{zone.avgSpeedKmh} km/h</strong></p>
                <p className="text-[11px] text-slate-500">{zone.bottleneckCause}</p>
                <div className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {zone.busCountActive} Fleet Buses Active
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => openInGoogleMaps(zone.lat, zone.lng)}
                    className="w-full py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>View in Google Maps</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* 3. Fleet Bus Live GPS Pins (Always visible) */}
        {showBuses && buses.map(bus => (
          <Marker
            key={bus.id}
            position={[bus.lat, bus.lng]}
            icon={createBusIcon(bus.heading, bus.speed)}
          >
            <Popup>
              <div className="p-1.5 space-y-2 font-sans min-w-[240px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                      {bus.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{bus.regNo}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {bus.speed} km/h
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-600 flex items-start gap-1">
                    <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Route:</strong> {bus.route}</span>
                  </p>
                  <p className="text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Location:</strong> {bus.currentLocation}</span>
                  </p>
                </div>

                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono flex items-center justify-between">
                  <span className="text-slate-500">Edge YOLO AI:</span>
                  <span className="text-blue-600 font-bold">Sample bus · FPS not measured</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setSelectedBus(bus);
                      setActiveRoute('fleet');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => openInGoogleMaps(bus.lat, bus.lng)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-200"
                    title="Open exact bus coordinate in Google Maps"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Google Map</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Discrete Detection Vector Markers (Visible in normal mode or when toggled) */}
        {!isHeatmapMode && visibleDetections.map(det => (
          <Marker
            key={det.id}
            position={[det.lat, det.lng]}
            icon={createDefectIcon(det.type, det.severity)}
          >
            <Popup>
              <div className="p-2 space-y-2 font-sans min-w-[260px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {det.id}
                    </span>
                    <SeverityBadge severity={det.severity} />
                  </div>
                  <StatusBadge status={det.status} size="xs" />
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">
                    {det.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {det.location}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Confidence</span>
                    <strong className="text-blue-700">{Number.isFinite(det.confidence) ? `${Math.round(det.confidence * 100)}%` : 'Rule-based'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Detected By</span>
                    <strong className="font-mono text-slate-900">{det.busId}</strong>
                  </div>
                </div>

                {det.edgeEvent && <div className="text-xs text-slate-700 space-y-1">
                  <p>{det.cameraId} · {det.timestamp}</p>
                  <p>{det.gpsSource} · {det.lat.toFixed(5)}, {det.lng.toFixed(5)}</p>
                  {det.vehicleCount != null && <p>{det.congestionLevel} · Vehicles: {det.vehicleCount}</p>}
                  {det.trackId != null && <p>Track #{det.trackId}</p>}
                </div>}
                <div className="pt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Authority:</span>
                  <p className="text-xs font-semibold text-slate-800">{det.department}</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => setSelectedReport(det)}
                    className="py-1.5 px-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Full Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => openInGoogleMaps(det.lat, det.lng)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-200"
                    title="Open location in Google Maps"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Google Map</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/components/map/MapFilterBar.jsx`

PURPOSE: Count real congestion-event records in the existing filter bar.

CHANGE — complete file:

```jsx
import React from 'react';
import { Layers, Bus, Cone, Droplets, Radio, School, ShieldAlert, Activity } from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';

export function MapFilterBar() {
  const { activeFilter, setActiveFilter, detections, buses } = useUrbanPulse();

  const filters = [
    { id: 'ALL', label: 'All Layers', icon: Layers, count: detections.length + buses.length },
    { id: 'BUSES', label: 'Buses', icon: Bus, count: buses.length, color: 'text-blue-600' },
    { id: 'POTHOLES', label: 'Potholes', icon: Cone, count: detections.filter(d => d.type === 'pothole' || d.type === 'road_damage').length, color: 'text-amber-600' },
    { id: 'WATERLOGGING', label: 'Waterlogging', icon: Droplets, count: detections.filter(d => d.type === 'waterlogging').length, color: 'text-sky-600' },
    { id: 'TRAFFIC_SIGNALS', label: 'Traffic Signals', icon: Radio, count: detections.filter(d => d.type === 'damaged_signal' || d.type === 'damaged_signboard' || d.type === 'missing_zebra_crossing').length, color: 'text-red-600' },
    { id: 'SCHOOL_VIOLATIONS', label: 'School Violations', icon: School, count: detections.filter(d => d.type === 'school_zone_violation').length, color: 'text-purple-600' },
    { id: 'INCIDENTS', label: 'Incidents', icon: ShieldAlert, count: detections.filter(d => ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'pedestrian_risk'].includes(d.type)).length, color: 'text-red-600' },
    { id: 'CONGESTION', label: 'Congestion Events', icon: Activity, count: detections.filter(d => d.type === 'traffic_congestion').length, color: 'text-amber-600' }
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
      {filters.map(item => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveFilter(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              isActive
                ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : item.color || 'text-slate-400'}`} />
            <span>{item.label}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/context/UrbanPulseContext.jsx`

PURPOSE: Import backend events into the existing notification/report state without legacy random fallback values.

CHANGE — complete file:

```jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CHENNAI_FLEET } from '../data/busesData';
import { INITIAL_ALL_DETECTIONS } from '../data/detectionsData';
import { DEPARTMENTS } from '../data/departmentsData';
import { updateBusCoordinate } from '../utils/geoUtils';
import { getAutoAssignedDepartment, generateReportId } from '../utils/workflowEngine';

import { CENTRAL_URL, readJson, eventToDetection } from '../services/edgeApi';

const UrbanPulseContext = createContext(null);

// Calculate approximate distance between two GPS coordinates in meters
function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;

  const toRadians = degrees => degrees * Math.PI / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function UrbanPulseProvider({ children }) {
  const [buses, setBuses] = useState(CHENNAI_FLEET);
  const [detections, setDetections] = useState(INITIAL_ALL_DETECTIONS.map(d => ({ ...d, title: `[SAMPLE] ${d.title}`, detectionSource: 'SEEDED_DEMO' })));
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Real-time notification queue
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: '[SAMPLE] Hit-and-Run Incident Alert',
      message: 'Bus-104 detected vehicle collision on OMR Sholinganallur. ANPR identified TN-09-CB-4491.',
      category: 'CRITICAL',
      time: 'Just now',
      timestamp: Date.now(),
      unread: true,
      reportId: 'INC-901'
    },
    {
      id: 'notif-2',
      title: '[SAMPLE] Critical Pothole Detected',
      message: 'Bus-118 identified 18cm deep crater at Guindy Kathipara underpass.',
      category: 'WARNING',
      time: '9 min ago',
      timestamp: Date.now() - 9 * 60000,
      unread: true,
      reportId: 'PH-1043'
    },
    {
      id: 'notif-3',
      title: '[SAMPLE] School Zone Speed Violation',
      message: 'Bus-205 recorded vehicle speeding at 58 km/h outside DAV Public School.',
      category: 'WARNING',
      time: '8 min ago',
      timestamp: Date.now() - 8 * 60000,
      unread: true,
      reportId: 'SZV-701'
    },
    {
      id: 'notif-4',
      title: '[SAMPLE] Waterlogging Inundation Alert',
      message: 'Perungudi Toll plaza left lanes submerged (22cm depth). GCC SWD dispatched.',
      category: 'CRITICAL',
      time: '4 min ago',
      timestamp: Date.now() - 4 * 60000,
      unread: true,
      reportId: 'WL-3012'
    },
    {
      id: 'notif-5',
      title: '[SAMPLE] Department Action Resolved',
      message: 'Anna Salai Nandanam trench repair completed by GCC Rapid Squad.',
      category: 'INFO',
      time: '25 min ago',
      timestamp: Date.now() - 25 * 60000,
      unread: false,
      reportId: 'PH-1046'
    }
  ]);

  const [centralConnection, setCentralConnection] = useState('connecting');
  const eventCursor = useRef(0);
  const seenEdgeEvents = useRef(new Set());

  // Central events are already deduplicated and geolocated at the edge.
  // Do not pass them through the legacy random-bus/fallback-confidence builder.
  useEffect(() => {
    let cancelled = false, timer;
    async function pollEvents() {
      try {
        const page = await readJson(`${CENTRAL_URL}/api/events?after=${eventCursor.current}&limit=200`);
        if (cancelled) return;
        const fresh = page.events.filter(e => !seenEdgeEvents.current.has(e.event_id));
        fresh.forEach(e => seenEdgeEvents.current.add(e.event_id));
        eventCursor.current = page.next_cursor;
        if (fresh.length) {
          const records = fresh.map(eventToDetection).reverse();
          setDetections(prev => [...records, ...prev]);
          setNotifications(prev => [...records.map(d => ({
            id: `edge-${d.id}`, reportId: d.id, title: d.title,
            message: `${d.busId} / ${d.cameraId} · ${d.timestamp} · ${d.location}` +
              (d.vehicleCount != null ? ` · Vehicles: ${d.vehicleCount}` : '') +
              (d.trackId != null ? ` · Track #${d.trackId}` : ''),
            category: d.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
            time: new Date(d.timestamp).toLocaleTimeString(), timestamp: Date.parse(d.timestamp), unread: true,
          })), ...prev]);
        }
        setCentralConnection('connected');
        if (!cancelled) timer = setTimeout(pollEvents, page.events.length === 200 ? 50 : 1500);
      } catch {
        if (!cancelled) { setCentralConnection('offline'); timer = setTimeout(pollEvents, 3000); }
      }
    }
    pollEvents();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // Derived category lists
  const potholes = detections.filter(d => d.type === 'pothole' || d.type === 'road_damage');
  const waterlogging = detections.filter(d => d.type === 'waterlogging');
  const trafficSignals = detections.filter(d => d.type === 'damaged_signal' || d.type === 'damaged_signboard' || d.type === 'missing_zebra_crossing');
  const schoolViolations = detections.filter(d => d.type === 'school_zone_violation');
  const incidents = detections.filter(d => ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'pedestrian_risk', 'traffic_congestion', 'red_light_violation', 'wrong_way_driving'].includes(d.type));

  // Live simulation tick every 6 seconds
  useEffect(() => {
    if (!simulationRunning) return;

    const interval = setInterval(() => {
      // 1. Move buses slightly along their route
      setBuses(prevBuses =>
        prevBuses.map(bus => {
          const newCoords = updateBusCoordinate(bus.lat, bus.lng, bus.heading, bus.speed);
          const jitterSpeed = Math.max(10, Math.min(55, bus.speed + Math.floor(Math.random() * 5 - 2)));
          return {
            ...bus,
            lat: newCoords.lat,
            lng: newCoords.lng,
            speed: jitterSpeed,
            lastUpdate: 'Just now'
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [simulationRunning]);

  // Add a new detection from Live Camera / Edge AI
const addNewDetection = (customData = {}) => {
  const type = customData.type || 'pothole';
  const deptInfo = getAutoAssignedDepartment(type);

  const selectedBus =
    customData.busId
      ? buses.find(bus => bus.id === customData.busId)
      : null;

  const randomBus =
    selectedBus ||
    buses[Math.floor(Math.random() * buses.length)];

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const dateStr = now.toISOString().split('T')[0];

  const confidence =
    typeof customData.confidence === 'number'
      ? customData.confidence
      : 0.92;

  const severity =
    customData.severity ||
    (confidence >= 0.90 ? 'CRITICAL' : 'HIGH');

  const lat =
    customData.lat ??
    randomBus?.lat ??
    12.9016;

  const lng =
    customData.lng ??
    randomBus?.lng ??
    80.2279;

  /*
   * ---------------------------------------------------------
   * DUPLICATE / SAME-LOCATION INCIDENT DETECTION
   * ---------------------------------------------------------
   *
   * If the same type of road problem is already within
   * approximately 50 meters, treat this as another
   * observation of the same incident.
   */

  const existingIncident = detections.find(item => {
  if (item.type !== type) return false;

  /*
   * IMPORTANT:
   * Only cluster against incidents that were created
   * by the live AI pipeline.
   *
   * This prevents an old/static demo record from
   * swallowing a brand-new YOLO incident and preventing
   * its notification.
   */

  const source = item.detectionSource || '';

  const isLiveAiIncident =
    source === 'LIVE_AI' ||
    source === 'UPLOADED_VIDEO_AI' ||
    source === 'WEBCAM_AI';

  if (!isLiveAiIncident) {
    return false;
  }

  if (
    typeof item.lat !== 'number' ||
    typeof item.lng !== 'number'
  ) {
    return false;
  }

  const distance = distanceInMeters(
    lat,
    lng,
    item.lat,
    item.lng
  );

  return distance <= 50;
});

  // ---------------------------------------------------------
  // EXISTING INCIDENT FOUND
  // ---------------------------------------------------------

  if (existingIncident) {
    const observation = {
      id: `obs-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

      busId:
        customData.busId ||
        randomBus?.id ||
        'UNKNOWN-BUS',

      cameraId:
        customData.cameraId ||
        'FRONT-CAM-01',

      confidence,

      detectionSource:
        customData.detectionSource ||
        'LIVE_AI',

      evidenceImg:
        customData.evidenceImg ||
        null,

      boundingBox:
        customData.boundingBox ||
        null,

      detectedAt:
        customData.detectedAt ||
        now.toISOString(),

      timestamp:
        `${dateStr} ${timeStr}`
    };

    let updatedIncident = null;

    setDetections(prev =>
      prev.map(item => {
        if (item.id !== existingIncident.id) {
          return item;
        }

        const observations = [
          ...(item.observations || []),
          observation
        ];

        const highestConfidence = Math.max(
          item.confidence || 0,
          confidence
        );

        updatedIncident = {
          ...item,

          // Keep one incident ID
          id: item.id,

          // Increase number of independent observations
          observationCount: observations.length,

          observations,

          // Keep strongest AI confidence
          confidence: highestConfidence,

          // Remember latest detection
          lastDetectedAt:
            customData.detectedAt ||
            now.toISOString(),

          lastDetectedBy:
            customData.busId ||
            randomBus?.id ||
            'UNKNOWN-BUS',

          // Evidence can be updated with newer/better evidence
          evidenceImg:
            customData.evidenceImg ||
            item.evidenceImg,

          // Make the incident stronger when repeatedly confirmed
          severity:
            item.severity === 'CRITICAL' ||
            severity === 'CRITICAL'
              ? 'CRITICAL'
              : item.severity,

          statusHistory: [
            ...(item.statusHistory || []),
            {
              status: item.status,
              time: `${dateStr} ${timeStr}`,
              note:
                `Additional AI observation received from ${
                  customData.busId ||
                  randomBus?.id ||
                  'road camera'
                }`
            }
          ]
        };

        return updatedIncident;
      })
    );

    /*
     * IMPORTANT:
     * Do NOT create another notification.
     *
     * The existing incident already generated an alert.
     * Repeated observations are simply attached to it.
     */

    return updatedIncident || existingIncident;
  }

  // ---------------------------------------------------------
  // NEW INCIDENT
  // ---------------------------------------------------------

  const newId =
    customData.id ||
    generateReportId(type);

  const newDetection = {
    id: newId,

    type,

    title:
      customData.title ||
      `Live AI Detected: ${type
        .replace(/_/g, ' ')
        .toUpperCase()}`,

    location:
      customData.location ||
      randomBus?.currentLocation ||
      'Live Road Monitoring',

    area:
      customData.area ||
      'OMR Corridor',

    lat,
    lng,

    severity,

    confidence,

    detectionSource:
      customData.detectionSource ||
      'LIVE_AI',

    boundingBox:
      customData.boundingBox ||
      null,

    detectedAt:
      customData.detectedAt ||
      now.toISOString(),

    lastDetectedAt:
      customData.detectedAt ||
      now.toISOString(),

    busId:
      customData.busId ||
      randomBus?.id ||
      'UNKNOWN-BUS',

    cameraId:
      customData.cameraId ||
      'FRONT-CAM-01',

    timestamp:
      customData.timestamp ||
      `${dateStr} ${timeStr}`,

    timeAgo: 'Just now',

    department:
      customData.department ||
      deptInfo.department,

    division:
      customData.division ||
      deptInfo.division,

    deptId:
      customData.deptId ||
      deptInfo.deptId,

    assignedOfficer:
      customData.assignedOfficer ||
      deptInfo.officer,

    // IMPORTANT:
    // New incidents begin at DETECTED.
    status:
      customData.status ||
      'DETECTED',

    statusHistory: [
      {
        status: 'DETECTED',
        time: `${dateStr} ${timeStr}`,
        note:
          customData.detectionSource === 'LIVE_AI'
            ? `YOLO AI detected ${type.replace(/_/g, ' ')} from live camera`
            : 'AI Edge inference tagged live detection'
      }
    ],

    // First observation
    observationCount: 1,

    observations: [
      {
        id: `obs-${Date.now()}`,

        busId:
          customData.busId ||
          randomBus?.id ||
          'UNKNOWN-BUS',

        cameraId:
          customData.cameraId ||
          'FRONT-CAM-01',

        confidence,

        detectionSource:
          customData.detectionSource ||
          'LIVE_AI',

        evidenceImg:
          customData.evidenceImg ||
          null,

        boundingBox:
          customData.boundingBox ||
          null,

        detectedAt:
          customData.detectedAt ||
          now.toISOString(),

        timestamp:
          `${dateStr} ${timeStr}`
      }
    ],

    evidenceImg:
      customData.evidenceImg ||
      null,

    evidenceCaptured:
      Boolean(customData.evidenceImg),

    ...customData
  };

  // Add the new incident
  setDetections(prev => [
    newDetection,
    ...prev
  ]);

  // ---------------------------------------------------------
// ONLY NEW INCIDENTS CREATE NOTIFICATIONS
// ---------------------------------------------------------

const newNotif = {
  id:
    `notif-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,

  title:
    `LIVE AI: ${type
      .replace(/_/g, ' ')
      .toUpperCase()} DETECTED`,

  message:
    `${newDetection.busId} / ${newDetection.cameraId} detected ` +
    `${type.replace(/_/g, ' ')} with ` +
    `${Math.round(confidence * 100)}% confidence. ` +
    `Incident ${newId} created and assigned to ` +
    `${newDetection.department}.`,

  category:
    severity === 'CRITICAL' ||
    severity === 'EMERGENCY'
      ? 'CRITICAL'
      : 'WARNING',

  time: 'Just now',

  timestamp: Date.now(),

  unread: true
};

console.log(
  'LIVE AI → NEW INCIDENT → NOTIFICATION',
  {
    type,
    confidence,
    incidentId: newId,
    busId: newDetection.busId,
    cameraId: newDetection.cameraId,
    notification: newNotif
  }
);

const DEDUP_WINDOW_MS = 60 * 1000;
const DEDUP_RADIUS_M = 200;

setNotifications(prev => {
  const now = Date.now();
  const existing = prev.find(n => {
    if (n.type !== type) return false;
    if (n.busId !== newDetection.busId) return false;
    if (now - (n.timestamp || 0) > DEDUP_WINDOW_MS) return false;
    if (n.lat == null || newDetection.lat == null) return false;
    return distanceInMeters(n.lat, n.lng, newDetection.lat, newDetection.lng) <= DEDUP_RADIUS_M;
  });

  if (existing) {
    return [
      {
        ...existing,
        time: 'Just now',
        timestamp: now,
        repeatCount: (existing.repeatCount || 1) + 1,
        unread: true
      },
      ...prev.filter(n => n.id !== existing.id)
    ];
  }

  return [newNotif, ...prev].slice(0, 50);
});

return newDetection;
};

// ---------------------------------------------------------
// STRICT INCIDENT WORKFLOW
// ---------------------------------------------------------

const WORKFLOW_TRANSITIONS = {
  DETECTED: 'VERIFIED',
  VERIFIED: 'ASSIGNED',
  ASSIGNED: 'IN PROGRESS',
  'IN PROGRESS': 'RESOLVED',
  RESOLVED: 'VERIFIED CLOSED'
};

const updateReportStatus = async (
  reportId,
  newStatus,
  note = '',
  assignedDept = null
) => {
  const edgeRecord = detections.find(d => d.id === reportId && d.edgeEvent);
  if (edgeRecord) {
    try {
      const event = await readJson(`${CENTRAL_URL}/api/events/${reportId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note, department: assignedDept }),
      });
      const updated = eventToDetection(event);
      setDetections(prev => prev.map(d => d.id === reportId ? updated : d));
      setSelectedReport(prev => prev?.id === reportId ? updated : prev);
      return true;
    } catch (error) {
      window.alert(`Status was not saved: ${error.message}`);
      return false;
    }
  }

  const now = new Date();

  const timeStr =
    now.toTimeString().split(' ')[0];

  const dateStr =
    now.toISOString().split('T')[0];

  let transitionAccepted = false;
  let updatedIncident = null;

  setDetections(prev =>
    prev.map(item => {
      if (item.id !== reportId) {
        return item;
      }

      const currentStatus =
        item.status || 'DETECTED';

      const expectedNextStatus =
        WORKFLOW_TRANSITIONS[currentStatus];

      // ---------------------------------------------------
      // STRICT WORKFLOW TRANSITION
      // ---------------------------------------------------

      if (newStatus !== expectedNextStatus) {
        console.warn(
          `Invalid workflow transition: ${currentStatus} → ${newStatus}`
        );

        return item;
      }

      transitionAccepted = true;

      const updatedHistory = [
        ...(item.statusHistory || []),
        {
          status: newStatus,
          time: `${dateStr} ${timeStr}`,
          note:
            note ||
            `Incident moved from ${currentStatus} to ${newStatus}`
        }
      ];

      updatedIncident = {
        ...item,

        status: newStatus,

        statusHistory: updatedHistory
      };

      // ---------------------------------------------------
      // DEPARTMENT ASSIGNMENT
      // ---------------------------------------------------

      if (assignedDept) {
        updatedIncident.department =
          assignedDept.department ||
          item.department;

        updatedIncident.division =
          assignedDept.division ||
          item.division;

        updatedIncident.deptId =
          assignedDept.deptId ||
          item.deptId;
      }

      // ---------------------------------------------------
      // RESOLUTION DATA
      // ---------------------------------------------------

      if (newStatus === 'RESOLVED') {
        updatedIncident.resolutionDate =
          `${dateStr} ${timeStr}`;

        updatedIncident.resolvedBy =
          item.department ||
          'Field Action Team';

        updatedIncident.resolutionNote =
          note ||
          'Issue rectified by field team.';
      }

      // ---------------------------------------------------
      // FINAL VERIFICATION
      // ---------------------------------------------------

      if (newStatus === 'VERIFIED CLOSED') {
        updatedIncident.closedDate =
          `${dateStr} ${timeStr}`;

        updatedIncident.closedBy =
          item.department ||
          'Verification Team';

        updatedIncident.closureNote =
          note ||
          'Subsequent road observation verified that the issue has been resolved.';

        updatedIncident.resolutionDate =
          item.resolutionDate ||
          `${dateStr} ${timeStr}`;

        updatedIncident.resolutionNote =
          item.resolutionNote ||
          'Issue rectified and verified.';
      }

      // ---------------------------------------------------
      // UPDATE SELECTED REPORT
      // ---------------------------------------------------

      if (
        selectedReport &&
        selectedReport.id === reportId
      ) {
        setSelectedReport(updatedIncident);
      }

      return updatedIncident;
    })
  );

  // IMPORTANT:
  // Status changes do NOT create notifications.
  //
  // Notifications are created only when a NEW detection
  // becomes a NEW incident inside addNewDetection().
  //
  // This prevents:
  // DETECTED → VERIFIED
  // VERIFIED → ASSIGNED
  // ASSIGNED → IN PROGRESS
  // etc.
  // from flooding the notification panel.

  return transitionAccepted;
};

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  return (
    <UrbanPulseContext.Provider
      value={{
        centralConnection,
        buses,
        detections,
        potholes,
        waterlogging,
        trafficSignals,
        schoolViolations,
        incidents,
        departments,
        notifications,
        unreadNotifCount,
        simulationRunning,
        setSimulationRunning,
        selectedReport,
        setSelectedReport,
        selectedBus,
        setSelectedBus,
        isSearchOpen,
        setIsSearchOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        activeRoute,
        setActiveRoute,
        activeFilter,
        setActiveFilter,
        addNewDetection,
        updateReportStatus,
        markAllNotificationsRead
      }}
    >
      {children}
    </UrbanPulseContext.Provider>
  );
}

export function useUrbanPulse() {
  const context = useContext(UrbanPulseContext);
  if (!context) {
    throw new Error('useUrbanPulse must be used within an UrbanPulseProvider');
  }
  return context;
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/pages/AllDetectionLogsPage.jsx`

PURPOSE: Render rule-based event confidence honestly in existing logs.

CHANGE — complete file:

```jsx
import React, { useState } from 'react';
import {
  ListFilter,
  Download,
  Search,
  ExternalLink
} from 'lucide-react';
import { StatusBadge, SeverityBadge } from '../components/common/StatusBadge';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';

export function AllDetectionLogsPage() {
  const { detections, setSelectedReport } = useUrbanPulse();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredLogs = detections.filter(d => {
    const matchSearch = d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()) ||
      d.busId.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || d.type === filterType;
    const matchSeverity = filterSeverity === 'ALL' || d.severity === filterSeverity;
    const matchDept = filterDept === 'ALL' || d.department?.toLowerCase().includes(filterDept.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;

    return matchSearch && matchType && matchSeverity && matchDept && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-blue-600" />
            <span>All Edge AI Detection Logs & Audit Archive</span>
          </h1>
          <p className="text-xs text-slate-500">
            Master multi-sensor detection log aggregated from 127 fleet buses in real-time
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filteredLogs, 'urbanpulse-master-detection-log.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT AUDIT CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Ticket, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Detection Types</option>
              <option value="pothole">Potholes</option>
              <option value="waterlogging">Waterlogging</option>
              <option value="damaged_signal">Traffic Signals</option>
              <option value="school_zone_violation">School Violations</option>
              <option value="hit_and_run">Hit-and-Run</option>
              <option value="rash_driving">Rash Driving</option>
            </select>
          </div>

          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>

          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Responsible Depts</option>
              <option value="Corporation">Greater Chennai Corporation</option>
              <option value="Police">Traffic Police</option>
              <option value="Highways">TN Highways</option>
              <option value="Water">Metro Water</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Workflow Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED CLOSED">Verified Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Log Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-900">{filteredLogs.length}</strong> detections
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">TICKET ID</th>
                <th className="py-2.5 px-3">DETECTION TYPE</th>
                <th className="py-2.5 px-3">LOCATION & GPS</th>
                <th className="py-2.5 px-3">BUS & CAM</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">DEPARTMENT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {item.timestamp?.split(' ')[1] || item.timeAgo}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.id}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 uppercase text-[11px]">
                      {item.type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-[170px] truncate text-slate-800">
                    {item.location}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-blue-600 font-bold">
                    {item.busId} • {item.cameraId || 'FRONT-01'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Number.isFinite(item.confidence) ? `${Math.round(item.confidence * 100)}%` : 'Rule-based'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px] max-w-[140px] truncate">
                    {item.department}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} size="xs" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(item);
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 ml-auto"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/pages/IncidentCenterPage.jsx`

PURPOSE: Show traffic events without fabricated confidence or an ANPR-in-progress claim.

CHANGE — complete file:

```jsx
import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Car,
  Clock,
  CheckCircle2,
  Check,
  UserPlus,
  Play,
  Wrench,
  Lock
} from 'lucide-react';

import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { HitAndRunWorkflow } from '../components/incident/HitAndRunWorkflow';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { INITIAL_INCIDENTS } from '../data/incidentsData';

const WORKFLOW_STEPS = [
  {
    status: 'DETECTED',
    label: 'VERIFY',
    icon: Check
  },
  {
    status: 'VERIFIED',
    label: 'ASSIGN',
    icon: UserPlus
  },
  {
    status: 'ASSIGNED',
    label: 'START WORK',
    icon: Play
  },
  {
    status: 'IN PROGRESS',
    label: 'RESOLVE',
    icon: Wrench
  },
  {
    status: 'RESOLVED',
    label: 'VERIFY CLOSE',
    icon: Lock
  }
];

function getNextAction(status) {
  const actions = {
    DETECTED: {
      label: 'VERIFY',
      nextStatus: 'VERIFIED',
      icon: Check
    },

    VERIFIED: {
      label: 'ASSIGN',
      nextStatus: 'ASSIGNED',
      icon: UserPlus
    },

    ASSIGNED: {
      label: 'START WORK',
      nextStatus: 'IN PROGRESS',
      icon: Play
    },

    'IN PROGRESS': {
      label: 'RESOLVE',
      nextStatus: 'RESOLVED',
      icon: Wrench
    },

    RESOLVED: {
      label: 'VERIFY CLOSE',
      nextStatus: 'VERIFIED CLOSED',
      icon: Lock
    }
  };

  return actions[status] || null;
}

export function IncidentCenterPage() {
  const {
    incidents,
    setSelectedReport,
    updateReportStatus
  } = useUrbanPulse();

  const [selectedIncident] = useState(INITIAL_INCIDENTS[0]);

  const handleWorkflowAction = (item) => {
    const action = getNextAction(item.status || 'DETECTED');

    if (!action) {
      return;
    }

    updateReportStatus(
      item.id,
      action.nextStatus,
      `${action.label} action completed from Incident Center.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />

            <span>
              Emergency Incident Center & ANPR Crime Investigation
            </span>
          </h1>

          <p className="text-xs text-slate-500">
            AI collision detection, fleeing vehicle deep-tracking,
            optical license plate extraction, and police broadcasts
          </p>
        </div>

        <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
          POLICE ITMS DIRECT BRIDGE ONLINE
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <StatCard
          title="HIT & RUN INCIDENTS"
          value="1"
          subtitle="ANPR Locked (TN-09-CB-4491)"
          variant="danger"
          badgeText="ACTIVE"
          icon={AlertTriangle}
        />

        <StatCard
          title="RASH DRIVING DETECTIONS"
          value="14"
          subtitle="Speed > 85 km/h in urban zone"
          variant="warning"
          icon={Car}
        />

        <StatCard
          title="PEDESTRIAN NEAR-MISS"
          value="6"
          subtitle="Blind curve & crosswalks"
          variant="default"
          icon={Clock}
        />

        <StatCard
          title="RESOLVED CASES"
          value="9"
          subtitle="Interception completed"
          variant="success"
          icon={CheckCircle2}
        />

      </div>

      {/* Hit-and-Run Pipeline */}
      <HitAndRunWorkflow incident={selectedIncident} />

      {/* Incident Workflow Registry */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Incident Workflow Registry
            </h3>

            <p className="text-[11px] text-slate-500 mt-1">
              Every incident follows the controlled municipal response lifecycle.
            </p>
          </div>

          <div className="text-[10px] font-mono font-bold text-slate-500">
            CONTROLLED WORKFLOW
          </div>

        </div>

        {/* Workflow stages */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">

          {[
            'DETECTED',
            'VERIFIED',
            'ASSIGNED',
            'IN PROGRESS',
            'RESOLVED',
            'VERIFIED CLOSED'
          ].map((stage, index) => (

            <div
              key={stage}
              className="relative bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
              <div className="text-[9px] font-mono font-bold text-slate-400">
                STEP {index + 1}
              </div>

              <div className="text-[10px] font-extrabold text-slate-800 mt-1">
                {stage}
              </div>

              {index < 5 && (
                <div className="hidden md:block absolute top-1/2 -right-2 text-slate-300 z-10">
                  →
                </div>
              )}
            </div>

          ))}

        </div>

      </div>

      {/* Incident Archive Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Critical Incident Registry & Police Dispatch Log
            </h3>

            <p className="text-[11px] text-slate-500 mt-1">
              Action buttons are enabled only for the current workflow stage.
            </p>
          </div>

          <div className="text-[10px] font-bold text-slate-500">
            {incidents.length} INCIDENTS
          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs border-collapse">

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">

                <th className="py-2.5 px-3">
                  INCIDENT ID
                </th>

                <th className="py-2.5 px-3">
                  CRIME / EVENT TYPE
                </th>

                <th className="py-2.5 px-3">
                  LOCATION
                </th>

                <th className="py-2.5 px-3">
                  SUSPECT VEHICLE
                </th>

                <th className="py-2.5 px-3">
                  OCR NUMBER PLATE
                </th>

                <th className="py-2.5 px-3">
                  BUS & CAM
                </th>

                <th className="py-2.5 px-3">
                  CONFIDENCE
                </th>

                <th className="py-2.5 px-3">
                  STATUS
                </th>

                <th className="py-2.5 px-3 text-right">
                  ACTION
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">

              {incidents.map(item => {

                const currentStatus =
                  item.status || 'DETECTED';

                const action =
                  getNextAction(currentStatus);

                const ActionIcon =
                  action?.icon || Check;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedReport(item)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >

                    <td className="py-3 px-3 font-mono font-bold text-red-600">
                      {item.id}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-900 uppercase text-xs">
                      {item.type?.replace(/_/g, ' ')}
                    </td>

                    <td className="py-3 px-3 text-slate-500 max-w-[160px] truncate">
                      {item.location}
                    </td>

                    <td className="py-3 px-3 text-slate-800 text-[11px]">
                      {item.vehicleDetails?.vehicleType ||
                        'Motor Vehicle'}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 bg-yellow-300 px-2 py-0.5 rounded border border-yellow-500 inline-block my-0.5 text-[11px] shadow-xs">
                        {item.edgeEvent ? 'Not performed' : (item.vehicleDetails?.numberPlate || item.numberPlate || 'SAMPLE WORKFLOW')}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-blue-600 font-bold">
                      {item.busId}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                        {Number.isFinite(item.confidence) ? `${Math.round(item.confidence * 100)}%` : 'Rule-based'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge
                        status={currentStatus}
                        size="xs"
                      />
                    </td>

                    <td
                      className="py-3 px-3"
                      onClick={e => e.stopPropagation()}
                    >

                      <div className="flex items-center justify-end gap-2">

                        <button
                          onClick={() =>
                            setSelectedReport(item)
                          }
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>EXAMINE</span>

                          <ExternalLink className="w-3 h-3" />
                        </button>

                        {action && (
                          <button
                            onClick={() =>
                              handleWorkflowAction(item)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-[10px] font-extrabold hover:bg-slate-700 transition-colors"
                          >
                            <ActionIcon className="w-3 h-3" />

                            {action.label}
                          </button>
                        )}

                        {!action && (
                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            CLOSED
                          </span>
                        )}

                      </div>

                    </td>

                  </tr>
                );
              })}

              {incidents.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    className="py-10 text-center text-xs text-slate-400"
                  >
                    No active incidents available.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/pages/LiveCameraPage.jsx`

PURPOSE: Insert independent side-by-side edge previews and retain explicitly labelled legacy simulator tools.

CHANGE — complete file:

```jsx
import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { EdgeCameraPanels } from '../components/camera/EdgeCameraPanels';
import { WebcamStream } from '../components/camera/WebcamStream';
import { YoloStatsPanel } from '../components/camera/YoloStatsPanel';
import { DetectionClassList } from '../components/camera/DetectionClassList';
import { useUrbanPulse } from '../context/UrbanPulseContext';

export function LiveCameraPage() {
  const { buses, addNewDetection, setSelectedReport } = useUrbanPulse();
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState('BUS-104');
  const [selectedCam, setSelectedCam] = useState('FRONT-CAM-01');
  const [activeScenario, setActiveScenario] = useState('WATERLOGGING');

  const handleSimulateScenario = () => {
    const scenarioMap = {
      WATERLOGGING: {
        title: 'Severe Metro Flyover Road Inundation (Water Depth: 22cm)',
        type: 'waterlogging',
        severity: 'CRITICAL',
        department: 'Greater Chennai Corporation',
        division: 'Storm Water Drain (SWD) Cell',
        deptId: 'GCC-SWD',
        location: 'Perungudi - Toll Plaza Underpass (OMR)',
        waterDepthCm: 22,
        confidence: 0.96,
        impactScore: 95,
        evidenceImg: '/evidence/waterlogging_metro_junction.jpg'
      },
      WATER_HIGHWAY: {
        title: 'Highway Inundation & Deep Road Puddle (Depth: 18cm)',
        type: 'waterlogging',
        severity: 'HIGH',
        department: 'Greater Chennai Corporation',
        division: 'Storm Water Drain (SWD) Cell',
        deptId: 'GCC-SWD',
        location: 'Velachery 100ft Bypass Road',
        waterDepthCm: 18,
        confidence: 0.95,
        impactScore: 91,
        evidenceImg: '/evidence/waterlogging_highway_car.jpg'
      },
      WATER_NIGHT: {
        title: 'Night Monsoon Road Inundation & Barricade Flooding',
        type: 'waterlogging',
        severity: 'HIGH',
        department: 'Greater Chennai Corporation',
        division: 'Storm Water Drain (SWD) Cell',
        deptId: 'GCC-SWD',
        location: 'Koyambedu Wholesale Market Entrance',
        waterDepthCm: 16,
        confidence: 0.94,
        impactScore: 88,
        evidenceImg: '/evidence/waterlogging_night_inundation.jpg'
      },
      WATER_CRATERS: {
        title: 'Water-Filled Asphalt Potholes & Muddy Puddles (Depth: 15cm)',
        type: 'pothole',
        severity: 'CRITICAL',
        department: 'Greater Chennai Corporation',
        division: 'Roads & Infrastructure',
        deptId: 'GCC-ROADS',
        location: 'Sholinganallur Junction - Near ELCOT SEZ',
        depthCm: 15,
        widthCm: 85,
        confidence: 0.96,
        impactScore: 94,
        evidenceImg: '/evidence/waterlogging_craters_puddle.jpg'
      },
      POTHOLE: {
        title: 'Severe Asphalt Potholes & Road Craters (Center Lane)',
        type: 'pothole',
        severity: 'HIGH',
        department: 'Greater Chennai Corporation',
        division: 'Roads & Infrastructure',
        deptId: 'GCC-ROADS',
        location: 'OMR - Sholinganallur Corridor',
        depthCm: 16,
        widthCm: 75,
        confidence: 0.96,
        impactScore: 92,
        evidenceImg: '/evidence/pothole_asphalt_main.jpg'
      },
      ROAD_DAMAGE: {
        title: 'Edge Shoulder Damage & Asphalt Crumbling',
        type: 'road_damage',
        severity: 'CRITICAL',
        department: 'Greater Chennai Corporation',
        division: 'Roads & Infrastructure',
        deptId: 'GCC-ROADS',
        location: 'Velachery Vijayanagar 100ft Road',
        depthCm: 12,
        widthCm: 110,
        confidence: 0.94,
        impactScore: 89,
        evidenceImg: '/evidence/edge_shoulder_damage.jpg'
      },
      CRACK: {
        title: 'Longitudinal Road Fracture & Curve Damage',
        type: 'road_damage',
        severity: 'HIGH',
        department: 'Tamil Nadu Highways & Minor Ports',
        division: 'Chennai Metropolitan Circle',
        deptId: 'TN-HIGHWAYS',
        location: 'GST Road Expressway Curve',
        depthCm: 8,
        widthCm: 180,
        confidence: 0.95,
        impactScore: 85,
        evidenceImg: '/evidence/longitudinal_road_crack.jpg'
      },
      SPEED_BREAKER: {
        title: 'Speed Breaker Strip & Road Marking Detection',
        type: 'damaged_signboard',
        severity: 'MEDIUM',
        department: 'Greater Chennai Traffic Police',
        division: 'Traffic Safety & Markings',
        deptId: 'GCTP-SIGNALS',
        location: 'Anna Salai Near Spencers Plaza',
        confidence: 0.97,
        impactScore: 68,
        evidenceImg: '/evidence/speed_breaker_marking.jpg'
      },
      SIGNAL: {
        title: 'Traffic Signal Non-Functional (Red Aspect Dark)',
        type: 'damaged_signal',
        severity: 'CRITICAL',
        department: 'Greater Chennai Traffic Police',
        division: 'Signals & ITMS Wing',
        deptId: 'GCTP-SIGNALS',
        location: 'Kathipara Junction Approach',
        confidence: 0.89,
        impactScore: 88
      },
      SCHOOL_ZONE: {
        title: 'School Zone Speed Violation (62 km/h in 25 zone)',
        type: 'school_zone_violation',
        severity: 'HIGH',
        department: 'Greater Chennai Traffic Police',
        division: 'Traffic Enforcement',
        deptId: 'GCTP-ENFORCE',
        location: 'Chettinad Vidyashram School Gate',
        numberPlate: 'TN-07-BP-9921',
        confidence: 0.95,
        impactScore: 86
      },
      HIT_AND_RUN: {
        title: 'Hit-and-Run Collision with Fleeing Vehicle',
        type: 'hit_and_run',
        severity: 'EMERGENCY',
        department: 'Greater Chennai Traffic Police',
        division: 'Special Crime Unit',
        deptId: 'GCTP-CRIME',
        location: 'OMR Navallur Expressway',
        numberPlate: 'TN-09-CB-4491',
        confidence: 0.96,
        impactScore: 99
      }
    };

    const config = scenarioMap[activeScenario] || scenarioMap.WATERLOGGING;
    const newReport = addNewDetection({
      ...config,
      title: `[SIMULATED] ${config.title}`,
      detectionSource: 'SIMULATED_SCENARIO',
      gpsSource: 'SIMULATED_ROUTE',
      busId: selectedBusId,
      cameraId: selectedCam,
      lat: 12.9016 + (Math.random() - 0.5) * 0.02,
      lng: 80.2279 + (Math.random() - 0.5) * 0.02
    });

    if (newReport) {
      setSelectedReport(newReport);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>Live Camera · Bus Edge Intelligence</span>
          </h1>
          <p className="text-xs text-slate-500">
            Two independent prerecorded bus cameras with local inference and structured event synchronization
          </p>
        </div>

        {/* Selectors apply only to legacy simulator, not the bus edge feeds. */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Simulator:</span>
          <select
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
          >
            {buses.slice(0, 10).map(b => (
              <option key={b.id} value={b.id}>{b.id} ({b.regNo})</option>
            ))}
          </select>

          <select
            value={selectedCam}
            onChange={(e) => setSelectedCam(e.target.value)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
          >
            <option value="FRONT-CAM-01">FRONT-CAM-01 (1080p 60fps)</option>
            <option value="REAR-CAM-02">REAR-CAM-02 (1080p 30fps)</option>
            <option value="LEFT-CAM-03">LEFT-CAM-03 (Pavement/Curb)</option>
            <option value="RIGHT-CAM-04">RIGHT-CAM-04 (Lane Divider)</option>
            <option value="CABIN-CAM-05">CABIN-CAM-05 (Driver Safety)</option>
          </select>
        </div>
      </div>

      <EdgeCameraPanels />

      <details onToggle={e => setLegacyOpen(e.currentTarget.open)} className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">Existing scenario simulator & legacy upload tools — illustrative data</summary>
        <p className="text-xs text-amber-700 my-3">Scenario boxes, depth, speed and plate values are simulated. These controls do not operate the two edge cameras above. Legacy uploads send frames to /predict.</p>
      {/* Main Grid: Video Stream + Stats Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {legacyOpen && <WebcamStream
            activeScenario={activeScenario}
            selectedBusId={selectedBusId}
            selectedCam={selectedCam}
            onSnapshotTaken={() => {
              handleSimulateScenario();
            }}
            onDetection={(detection) => {
  console.log(
    '📡 LIVE CAMERA → CONTEXT:',
    detection
  );

  const report = addNewDetection({
    ...detection,

    title: detection.title,

    severity:
      detection.confidence >= 0.85
        ? 'HIGH'
        : detection.confidence >= 0.65
        ? 'MEDIUM'
        : 'LOW',

    location:
      `${selectedBusId} • Live camera detection`,

    area:
      'Live Road Monitoring',

    busId:
      selectedBusId,

    cameraId:
      selectedCam,

    detectedAt:
      detection.detectedAt ||
      new Date().toISOString()
  });

  console.log(
    '📝 INCIDENT CREATED/UPDATED:',
    report
  );
}}
          />}

          <DetectionClassList />
        </div>

        <div className="lg:col-span-1">
          <YoloStatsPanel
            activeScenario={activeScenario}
            onSelectScenario={setActiveScenario}
            onSimulateDetection={handleSimulateScenario}
          />
        </div>
      </div>
      </details>
    </div>
  );
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `src/services/edgeApi.js`

PURPOSE: Normalize central events into existing UI records and configure local API origins.

CHANGE — complete file:

```javascript
export const CENTRAL_URL = (import.meta.env.VITE_CENTRAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
export const EDGE_URL = (import.meta.env.VITE_EDGE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');

export async function readJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
}

export function eventToDetection(event) {
  const m = event.metadata || {};
  const road = event.camera_id === 'FRONT_CAMERA';
  const type = road ? (m.class_name === 'pothole' ? 'pothole' : 'road_damage') : event.event_type.toLowerCase();
  const title = road ? `Road observation: ${(m.class_name || 'unknown').replaceAll('_', ' ')}` : event.event_type.replaceAll('_', ' ');
  return {
    id: event.event_id, eventType: event.event_type, type, title,
    confidence: event.confidence, severity: event.severity, status: event.status,
    lat: event.latitude, lng: event.longitude, busId: event.bus_id, cameraId: event.camera_id,
    gpsSource: event.gps_source, detectionSource: event.source, edgeEvent: true,
    location: event.gps_source === 'SIMULATED_ROUTE' ? 'Prototype route · simulated GPS' : 'Bus GPS observation',
    area: 'Bus camera observation', timestamp: event.timestamp, detectedAt: event.timestamp,
    timeAgo: new Date(event.timestamp).toLocaleTimeString(), trackId: event.track_id,
    vehicleType: event.vehicle_type, vehicleCount: event.vehicle_count,
    congestionLevel: m.congestion_level, metadata: m,
    evidenceImg: event.evidence_path ? `${CENTRAL_URL}${event.evidence_path}` : null,
    statusHistory: event.status_history || [],
    department: m.assigned_department?.department || (road ? 'Greater Chennai Corporation' : 'Greater Chennai Traffic Police'),
    division: m.assigned_department?.division || (road ? 'Roads & Infrastructure' : 'Traffic Review'),
    deptId: m.assigned_department?.deptId || (road ? 'GCC-ROADS' : 'GCTP-ENFORCE'),
    observationCount: 1, observations: [],
  };
}
```

TEST: From fleetbus: `npm run build`. Then run the services and verify the corresponding page/notification/map flow as listed in SPRINT_README.md. A successful build alone does not verify browser behavior.

### FILE: `start-demo.ps1`

PURPOSE: Start one central process, one edge process, and the existing Vite application.

CHANGE — complete file:

```powershell
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$PythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$BackendDir = Join-Path $PSScriptRoot 'backend'
if (!(Test-Path $PythonExe)) { throw 'Run setup-windows.ps1 first, or use your existing venv with the manual commands in SPRINT_README.md.' }
if (!(Test-Path 'node_modules')) { throw 'Run npm ci first.' }
# Exactly one edge process; do not use --reload or multiple uvicorn workers.
$CentralProcess = Start-Process -FilePath $PythonExe -WorkingDirectory $BackendDir -ArgumentList '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' -PassThru
$EdgeProcess = Start-Process -FilePath $PythonExe -WorkingDirectory $BackendDir -ArgumentList '-m uvicorn edge.main:app --host 127.0.0.1 --port 8001' -PassThru
try {
    Write-Host 'Central: http://127.0.0.1:8000/health'
    Write-Host 'Edge status: http://127.0.0.1:8001/api/status'
    Write-Host 'Frontend: http://localhost:5173'
    npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
} finally {
    foreach ($DemoProcess in @($CentralProcess, $EdgeProcess)) {
        if (!$DemoProcess.HasExited) { Stop-Process -Id $DemoProcess.Id }
    }
}
```

TEST: Inspect prerequisites in SPRINT_README.md; execute this script from PowerShell only after the required assets and dependencies exist. Windows execution is not verified in the development environment.

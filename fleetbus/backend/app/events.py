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

    # --- NEW: ANPR fields for hit-and-run evidence ---
    plate: str | None = Field(default=None, max_length=20)
    plate_confidence: float | None = Field(default=None, ge=0, le=1)
    plate_raw_text: str | None = Field(default=None, max_length=40)

    metadata: dict = Field(default_factory=dict)
    evidence_jpeg_base64: str | None = Field(default=None, max_length=2_000_000)
    evidence_crop_jpeg_base64: str | None = Field(default=None, max_length=500_000)

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
    payload = event.model_dump(
        mode="json",
        exclude={"evidence_jpeg_base64", "evidence_crop_jpeg_base64"},
    )
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

        # --- NEW: persist ANPR evidence crop separately from full frame ---
        payload["plate"] = event.plate
        payload["plate_confidence"] = event.plate_confidence
        payload["plate_raw_text"] = event.plate_raw_text
        payload["evidence_crop_path"] = None

        if event.evidence_crop_jpeg_base64:
            try:
                crop_data = base64.b64decode(
                    event.evidence_crop_jpeg_base64, validate=True
                )
                if not crop_data.startswith(b"\xff\xd8"):
                    raise ValueError("JPEG required")
            except Exception as exc:
                raise HTTPException(422, "Invalid ANPR crop JPEG") from exc
            crop_target = EVIDENCE / f"{event_id}_anpr.jpg"
            crop_tmp = EVIDENCE / f"{event_id}_anpr.tmp"
            crop_tmp.write_bytes(crop_data)
            crop_tmp.replace(crop_target)
            payload["evidence_crop_path"] = f"/evidence/{event_id}_anpr.jpg"

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


# --- NEW: feed for HitAndRunWorkflow / IncidentCenterPage ---
@router.get("/api/incidents/anpr")
def anpr_incidents(limit: int = Query(50, ge=1, le=200)):
    """Return all incidents that have a plate candidate — feeds HitAndRunWorkflow."""
    with connect() as con:
        rows = con.execute(
            "SELECT * FROM events ORDER BY seq DESC LIMIT ?", (limit * 4,)
        ).fetchall()
    incidents = []
    for r in rows:
        payload = json.loads(r["payload"])
        if payload.get("plate"):
            incidents.append(decode(r))
        if len(incidents) >= limit:
            break
    return {"incidents": incidents}


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
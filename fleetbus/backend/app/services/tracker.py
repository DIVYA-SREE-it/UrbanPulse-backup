"""ByteTrack wrapper for persistent vehicle IDs across frames.

Wraps Ultralytics' built-in ByteTrack so edge code doesn't need to manage
Kalman filter state, association matrices, or track lifecycle.

Design notes:
- ByteTrack is bundled with Ultralytics — no extra install.
- We keep a per-track last_seen timestamp so stale tracks can be purged
  during long idle periods (avoids memory growth on 24/7 bus operation).
- Track IDs are ints, monotonically increasing per process. We do NOT
  reuse IDs, so bus_id + track_id + start_timestamp is globally unique.
"""
import time
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class TrackState:
    track_id: int
    vehicle_type: str
    first_seen: float
    last_seen: float
    hit_count: int = 1
    metadata: dict = field(default_factory=dict)


class VehicleTracker:
    """
    Thin stateful wrapper around YOLO's ByteTrack interface.

    Usage:
        tracker = VehicleTracker()
        results = tracker.update(frame, model)
        for det in tracker.to_detections(results):
            # det includes track_id, vehicle_type, bbox, confidence
    """

    # Tracks unseen for >30s are purged (bus may have left the scene)
    STALE_SECONDS = 30.0

    def __init__(self):
        self._tracks: dict[int, TrackState] = {}
        self._lock = Lock()

    def update(self, frame_bgr, model, conf: float = 0.35):
        """
        Run YOLO tracking on a frame.

        Args:
            frame_bgr: numpy BGR frame
            model: ultralytics.YOLO instance
            conf: minimum detection confidence

        Returns:
            ultralytics Results object (with .boxes.id populated)
        """
        # persist=True tells Ultralytics to maintain tracker state across calls
        results = model.track(
            source=frame_bgr,
            persist=True,
            tracker="bytetrack.yaml",
            conf=conf,
            verbose=False,
        )
        return results[0] if isinstance(results, list) else results

    def to_detections(self, result) -> list[dict]:
        """
        Convert a Results object into plain dicts with track IDs.

        Filters out detections without a track ID (first-frame detections
        before the tracker has locked on) — those aren't actionable for
        hit-and-run evidence.
        """
        detections = []
        if result.boxes is None or result.boxes.id is None:
            return detections

        boxes_xyxy = result.boxes.xyxy.cpu().numpy()
        confs = result.boxes.conf.cpu().numpy()
        class_ids = result.boxes.cls.cpu().numpy().astype(int)
        track_ids = result.boxes.id.cpu().numpy().astype(int)

        now = time.time()

        for xyxy, conf, cls_id, tid in zip(boxes_xyxy, confs, class_ids, track_ids):
            label = result.names.get(int(cls_id), f"class_{cls_id}")

            with self._lock:
                if tid in self._tracks:
                    st = self._tracks[tid]
                    st.last_seen = now
                    st.hit_count += 1
                else:
                    st = TrackState(
                        track_id=int(tid),
                        vehicle_type=label,
                        first_seen=now,
                        last_seen=now,
                    )
                    self._tracks[int(tid)] = st

            detections.append({
                "track_id": int(tid),
                "vehicle_type": label,
                "confidence": round(float(conf), 3),
                "bounding_box": {
                    "x1": float(xyxy[0]), "y1": float(xyxy[1]),
                    "x2": float(xyxy[2]), "y2": float(xyxy[3]),
                },
                "first_seen": st.first_seen,
                "hit_count": st.hit_count,
            })

        self._purge_stale(now)
        return detections

    def _purge_stale(self, now: float):
        """Drop tracks not seen for STALE_SECONDS to keep memory bounded."""
        with self._lock:
            stale = [
                tid for tid, st in self._tracks.items()
                if now - st.last_seen > self.STALE_SECONDS
            ]
            for tid in stale:
                del self._tracks[tid]

    def get_track(self, track_id: int) -> TrackState | None:
        with self._lock:
            return self._tracks.get(track_id)
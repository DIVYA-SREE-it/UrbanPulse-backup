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

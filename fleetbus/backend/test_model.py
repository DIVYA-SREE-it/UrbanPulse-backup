from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models" / "best.pt"

print("Loading model from:")
print(MODEL_PATH)

if not MODEL_PATH.exists():
    print("ERROR: Model file not found!")
    print(f"Expected location: {MODEL_PATH}")
    raise SystemExit(1)

model = YOLO(str(MODEL_PATH))

print("\nSignalSync Road Damage AI model loaded successfully!")

print("\nClasses:")
print(model.names)
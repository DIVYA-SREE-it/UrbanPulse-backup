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

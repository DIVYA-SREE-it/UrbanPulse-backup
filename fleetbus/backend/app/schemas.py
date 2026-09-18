from pydantic import BaseModel
from typing import List


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bounding_box: BoundingBox


class PredictionResponse(BaseModel):
    success: bool
    total_detections: int
    detections: List[Detection]
    annotated_image: str
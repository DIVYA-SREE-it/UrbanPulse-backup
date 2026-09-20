"""Draw temporally stabilized road-hazard detections."""

import cv2


CLASS_COLORS = {
    "pothole": (60, 60, 230),
    "crack": (30, 165, 255),
    "patch": (220, 180, 40),
    "other": (180, 180, 180),
}


def draw_road_detections(frame, detections):
    annotated = frame.copy()

    for detection in detections:
        x1, y1, x2, y2 = [
            int(value)
            for value in detection["xyxy"]
        ]

        label = detection.get("class_name", "road hazard")
        confidence = float(detection.get("confidence", 0))
        track_id = detection.get("track_id")
        support = detection.get("support_frames", 0)

        color = CLASS_COLORS.get(
            str(label).lower(),
            (200, 200, 200),
        )

        # Bounding box
        cv2.rectangle(
            annotated,
            (x1, y1),
            (x2, y2),
            color,
            3,
        )

        title = f"{str(label).upper()} {confidence * 100:.0f}%"

        details = (
            f"CONFIRMED {support} FRAMES"
            if track_id is None
            else f"TRACK #{track_id} | CONFIRMED {support} FRAMES"
        )

        font = cv2.FONT_HERSHEY_SIMPLEX

        title_scale = 0.62
        detail_scale = 0.43

        title_size, _ = cv2.getTextSize(
            title,
            font,
            title_scale,
            2,
        )

        detail_size, _ = cv2.getTextSize(
            details,
            font,
            detail_scale,
            1,
        )

        box_width = max(
            title_size[0],
            detail_size[0],
        ) + 16

        top = max(0, y1 - 53)

        cv2.rectangle(
            annotated,
            (x1, top),
            (x1 + box_width, y1),
            color,
            -1,
        )

        cv2.putText(
            annotated,
            title,
            (x1 + 8, top + 21),
            font,
            title_scale,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        cv2.putText(
            annotated,
            details,
            (x1 + 8, top + 42),
            font,
            detail_scale,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return annotated

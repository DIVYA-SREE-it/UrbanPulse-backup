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


"""Automatic Number Plate Recognition for hit-and-run incident evidence.

Uses EasyOCR (CPU-friendly, no GPU required) on vehicle crops produced by
the tracking pipeline. Filters results against Indian plate regex and
returns a confidence-scored plate candidate.

Design notes:
- EasyOCR is lazy-loaded (first call ~4s, then cached) because the
  edge device boots frequently and we don't want to block startup.
- Indian plates come in two formats:
    OLD: KA-01-H-1234      (state-district-series-number)
    NEW: KA-01-AB-1234     (state-district-series-number, BH-series also)
- We pad the crop slightly (10%) because detectors often clip the plate edge.
"""
import re
from threading import Lock

import cv2
import numpy as np

_reader = None
_reader_lock = Lock()

# Indian registration plate regex — tolerant of OCR noise in separators.
# Accepts optional spaces/hyphens between groups.
PLATE_REGEX = re.compile(
    r"^([A-Z]{2})[\s\-]?([0-9]{1,2})[\s\-]?([A-Z]{0,3})[\s\-]?([0-9]{4})$"
)

# Common OCR misreads on plates: 0<->O, 1<->I, 5<->S, 8<->B, 2<->Z
CHAR_FIX_MAP = {"O": "0", "I": "1", "S": "5", "B": "8", "Z": "2"}


def _get_reader():
    """Lazy singleton EasyOCR reader — English only, CPU mode."""
    global _reader
    if _reader is None:
        with _reader_lock:
            if _reader is None:
                import easyocr
                # gpu=False keeps this edge-friendly (Jetson works, RPi works slow)
                _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def _pad_crop(crop_bgr: np.ndarray, pad_pct: float = 0.10) -> np.ndarray:
    """Pad the vehicle crop so we don't lose plate pixels at the border."""
    h, w = crop_bgr.shape[:2]
    py, px = int(h * pad_pct), int(w * pad_pct)
    return cv2.copyMakeBorder(
        crop_bgr, py, py, px, px, cv2.BORDER_REPLICATE
    )


def _normalize(text: str) -> str:
    """Uppercase, strip whitespace, collapse separators to single hyphen."""
    text = text.upper().strip()
    text = re.sub(r"[\s\-]+", "-", text)
    return text


def _apply_char_fixes(text: str, group: str) -> str:
    """
    Apply position-aware OCR character fixes.
    Only digits positions get digit fixes; only letters positions get letter fixes.
    group is one of: 'state', 'district', 'series', 'number'
    """
    if group in ("state", "series"):
        # Expect letters — fix digits that look like letters
        return text.translate(str.maketrans({"0": "O", "1": "I", "5": "S"}))
    if group in ("district", "number"):
        # Expect digits — fix letters that look like digits
        return text.translate(str.maketrans(CHAR_FIX_MAP))
    return text


def _validate_indian_plate(raw_text: str) -> tuple[str | None, float]:
    """
    Return (canonical_plate, format_bonus) if raw_text matches Indian format.
    format_bonus is added to OCR confidence — rewards well-formed plates.
    """
    cleaned = _normalize(raw_text)
    # Try direct match first
    match = PLATE_REGEX.match(cleaned)
    if not match:
        # Try with separators removed entirely
        stripped = cleaned.replace("-", "")
        # Attempt to insert separators: SS-DD-XXX-NNNN
        if 9 <= len(stripped) <= 11:
            candidate = f"{stripped[:2]}-{stripped[2:4]}-{stripped[4:-4]}-{stripped[-4:]}"
            match = PLATE_REGEX.match(candidate)
            if match:
                cleaned = candidate

    if not match:
        return None, 0.0

    state, district, series, number = match.groups()
    state = _apply_char_fixes(state, "state")
    district = _apply_char_fixes(district, "district")
    series = _apply_char_fixes(series, "series")
    number = _apply_char_fixes(number, "number")

    canonical = "-".join(p for p in (state, district, series, number) if p)
    return canonical, 0.15  # 15% bonus for well-formed plates


def extract_plate(vehicle_crop_bgr: np.ndarray) -> dict:
    """
    Main entry point.

    Args:
        vehicle_crop_bgr: BGR numpy array — cropped vehicle region.
                          Should include the full vehicle, not just the plate.

    Returns:
        {
            "plate": str | None,           # canonical "TN-09-CB-4491" or None
            "raw_text": str,                # what OCR actually saw
            "confidence": float,            # 0.0 - 1.0 (combined OCR + format)
            "ocr_confidence": float,        # raw OCR confidence
            "valid_format": bool,           # matched Indian plate regex
        }
    """
    empty = {
        "plate": None, "raw_text": "", "confidence": 0.0,
        "ocr_confidence": 0.0, "valid_format": False,
    }

    if vehicle_crop_bgr is None or vehicle_crop_bgr.size == 0:
        return empty

    # Plates are usually in the lower half of a vehicle crop.
    # Cropping the bottom 50% reduces OCR noise from windshields/logos.
    h = vehicle_crop_bgr.shape[0]
    plate_roi = vehicle_crop_bgr[int(h * 0.5):, :]
    plate_roi = _pad_crop(plate_roi, 0.10)

    # Upscale small crops — EasyOCR prefers >= 64px text height
    if plate_roi.shape[0] < 120:
        scale = 120 / plate_roi.shape[0]
        plate_roi = cv2.resize(
            plate_roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC
        )

    try:
        reader = _get_reader()
        results = reader.readtext(plate_roi, detail=1, paragraph=False)
    except Exception:
        return empty

    if not results:
        return empty

    # Pick the result with the highest OCR confidence
    best_text, best_conf = "", 0.0
    for _bbox, text, conf in results:
        if conf > best_conf and len(text.strip()) >= 6:
            best_text, best_conf = text, conf

    if not best_text:
        return empty

    canonical, bonus = _validate_indian_plate(best_text)
    combined = min(1.0, float(best_conf) + bonus) if canonical else float(best_conf)

    return {
        "plate": canonical,
        "raw_text": best_text,
        "confidence": round(combined, 3),
        "ocr_confidence": round(float(best_conf), 3),
        "valid_format": canonical is not None,
    }
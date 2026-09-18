"""Name-based compatibility with DADIS's documented taxonomy, not its missing weights."""
from hashlib import sha256
import math
from pathlib import Path

ROAD_VEHICLES = frozenset({'car', 'motorcycle', 'bus', 'truck', 'bicycle'})
CONTEXT_OBJECTS = frozenset({'person', 'rider', 'train', 'traffic light', 'traffic sign', 'stop sign'})
ALIASES = {'motor': 'motorcycle', 'motorbike': 'motorcycle', 'bike': 'bicycle'}
# Exact packaged Ultralytics checkpoint identity; filenames alone do not prove provenance.
BUNDLED_SHA256 = 'f59b3d833e2ff32e194b5bb8e08d211dc7c5bdf144b90d2c8412c47ccfc83b36'


def canonical_name(name):
    name = ' '.join(str(name).strip().lower().replace('_', ' ').replace('-', ' ').split())
    return ALIASES.get(name, name)


def selected_class_ids(names):
    entries = names.items() if isinstance(names, dict) else enumerate(names)
    chosen = [int(i) for i, name in entries if canonical_name(name) in ROAD_VEHICLES | CONTEXT_OBJECTS]
    mapping = dict(names) if isinstance(names, dict) else dict(enumerate(names))
    if not any(canonical_name(mapping[i]) in ROAD_VEHICLES for i in chosen):
        raise ValueError('Traffic weights contain no recognised road-vehicle classes; check model.names.')
    return chosen


def vehicle_count(counts):
    # Riders may overlap their bicycle/motorcycle. Trains are not road traffic.
    return sum(counts.get(name, 0) for name in ROAD_VEHICLES)


def model_identity(path):
    digest = sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    checksum = digest.hexdigest()
    description = ('Bundled COCO YOLOv8n — fallback, not DADIS weights' if checksum == BUNDLED_SHA256
                   else 'User-supplied YOLO weights — training provenance not verified')
    return {'sha256': checksum, 'description': description}


def inference_settings(config, environment):
    confidence = float(environment.get('TRAFFIC_CONFIDENCE', config['confidence']))
    raw_size = environment.get('TRAFFIC_IMGSZ', config['imgsz'])
    size = int(raw_size)
    if not math.isfinite(confidence) or not 0 < confidence <= 1:
        raise ValueError('TRAFFIC_CONFIDENCE must be in (0, 1].')
    if size < 32 or size > 1280 or float(raw_size) != size:
        raise ValueError('TRAFFIC_IMGSZ must be an integer from 32 to 1280.')
    return confidence, size

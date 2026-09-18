"""Print the actual checkpoint identity/classes and optionally test one recorded frame."""
import argparse
import json
from pathlib import Path
import sys
from edge.runtime import load_config
from edge.traffic_labels import model_identity, selected_class_ids, canonical_name


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path, help='Explicit checkpoint; otherwise use configured traffic model')
    parser.add_argument('--test-frame', action='store_true')
    args = parser.parse_args()
    config = load_config()
    path = args.model.expanduser().resolve() if args.model else Path(config['traffic_model'])
    report = {'path': str(path), 'dadis_weights_included': False}
    try:
        if not path.is_file():
            raise FileNotFoundError(f'Missing checkpoint: {path}. No automatic substitution is performed.')
        from ultralytics import YOLO
        model = YOLO(str(path))
        if model.task != 'detect':
            raise ValueError('This is not an object-detection checkpoint.')
        ids = selected_class_ids(model.names)
        report.update(model_identity(path), classes=model.names, selected_class_ids=ids,
                      normalized_classes={i: canonical_name(model.names[i]) for i in ids})
        if args.test_frame:
            import cv2
            import torch
            from edge.traffic_labels import inference_settings
            import os
            capture = cv2.VideoCapture(config['traffic_video'])
            try:
                ok, frame = capture.read()
                if not ok:
                    raise RuntimeError('Cannot decode the configured traffic video')
                device = config['device']
                if device == 'auto': device = '0' if torch.cuda.is_available() else 'cpu'
                confidence, size = inference_settings(config, os.environ)
                result = model.track(frame, persist=True, tracker='bytetrack.yaml', classes=ids,
                                     conf=confidence, imgsz=size, device=device,
                                     half=device != 'cpu', verbose=False)[0]
                report.update(first_frame_detections=len(result.boxes), timing_ms=result.speed,
                              device=device, confidence=confidence, image_size=size,
                              note='One cold frame, not an accuracy or sustained-FPS benchmark')
            finally:
                capture.release()
        print(json.dumps(report, indent=2))
        return 0
    except Exception as exc:
        report['error'] = str(exc)
        print(json.dumps(report, indent=2))
        return 1


if __name__ == '__main__':
    sys.exit(main())

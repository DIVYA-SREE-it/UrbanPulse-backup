"""Run on the demo laptop before starting services; prints only measured values."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
from edge.runtime import load_config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inference', action='store_true', help='Run one measured frame per available camera')
    args = parser.parse_args()
    config = load_config()
    problems = []
    output = {'cameras':{}, 'python':sys.version, 'gps_source':'SIMULATED_ROUTE'}
    try:
        import cv2
        import torch
        from ultralytics import YOLO
    except ImportError as exc:
        print(json.dumps({'error':str(exc), 'action':'Install backend/requirements.txt in this Python environment'},indent=2))
        return 1
    output.update(torch_version=torch.__version__, cuda_available=torch.cuda.is_available(),
                  torch_cuda_build=torch.version.cuda)
    if torch.cuda.is_available():
        output['gpu'] = torch.cuda.get_device_name(0)
    device = ('0' if torch.cuda.is_available() else 'cpu') if config['device']=='auto' else config['device']
    cv2.setNumThreads(1)
    torch.set_num_threads(config['cpu_threads'])
    hashes = []
    for kind in ('road','traffic'):
        record = {}
        try:
            model_path, video_path = Path(config[f'{kind}_model']), Path(config[f'{kind}_video'])
            for path in (model_path,video_path):
                if not path.is_file(): raise FileNotFoundError(str(path))
            hashes.append(hashlib.sha256(video_path.read_bytes()).hexdigest())
            model = YOLO(str(model_path))
            record['classes'] = model.names
            cap = cv2.VideoCapture(str(video_path))
            try:
                if not cap.isOpened(): raise RuntimeError(f'Cannot open {video_path}')
                record.update(width=cap.get(cv2.CAP_PROP_FRAME_WIDTH),height=cap.get(cv2.CAP_PROP_FRAME_HEIGHT),
                              source_fps=cap.get(cv2.CAP_PROP_FPS),frames=cap.get(cv2.CAP_PROP_FRAME_COUNT))
                ok,frame=cap.read()
                if not ok: raise RuntimeError('Cannot decode first video frame')
                if args.inference:
                    params=dict(imgsz=config['imgsz'],conf=config['confidence'],device=device,half=device!='cpu',verbose=False)
                    if kind=='traffic':
                        result=model.track(frame,persist=True,tracker='bytetrack.yaml',**params)[0]
                    else:
                        result=model.predict(frame,**params)[0]
                    record['first_frame_timing_ms']=result.speed
                    record['first_frame_detections']=[{'class':result.names[int(b.cls.item())],
                        'confidence':float(b.conf.item())} for b in result.boxes]
                    record['timing_note']='Single cold-start frame; not sustained dual-camera performance'
                del model
                if torch.cuda.is_available(): torch.cuda.empty_cache()
            finally:
                cap.release()
            record['status']='passed'
        except Exception as exc:
            record.update(status='failed',error=str(exc))
            problems.append(f'{kind}: {exc}')
        output['cameras'][kind]=record
    if len(hashes)==2 and hashes[0]==hashes[1]:
        problems.append('Both video files contain identical bytes; supply independent recordings')
    output['problems']=problems
    print(json.dumps(output,indent=2))
    return 1 if problems else 0


if __name__=='__main__':
    raise SystemExit(main())

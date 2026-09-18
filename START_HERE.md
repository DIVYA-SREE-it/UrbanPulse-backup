# Original UrbanPulse with DADIS detector compatibility

## What this is — and what it is not

A separate copy of the original September 11 UrbanPulse-SIH26124-integration source, before the GPS, ESP32, GIS and simplified-UI upgrades. Original sidebar, pages, map, reports and scenario area remain. Only the traffic worker's class handling and small text/counters inside the existing traffic panel change.

The DADIS repository and PDF DO NOT provide yolo_detector.pt. This package therefore includes the original COCO yolov8n.pt checkpoint as an explicitly labelled fallback. It is NOT DADIS's trained detector and is not claimed to reproduce the paper's results. A PDF cannot be converted into trained weights. No model has been trained here.

## What the PDF establishes

Source repository inspected at commit 9c3a244fa0ed39c0c104a79e51ea954cd8c75ec0:
https://github.com/Abrar0703/DADIS---Driver-Assistance-Decision-Intelligence-System

Paper:
https://github.com/Abrar0703/DADIS---Driver-Assistance-Decision-Intelligence-System/blob/9c3a244fa0ed39c0c104a79e51ea954cd8c75ec0/DADIS.pdf

- Page 7: ten classes — bus, traffic light, traffic sign, person, bike, truck, motor, car, train, rider. These are not COCO's class IDs.
- Page 13: object detector described only as YOLO-based, 640 input, 100 epochs, AdamW, 8,000 training and 2,000 validation images. This is insufficient to reproduce the trained model without the exact architecture, data, labels and weights.
- Pages 14–15: object accuracy tables are blank; do not reuse or invent an accuracy score.
- Lane segmentation is a separate YOLOv8n-Seg model, also absent from the repository. This package does not add lane segmentation, monocular distance, collision probability or braking advice.
- DADIS object_detection.py uses a confidence cutoff of 0.18. Lowering a threshold is not a demonstrated accuracy improvement. This package preserves the original 0.35 default and permits a traffic-only override.

## Implemented changes

- Dynamic class selection from actual model.names, with bike -> bicycle and motor -> motorcycle normalization.
- Road-vehicle count includes car, motorcycle, bus, truck and bicycle. Riders are not counted again on top of their vehicles. People, trains and signs remain contextual detections.
- Available traffic signs, stop signs, riders and trains can be annotated when the loaded weights genuinely support them. The bundled COCO fallback does not have DADIS's separate rider or generic traffic-sign class; no such detections are fabricated.
- Existing ByteTrack IDs, congestion windows, event cooldowns, offline outbox and central APIs are reused.
- Checkpoint SHA-256 and provenance description appear in status; traffic congestion events include them too.
- The traffic panel explicitly identifies bundled fallback weights. Custom weights are identified as user-supplied, not automatically claimed authentic DADIS weights.
- Invalid or missing explicitly selected weights stop that traffic worker with an error. The application does not silently substitute another model.
- Road model, labels and inference path are unchanged.

Modified existing files:
- fleetbus/backend/edge/runtime.py — traffic taxonomy, identity and per-traffic inference parameters.
- fleetbus/src/components/camera/EdgeCameraPanels.jsx — contextual counters and model provenance in existing panel.
New files:
- fleetbus/backend/edge/traffic_labels.py — pure class-mapping and validation helpers.
- fleetbus/backend/inspect_traffic_model.py — actual checkpoint/class check and optional one-frame inference.
- fleetbus/backend/tests/test_traffic_labels.py — taxonomy/counting/configuration regression tests.

## Create your runnable separate copy

Extract this ZIP under /home/ayesha/Downloads. It contains the directory UrbanPulse-DADIS-compatible.

Stop your old frontend/backend/edge processes with Ctrl+C to free ports 5173/8000/8001. The next command only READS your existing project. It writes a new sibling directory named fleetbus-dadis. It imports your configured road weights and both local recordings. No existing source, model, video or database is changed. The new copy has its own initially empty event database. Original labelled sample UI content remains as part of the old UI; it is not evidence of model capability.

```bash
cd /home/ayesha/Downloads/UrbanPulse-DADIS-compatible
python3 create_copy.py /home/ayesha/Desktop/fleetbus --check
python3 create_copy.py /home/ayesha/Desktop/fleetbus
```

If the destination already exists, the script refuses to overwrite it. Choose a different sibling with --destination if needed. If model/video files are missing, the script stops before copying; point the existing config at the actual files first.

Terminal 1 — central backend (reuse your working virtual environment):
```bash
cd /home/ayesha/Desktop/fleetbus-dadis
source /home/ayesha/Desktop/fleetbus/.venv/bin/activate
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Terminal 2 — independent road and traffic workers:
```bash
cd /home/ayesha/Desktop/fleetbus-dadis
source /home/ayesha/Desktop/fleetbus/.venv/bin/activate
unset EDGE_CONFIG ROAD_MODEL ROAD_VIDEO TRAFFIC_MODEL TRAFFIC_VIDEO TRAFFIC_CONFIDENCE TRAFFIC_IMGSZ
export AI_DEVICE=cpu
python -m uvicorn edge.main:app --app-dir backend --host 127.0.0.1 --port 8001
```
Use AI_DEVICE=auto instead when you want CUDA selected if available. CPU is explicit above for your current Linux machine. Environment cleanup prevents old configuration overrides from pointing this process at another project. This source does not include ESP32 live-source updates.

Terminal 3 — original frontend:
```bash
cd /home/ayesha/Desktop/fleetbus-dadis
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```
Open http://127.0.0.1:5173 and hard-refresh. Open Live Camera. Both independent panels should run when their dependencies, weights and recordings are available. All three terminal working directories must be fleetbus-dadis; an old process still running on these ports will prevent startup.

## Verify actual inference on your laptop

With edge stopped to avoid benchmarking multiple copies of the traffic model:
```bash
cd /home/ayesha/Desktop/fleetbus-dadis
source /home/ayesha/Desktop/fleetbus/.venv/bin/activate
export AI_DEVICE=cpu
python backend/inspect_traffic_model.py --test-frame
```
This prints actual loaded classes, checkpoint hash and one cold-frame timing. It is not an accuracy or dual-camera performance score. Restart edge afterward.

Check running metrics at http://127.0.0.1:8001/api/status. Verify both cameras report running, source_frame changes, vehicle counts reflect the footage and annotations align. Verify real qualifying road/congestion events appear in the original notification/map workflow; congestion is still a sustained count-based indicator, not measured traffic speed.

If you later obtain the actual DADIS detector:
```bash
export TRAFFIC_MODEL=/absolute/path/to/yolo_detector.pt
python backend/inspect_traffic_model.py --test-frame
```
Only after inspection succeeds, start the edge service in that same terminal with the same environment. Do not point it at lane_segmentor_culane.pt. Newer checkpoints may need an Ultralytics version compatible with their training environment; this package does not blindly upgrade your working dependencies.

Optional traffic-only experiment (restart edge; compare false positives as well as detections):
```bash
export TRAFFIC_CONFIDENCE=0.18
export TRAFFIC_IMGSZ=640
```
640 can increase CPU latency. These settings do not recover missing learned weights or guarantee improvement. Remove them with unset TRAFFIC_CONFIDENCE TRAFFIC_IMGSZ to use the original defaults.

## Validation performed here

- Python syntax compilation passed.
- Ten dependency-free unit tests passed: class-ID independence, aliases, context exclusion, bad taxonomy, traffic-only settings, cooldown persistence, retry delivery and parallel writes.
- Four FastAPI tests skipped because this workspace lacks its Python backend dependencies.
- Frontend production build: recorded in VALIDATION_DADIS.txt.
- No DADIS weights, no local Python ML runtime and no laptop access were available. Neither actual model inference nor accuracy nor GPU performance has been verified here.

## Rollback

Stop the three new services. Start the existing project from /home/ayesha/Desktop/fleetbus using its original commands. Its files were never overwritten.

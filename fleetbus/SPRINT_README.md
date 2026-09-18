# UrbanPulse dual-camera integration — implementation candidate

**Not yet a verified end-to-end demo.** The frontend production build and five dependency-free tests passed in the development environment. Python packages could not be downloaded there; FastAPI, YOLO, CUDA, live video annotation, and browser rendering have not been validated. The road model and road recording are absent from the supplied repositories. Supply them and run the laptop checks below.

## 1. Repository audit

Audited 11 September 2026:
- fleetbus: https://github.com/DIVYA-SREE-it/fleetbus at `dde81c6236eb54c72108293a038d37e493a6e732`.
- Traffic Intelligence: https://github.com/AyeshaSiddiqaK/SIH26124-Traffic-Intelligence at `132240bfe68c185ea4fabb5d59d9bfd352981a84`.

| Component | Repository | Actual source status | Reuse | Change |
|---|---|---|---|---|
| Frontend | fleetbus | React 18, Vite 5, Tailwind, Leaflet, Recharts; src/main.jsx → App.jsx; page selection in React context | Yes | Keep pages, navigation, theme |
| Live camera | fleetbus | src/pages/LiveCameraPage.jsx uses WebcamStream; legacy image/frame POST /predict and scenario simulation | Yes | Add two edge previews above retained collapsed legacy tools |
| Backend | fleetbus | FastAPI backend/app/main.py; /, /health, /predict; no event database | Yes | Preserve /predict; add central event ingestion and persistence |
| Road model | fleetbus | backend/app/model.py expects backend/models/best.pt; weights absent; .gitignore excludes *.pt | Loader architecture | Lazy legacy load; edge road worker loads supplied weights once |
| Road classes | fleetbus | /health hardcodes speed_bump,pothole,unpaved_road; this is not checkpoint inspection | No assumption | Obtain model.names at runtime; remove static health claim |
| Road source | fleetbus | No road MP4 committed | Missing | Supply backend/videos/road.mp4 |
| Event UI | fleetbus | UrbanPulseContext.jsx owns detection and notification arrays; NotificationDrawer opens ReportModal | Yes | Poll persistent central events; no random-bus/confidence fallbacks for edge events |
| GIS | fleetbus | LiveCityPage → GISMap; Leaflet markers; static congestion circles | Yes | Add traffic-congestion filtering and event metadata; label static examples |
| Analytics | fleetbus | Existing pages include imported sample statistics | Preserved | Global sample-data notice; no claim these charts are inferred from cameras |
| Traffic detector/tracker | Traffic Intelligence | vehicle_density.py loads yolov8n.pt once, uses ByteTrack with persist=True, conf=.35; class set car/motorcycle/bus/truck | Yes | Reuse model/tracker approach in bounded frame worker; also display person/bicycle |
| Traffic counting | Traffic Intelligence | congestion_level; rolling 30 processed frames; thresholds <=8 low, <=20 medium, >20 high | Yes | Reuse function; configurable wall-clock rolling window and event cooldown |
| Traffic signal | Traffic Intelligence | separate traffic_light_state.py detector plus classify_light_color HSV helper | Yes | Reuse HSV helper on traffic model's light crops; guard ambiguous mixed colors; no second detector |
| Violations | Traffic Intelligence | CLI --signal required; fixed stop line/direction; hardcoded event confidence; no camera-motion correction | Disabled | Not suitable for uncalibrated moving-bus enforcement |
| Traffic assets | Traffic Intelligence | yolov8n.pt, best_roboflow.pt, videos/bus1.mp4 present | YOLOv8n + video | Copy to fleetbus/backend/models and videos; sign model not used |
| Traffic video | Traffic Intelligence | H.264, 478×850, 3600/121 FPS, 446 frames, 15.024167 seconds; full FFmpeg decode succeeded | Yes | Portrait handled with object-contain; loops independently; observed footage is roadside |
| Existing traffic APIs | Traffic Intelligence | command_center/backend/main.py reads output/fleet_events.json, /api/events,/api/buses,/api/gps,/api/stats,/api/school-zone | Not merged | Avoid a second command-center UI and conflicting event schemas |
| GPS | Traffic Intelligence | in-memory/file GPS manager; multi_bus_runner interpolates sample Chennai route; defaults source LIVE despite simulated route | Route concepts | Reuse first route coordinates; shared bus clock; label SIMULATED_ROUTE |
| Multi-bus runner | Traffic Intelligence | multiprocessing, unbounded event queue/list, JSON rewrite; three bus configs but only bus1.mp4 present | Concepts only | Single BUS-104 with two independent workers and durable outbox |
| Dependencies | Both | fleetbus has no Python requirements; traffic requirements omit FastAPI/uvicorn | Merge minimum | Add backend requirements; omit EasyOCR and extra training packages |

## 2. What is implemented

- Existing app layout, sidebar, page switcher, map, notification drawer, report workflow and scenario components retained.
- Side-by-side road and traffic edge previews on desktop; stacked on small screens. The video source files must differ.
- Two independent camera threads, one model per camera, native-frame inference through Ultralytics letterboxing, native-coordinate result.plot annotations, aspect-preserving display resize.
- CUDA auto-selection, GPU FP16, configurable 416 model size and 12 processed FPS target. These are settings, not measured achievements.
- File playback follows a per-camera monotonic clock. Stale source frames are skipped; no decoded-frame backlog. Different durations loop independently; tracker resets at loop boundaries.
- Traffic counts by detected class, ByteTrack IDs where available, configurable smoothed vehicle-count congestion heuristic.
- Signal color from actual detector crops and reused HSV rules. Multiple conflicting signal states or mixed-color aspects are UNKNOWN. It is not lane/signal association.
- ROAD_OBSERVATION events preserve the actual checkpoint class name, box and detector confidence. Severity is a prototype review priority, not measured depth or danger.
- TRAFFIC_CONGESTION events only after sustained MEDIUM/HIGH count levels. Confidence is null because this is a rule, not a calibrated congestion model.
- Shared bus route clock, UTC observation timestamp, source-video timestamp/frame, BUS-104, FRONT_CAMERA / TRAFFIC_CAMERA, SIMULATED_ROUTE labels.
- SQLite outbox, configurable cooldown persisted across restart, retries with backoff; stable UUID across retries; central idempotent insertion.
- Optional event-only JPEG evidence. Continuous video goes to the local preview endpoint, not the central backend.
- Central SQLite event history, cursor-based API, persistent ordered status workflow; new events populate existing detections, notifications, incident center and GIS marker UI.
- Existing examples are labelled SAMPLE or SIMULATED; no fabricated runtime confidence for congestion in map/log/incident/dashboard event rows.

## 3. What is missing or deliberately disabled

**Blocking full completion:** trained road weights, independent road video, Python runtime validation, real CUDA/dual-stream benchmark, and a browser check on the laptop.

- No claimed road model classes until `preflight.py` loads your actual checkpoint.
- No measured FPS/VRAM/latency from the RTX 4050 yet. /api/status will report actual inference and playback metrics when running.
- The included traffic clip is a short roadside view. It is a camera replay, not evidence of a bus-mounted field deployment. Low vehicle counts may never exceed the default congestion threshold. No event is invented if this happens.
- Counts do not measure km/h, actual road occupancy, traffic flow, queue length or bottlenecks. Thresholds are prototype rules, not an official standard.
- No red-light or wrong-way violation events from an uncalibrated moving camera. Persistent image-space IDs are insufficient to remove camera-motion effects or identify governing signals.
- No hit-and-run, rash-driving classifier, plate recognition, school context or new road-class training integrated in this sprint.
- Road deduplication is per camera and class cooldown. It can suppress separate same-class defects within that cooldown; it is not geospatial object identity.
- Track IDs are local to the camera session/loop, not global vehicle identities. Skipping frames can reduce tracking continuity.
- Event coordinates are the simulated bus position, not surveyed coordinates of a distant defect/vehicle; the route is not a ground-truth GPS trace for these videos.
- Historical sample charts are retained, not converted into live camera analytics. Workflow state for edge events persists; legacy simulated incidents remain frontend memory. Notification read flags are session-local.
- This is a local prototype: no production authentication, fleet device provisioning, retention policy or hardened ingestion service. Offline queue remains on disk until delivery; storage monitoring/retention is an extension.
- Map tiles still require external access; offline buffering does not create offline basemaps.

## 4. One-day priorities

| Priority | Action |
|---|---|
| MUST FIX TODAY | Provide road best.pt and road.mp4; install dependencies; verify both workers and actual detector boxes; confirm a genuine event reaches notification and map |
| MUST FIX TODAY | Run on RTX 4050; record runtime status; verify no growing lag and inspect both aspect ratios |
| SHOULD DO | Test backend stop/restart and queue replay; review evidence and event cooldown on actual videos |
| ONLY IF TIME | School-zone context with a trusted dataset; calibrated fixed-camera signal association |
| SKIP | Moving-bus red-light/wrong-way enforcement without ego-motion and lane calibration; ANPR, hit-and-run, new model training, cloud redesign |

## 5. Architecture and ports

Two independent recordings → two long-lived local YOLO workers in ONE edge process → native-coordinate annotation and metrics → important-event rules → shared simulated bus route + UTC time → SQLite edge outbox → HTTP event POST → existing FastAPI central process → SQLite → existing React context → existing notifications / reports / GIS.

| Process | Command from backend | Role |
|---|---|---|
| Central, 8000 | python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 | Important events, SQLite, evidence, existing /predict compatibility |
| Edge, 8001 | python -m uvicorn edge.main:app --host 127.0.0.1 --port 8001 | Two independent video workers and local previews |
| Frontend, 5173 | npm run dev from fleetbus root | Original UrbanPulse UI |

Do not run the edge service with --reload or multiple workers: each process would start another pair of models. The old /predict path is retained for legacy uploads and loads an additional road model if used; keep the collapsed legacy tools closed during the dual-camera demo.

Central endpoints: GET /health, POST /predict, POST /api/events, GET /api/events?after=0&limit=200, GET /api/congestion, PATCH /api/events/{UUID}/status, /evidence/{UUID}.jpg.

Edge endpoints: GET /api/status, GET /api/live/road, GET /api/live/traffic.

## 6. Exact files

See CHANGEBOOK.md for the full file inventory, one-sentence purpose, complete contents of every changed/new source file, and validation command for each group. Original untouched files are included in the package. ROAD_MODEL and ROAD_VIDEO must be supplied; the included traffic weights/video are copied from the audited traffic repository.

## 7. Implementation step 1: resolve road assets, then run

Extract the ZIP into a NEW folder. Do not overwrite your only working project copy. Open the extracted `fleetbus` directory in VS Code. All following commands start from that directory; it contains package.json and backend.

1. Copy your existing trained road weights to `backend\models\best.pt` and your independent road recording to `backend\videos\road.mp4`. Do not rename traffic weights to best.pt to conceal a missing road model.
2. Confirm assets:

```powershell
Test-Path .\backend\models\best.pt
Test-Path .\backend\videos\road.mp4
Test-Path .\backend\models\yolov8n.pt
Test-Path .\backend\videos\traffic.mp4
```

All four should return True. False identifies a missing file; no code change can replace a trained road checkpoint.

3. Use an existing venv if available. In a fresh extracted copy:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
npm ci
.\.venv\Scripts\python.exe .\backend\preflight.py --inference
```

No activation script is required. If using another existing environment, replace only `.\.venv\Scripts\python.exe` with its actual Python executable. The pinned PyTorch baseline is chosen to match the repository's Ultralytics 8.3.0 loader; it is not claimed to be the latest release. Do not upgrade PyTorch independently during the sprint. If your existing road checkpoint requires another Ultralytics version, preserve the compatible environment and paste the exact load error before changing the model.

Expected preflight: cuda_available true; GPU name corresponding to RTX 4050; two passed camera records; actual `classes` printed from both weights. The command exits 1 if anything is missing or fails. Cold first-frame timing is not sustained FPS. With no CUDA, auto uses CPU and prints that fact; use AI_DEVICE=0 to require GPU and fail rather than silently accept CPU.

4. Start in three VS Code PowerShell terminals (each initially at fleetbus root).

Terminal 1:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir .\backend --host 127.0.0.1 --port 8000
```
Terminal 2:
```powershell
$env:AI_DEVICE = "0"
.\.venv\Scripts\python.exe -m uvicorn edge.main:app --app-dir .\backend --host 127.0.0.1 --port 8001
```
Terminal 3:
```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://localhost:5173 and select Live Camera. Root-relative `setup-windows.ps1` and `start-demo.ps1` are included as conveniences if PowerShell script execution is already enabled. The manual commands do not require changing execution policy.

5. Verify model readiness, real measurements and events in another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health | ConvertTo-Json -Depth 6
Invoke-RestMethod http://127.0.0.1:8001/api/status | ConvertTo-Json -Depth 10
Invoke-RestMethod "http://127.0.0.1:8000/api/events?after=0&limit=20" | ConvertTo-Json -Depth 10
nvidia-smi
```

Central health is not proof that models work. Both edge camera statuses must be `running`, their source_frame values must advance, boxes/counts must be video-derived, and the UI should remain responsive.

6. Run regression checks and build:

```powershell
Push-Location .\backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
Pop-Location
npm run build
```

Expected with installed requirements: all nine tests run without skips. Tests create isolated fixtures in temporary storage; they do not inject demonstration events. A skipped FastAPI test is not a pass.

7. Event demonstration:

Wait for a true road observation or sustained medium/high vehicle count. Check notification → open report → inspect camera, UTC timestamp, simulated GPS, source frame, confidence/method → Map → Congestion Events or All Layers → marker → same UUID and metadata. The UI polls new events every 1.5 seconds after a successful response; no fixed end-to-end latency is guaranteed.

If this short traffic recording stays below the thresholds, the correct result is LOW with no congestion alert. Use a genuinely crowded independent traffic video, or explicitly justify/configure thresholds for the camera's field of view. Do not present artificial settings as evidence of city congestion.

8. Offline test:

Stop only central Terminal 1 with Ctrl+C, leave the edge service running, wait for a real event, inspect outbox.pending_events. Restart central with the same command. Pending events should clear after acknowledgement and appear once centrally. Retry delay grows up to 30 seconds. Restart central again; previous events and edge workflow status should remain in backend/data/events.sqlite3.

9. Performance:

Read each camera's inference_ms, prediction_wall_ms, processed_fps, frame_age_ms, processing_latency_ms, playback_lag_ms and skipped_frames. Frames and boxes are aligned at the original source size before the entire annotation is resized. Container aspect ratios remain fixed and the image uses object-contain. If lag grows, lower imgsz/target_fps in backend/edge/config.json, restart only the edge process, and remeasure. No per-camera GPU utilization claim is made; nvidia-smi measures process/device resources.

## Demo wording

We run two independent camera replays through separate local edge inference workers. The road camera uses the classes actually available in its trained checkpoint. The traffic camera detects and tracks vehicles and evaluates configurable density rules. Important observations become timestamped events with bus and camera IDs, simulated route coordinates and optional evidence. Events are buffered locally and synchronized into the existing UrbanPulse GIS and notification workflow. The live previews are local demonstration views; the central platform does not require continuous raw video transmission. Advanced moving-bus violation and incident intelligence remains an extension.

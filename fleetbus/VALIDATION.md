# Verification record — 11 September 2026

## Passed in this environment

- Git source revisions resolved and both repositories cloned.
- Inspected React entry/page/context, legacy camera worker and prediction clients, map filters/popups, notification/report flows, FastAPI source, traffic runner/config/HSV/violations/GPS/multi-bus source, dependencies and assets.
- No road `.pt` or MP4 exists in fleetbus checkout. The static /health class list cannot establish trained model classes.
- Traffic source full FFmpeg decode completed without reported errors. ffprobe: H.264, 478×850, 3600/121 FPS, 446 frames, 15.024167 seconds.
- React Vite production build passed after changes. Existing large-bundle warning remains; no dependency upgrades or chart rewrites were made to chase that warning.
- Python compileall passed.
- git diff --check passed.
- Five dependency-free tests passed: cooldown survives restart; expired cooldown permits a new observation; failed HTTP delivery retains data and successful retry clears it using the same UUID; concurrent road/traffic writers preserve both events; shared simulated-route clock loops correctly.

## Not verified — do not call these passed

- Four FastAPI tests skipped because FastAPI/httpx/multipart are not installed. Test source is included for the laptop: health without weights; idempotent ingestion/cursor/persistence; schema rejection of invalid GPS/timezone; persisted ordered workflow.
- Python dependency installation failed at the environment network approval boundary ("network approval was cancelled before a decision was returned"). No GPU/CPU model runtime was available.
- Browser QA failed at environment navigation boundary: ERR_BLOCKED_BY_CLIENT for the permitted local preview. No screenshot or rendered UI verification is claimed.
- Neither original project's Python inference entrypoint was executed. Neither integrated camera was executed with YOLO. Road model class names remain unverified because weights are absent.
- No actual detector event → central API → notification/map browser test completed.
- CUDA availability, GPU memory, processed FPS, inference ms and end-to-end latency on the target laptop remain unmeasured.
- PowerShell launch/setup scripts have not been executed on Windows.

## Acceptance remaining on the laptop

1. Supply independent road.mp4 and the actual trained best.pt.
2. Install backend packages and CUDA-compatible PyTorch; run preflight.py --inference; record actual model.names and device.
3. Run all nine tests without skips; run npm run build.
4. Start central, edge, frontend; both camera states must become running.
5. Verify annotations follow objects in both differently shaped videos; inspect vehicle counts/IDs as video advances.
6. Wait for a real qualifying event; inspect its UUID, GPS source, source frame/time, camera and bus metadata in API, notification, report and map.
7. Stop/restart central while edge continues; ensure queued events survive and sync once.
8. Observe at least several full video loops; record /api/status and nvidia-smi. Reject a demo where latency continually grows or models report errors.

The package is an integration implementation candidate, not a completed hardware-validated SIH prototype.

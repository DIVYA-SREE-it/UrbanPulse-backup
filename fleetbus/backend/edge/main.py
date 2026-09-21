"""Local demonstration previews. Central service receives events, not these streams."""
import time
from pathlib import Path

import cv2
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from edge.runtime import EdgeRuntime

runtime = None

BASE = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE / "videos" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_VIDEOS = {
    "road": BASE / "videos" / "road.mp4",
    "traffic": BASE / "videos" / "traffic.mp4",
}


@asynccontextmanager
async def lifespan(app):
    global runtime
    runtime = EdgeRuntime()
    runtime.start()
    yield
    runtime.close()


app = FastAPI(title="UrbanPulse Bus Edge Preview", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/status")
def status():
    return runtime.status()

@app.post("/api/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    camera: str = Form(...),
):
    if camera not in ("road", "traffic"):
        return {
            "ok": False,
            "error": "camera must be road or traffic",
        }

    original_name = Path(file.filename or "upload.mp4").name

    target = (
        UPLOAD_DIR
        / f"{int(time.time() * 1000)}_{original_name}"
    )

    try:
        with target.open("wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                output.write(chunk)

        cap = cv2.VideoCapture(str(target))

        if not cap.isOpened():
            cap.release()
            target.unlink(missing_ok=True)

            return {
                "ok": False,
                "error": "Unsupported or unreadable video",
            }

        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        cap.release()

        if frames <= 0 or fps <= 0:
            target.unlink(missing_ok=True)

            return {
                "ok": False,
                "error": "Video has invalid frame metadata",
            }

        runtime.config[f"{camera}_video"] = str(target)

        runtime.restart_worker(camera)

        return {
            "ok": True,
            "filename": original_name,
            "camera": camera,
            "frames": frames,
            "fps": round(fps, 2),
            "width": width,
            "height": height,
        }

    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
        }


@app.post("/api/reset-video")
def reset_video(camera: str):
    if camera not in ("road", "traffic"):
        return {
            "ok": False,
            "error": "camera must be road or traffic",
        }

    default_video = DEFAULT_VIDEOS[camera]

    if not default_video.is_file():
        return {
            "ok": False,
            "error": f"Default video missing: {default_video}",
        }

    runtime.config[f"{camera}_video"] = str(default_video)

    runtime.restart_worker(camera)

    return {
        "ok": True,
        "camera": camera,
        "message": f"{camera} reverted to default video",
    }


@app.get("/api/live/{camera}")
async def live(camera: str):
    worker = runtime.workers.get(camera)
    if worker is None:
        raise HTTPException(404, "Unknown camera")
    if worker.snapshot()["status"] == "error":
        raise HTTPException(503, worker.snapshot()["error"])

    async def frames():
        last = -1
        while not worker.stop.is_set():
            with worker.lock:
                jpeg, sequence = worker.jpeg, worker.sequence
                failed = worker.state["status"] == "error"
            if failed:
                break
            if jpeg is not None and sequence != last:
                last = sequence
                yield (b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " +
                       str(len(jpeg)).encode() + b"\r\n\r\n" + jpeg + b"\r\n")
            await asyncio.sleep(0.04)

    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame",
                             headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})

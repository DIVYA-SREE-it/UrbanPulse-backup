"""Local demonstration previews. Central service receives events, not these streams."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from edge.runtime import EdgeRuntime

runtime = None


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

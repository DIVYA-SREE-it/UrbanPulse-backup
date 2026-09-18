from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.schemas import PredictionResponse
from app.events import router, EVIDENCE
from app.model import BASE_DIR, MODEL_PATH

RESULTS = BASE_DIR / "results"
RESULTS.mkdir(exist_ok=True)
app = FastAPI(title="UrbanPulse Central Event Backend", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=[f"http://{host}:{port}" for host in ("localhost", "127.0.0.1")
                   for port in (5173, 5174)],
    allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
app.mount("/results", StaticFiles(directory=str(RESULTS)), name="results")
app.mount("/evidence", StaticFiles(directory=str(EVIDENCE)), name="evidence")
app.include_router(router)


@app.get("/")
def root():
    return {"message": "UrbanPulse central event backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "central-events",
            "road_model_present": MODEL_PATH.is_file(),
            "note": "Camera model classes and readiness are reported by edge /api/status"}


@app.post("/predict", response_model=PredictionResponse)
def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(400, "Only JPG and PNG images are supported")
    try:
        from app.services.inference import run_inference
        return run_inference(file)
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.schemas import PredictionResponse
from app.events import router, EVIDENCE
from app.model import MODEL_PATH


app = FastAPI(
    title="UrbanPulse Central Event Backend",
    version="2.0.0"
)


# Allow the React frontend on localhost / 127.0.0.1
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Central event API
app.include_router(router)


# Serve captured evidence images
EVIDENCE.mkdir(parents=True, exist_ok=True)

app.mount(
    "/evidence",
    StaticFiles(directory=str(EVIDENCE)),
    name="evidence"
)


@app.get("/")
def root():
    return {
        "message": "UrbanPulse central event backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "central-events",
        "road_model_present": MODEL_PATH.is_file(),
        "note": "Camera model classes and readiness are reported by edge /api/status"
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=400,
            detail="Only JPG and PNG images are supported"
        )

    try:
        from app.services.inference import run_inference
        return run_inference(file)

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc)
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        ) from exc
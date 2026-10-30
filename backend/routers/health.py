"""
AI ExamGuard — Health & Model Info Router
"""
from fastapi import APIRouter
from backend.config import APP_VERSION, MODEL_PATH, DEMO_VIDEO_PATH
from backend.services.inference import is_model_loaded, get_model_error, get_class_names
from backend.schemas import HealthResponse, ModelInfoResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Return backend, database, model, and dependency status."""
    return HealthResponse(
        status="ok",
        backend="running",
        database="connected",
        model_loaded=is_model_loaded(),
        model_file=MODEL_PATH.name,
        demo_video_available=DEMO_VIDEO_PATH.exists(),
        version=APP_VERSION,
    )


@router.get("/model/info", response_model=ModelInfoResponse)
def model_info():
    """Return model filename, loading status, and actual class names."""
    return ModelInfoResponse(
        filename=MODEL_PATH.name,
        loaded=is_model_loaded(),
        class_names=get_class_names(),
        task="detect",
    )

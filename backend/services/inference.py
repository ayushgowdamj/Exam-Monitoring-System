"""
AI ExamGuard — YOLO Model Inference Service

Loads the existing best.pt model ONCE and provides inference methods.
The model produces object-level detections with bounding boxes.
Class 0 = cheating, Class 1 = non-cheating.
"""
import logging
from pathlib import Path
from typing import Optional

import numpy as np

from backend.config import MODEL_PATH

logger = logging.getLogger(__name__)

# ─── Singleton model holder ────────────────────────────
_model = None
_model_loaded = False
_model_error: Optional[str] = None
_class_names: dict = {}


def load_model():
    """Load the YOLO model once at application startup."""
    global _model, _model_loaded, _model_error, _class_names

    if _model_loaded and _model is not None:
        return

    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        _model_error = f"Model file not found: {model_path}"
        logger.error(_model_error)
        return

    try:
        from ultralytics import YOLO
        logger.info(f"Loading YOLO model from {model_path} ...")
        _model = YOLO(str(model_path))
        _class_names = _model.names if hasattr(_model, "names") else {0: "cheating", 1: "non-cheating"}
        _model_loaded = True
        _model_error = None
        logger.info(f"Model loaded successfully. Classes: {_class_names}")
    except Exception as exc:
        _model_error = str(exc)
        _model_loaded = False
        logger.exception("Failed to load YOLO model")


def get_model():
    """Return the loaded model instance (or None)."""
    return _model


def is_model_loaded() -> bool:
    return _model_loaded


def get_model_error() -> Optional[str]:
    return _model_error


def get_class_names() -> dict:
    return dict(_class_names)


def run_inference(frame: np.ndarray, confidence_threshold: float = 0.25):
    """
    Run inference on a single frame.

    Returns the raw YOLO result object (first element of results list).
    The caller uses sv.Detections.from_ultralytics() to extract detections.
    """
    if _model is None:
        raise RuntimeError("Model is not loaded")

    results = _model(frame, verbose=False, conf=confidence_threshold)
    return results[0]

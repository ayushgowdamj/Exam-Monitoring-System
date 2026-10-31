"""
AI ExamGuard — Application Configuration
"""
import os
from pathlib import Path

# Project root: the AI-Exam-Monitor directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Path to the existing trained model (NEVER modify this file)
MODEL_DIR = PROJECT_ROOT / "Detecting-Cheating-with-computer-vision-Real-Time-Exam-Hall-Monitoring"
MODEL_PATH = MODEL_DIR / "best.pt"

# Demo video
DEMO_VIDEO_PATH = PROJECT_ROOT / "demo.mp4"

# Storage directories
UPLOAD_DIR = PROJECT_ROOT / "uploads"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Database
DATABASE_URL = f"sqlite:///{PROJECT_ROOT / 'examguard.db'}"

# Processing defaults
DEFAULT_CONFIDENCE_THRESHOLD = 0.25
MAX_UPLOAD_SIZE_MB = 500
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}

# CORS
FRONTEND_ORIGIN = os.getenv("FRONTEND_URL", "http://localhost:5173")

# App metadata
APP_NAME = "AI ExamGuard"
APP_VERSION = "1.0.0"
APP_TAGLINE = "Smarter Monitoring. Fairer Examinations."

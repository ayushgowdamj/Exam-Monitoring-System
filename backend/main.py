"""
AI ExamGuard — FastAPI Application Entry Point

Smarter Monitoring. Fairer Examinations.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import APP_NAME, APP_VERSION, APP_TAGLINE, FRONTEND_ORIGIN
from backend.database import init_db
from backend.services.inference import load_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"Starting {APP_NAME} v{APP_VERSION} — {APP_TAGLINE}")

    # Initialize database
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized.")

    # Load YOLO model (once)
    logger.info("Loading YOLO model...")
    load_model()
    logger.info("Model loading complete.")

    yield

    logger.info(f"{APP_NAME} shutting down.")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_TAGLINE,
    lifespan=lifespan,
)

# CORS — allow Vite frontend, local development, and Vercel domains
cors_origins = [
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from backend.routers import health, videos, sessions, events, analytics, cameras, live  # noqa: E402

app.include_router(health.router)
app.include_router(videos.router)
app.include_router(sessions.router)
app.include_router(events.router)
app.include_router(analytics.router)
app.include_router(cameras.router)
app.include_router(live.router)


@app.get("/")
def root():
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "tagline": APP_TAGLINE,
        "docs": "/docs",
    }

"""
AI ExamGuard — Video Management & Analysis Router
"""
import os
import uuid
import threading
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.config import (
    UPLOAD_DIR, OUTPUT_DIR, DEMO_VIDEO_PATH,
    MAX_UPLOAD_SIZE_MB, ALLOWED_VIDEO_EXTENSIONS, DEFAULT_CONFIDENCE_THRESHOLD,
)
from backend.database import get_db
from backend.models import VideoJob
from backend.schemas import (
    DemoVideoResponse, VideoUploadResponse, AnalyzeRequest,
    JobStatusResponse, JobResultResponse,
)
from backend.services.inference import is_model_loaded
from backend.services.video_processor import (
    process_video_background, resolve_video_path, cancel_job,
)

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("/demo", response_model=DemoVideoResponse)
def get_demo_video():
    """Return information about demo.mp4 if it exists."""
    if DEMO_VIDEO_PATH.exists():
        return DemoVideoResponse(
            available=True,
            filename="demo.mp4",
            size_bytes=DEMO_VIDEO_PATH.stat().st_size,
            url="/api/videos/serve/demo.mp4",
        )
    return DemoVideoResponse(available=False)


@router.get("/serve/{filename}")
def serve_video(filename: str):
    """Serve a video file (demo, uploaded, or output)."""
    # Prevent path traversal
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Check demo
    if safe_name == "demo.mp4" and DEMO_VIDEO_PATH.exists():
        return FileResponse(
            str(DEMO_VIDEO_PATH),
            media_type="video/mp4",
            filename=safe_name,
        )

    # Check uploads
    upload_path = UPLOAD_DIR / safe_name
    if upload_path.exists():
        return FileResponse(str(upload_path), media_type="video/mp4", filename=safe_name)

    raise HTTPException(status_code=404, detail="Video not found")


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """Validate and save an uploaded video."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}",
        )

    # Read content and check size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum: {MAX_UPLOAD_SIZE_MB} MB",
        )

    # Generate safe filename
    safe_filename = f"{uuid.uuid4().hex[:12]}_{Path(file.filename).stem}{ext}"
    save_path = UPLOAD_DIR / safe_filename

    with open(save_path, "wb") as f:
        f.write(content)

    return VideoUploadResponse(
        filename=safe_filename,
        original_name=file.filename,
        size_bytes=len(content),
        url=f"/api/videos/serve/{safe_filename}",
    )


@router.post("/analyze", response_model=JobStatusResponse)
def start_analysis(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Create a background analysis job for the selected video."""
    if not is_model_loaded():
        raise HTTPException(status_code=503, detail="Model is not loaded. Cannot start analysis.")

    # Resolve the video file
    video_path = resolve_video_path(request.video_filename)
    if video_path is None:
        raise HTTPException(status_code=404, detail=f"Video not found: {request.video_filename}")

    # Check for duplicate running jobs on the same file
    existing = db.query(VideoJob).filter(
        VideoJob.input_filename == request.video_filename,
        VideoJob.status.in_(["pending", "processing"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A job is already running for this video (job {existing.id[:8]}...)",
        )

    # Create job record
    job = VideoJob(
        id=str(uuid.uuid4()),
        input_filename=request.video_filename,
        input_path=str(video_path),
        session_id=request.session_id,
        confidence_threshold=request.confidence_threshold or DEFAULT_CONFIDENCE_THRESHOLD,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch background thread
    thread = threading.Thread(
        target=process_video_background,
        args=(job.id, str(video_path), job.confidence_threshold),
        daemon=True,
    )
    thread.start()

    return JobStatusResponse.model_validate(job)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Return processing status and progress."""
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse.model_validate(job)


@router.get("/jobs/{job_id}/result", response_model=JobResultResponse)
def get_job_result(job_id: str, db: Session = Depends(get_db)):
    """Return completed analysis results."""
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = JobResultResponse.model_validate(job)
    if job.output_filename:
        result.output_url = f"/api/videos/jobs/{job_id}/output"
    return result


@router.get("/jobs/{job_id}/output")
def get_job_output(job_id: str, db: Session = Depends(get_db)):
    """Serve the processed video once available."""
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed" or not job.output_path:
        raise HTTPException(status_code=404, detail="Output video not available yet")

    output_path = Path(job.output_path)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output video file not found on disk")

    return FileResponse(
        str(output_path),
        media_type="video/mp4",
        filename=job.output_filename or "output.mp4",
    )


@router.post("/jobs/{job_id}/cancel")
def cancel_analysis(job_id: str, db: Session = Depends(get_db)):
    """Cancel a running analysis job."""
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ("pending", "processing"):
        raise HTTPException(status_code=400, detail=f"Job cannot be cancelled (status: {job.status})")

    cancelled = cancel_job(job_id)
    if not cancelled:
        # Job might have already finished
        job.status = "cancelled"
        db.commit()

    return {"message": "Cancellation requested", "job_id": job_id}


@router.get("/jobs", response_model=list[JobStatusResponse])
def list_jobs(db: Session = Depends(get_db)):
    """List all video analysis jobs."""
    jobs = db.query(VideoJob).order_by(VideoJob.created_at.desc()).limit(50).all()
    return [JobStatusResponse.model_validate(j) for j in jobs]

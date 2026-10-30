"""
AI ExamGuard — Video Processing Service

Processes videos frame-by-frame using the loaded YOLO model.
Produces annotated output videos and records detection events.
Runs in a background thread to avoid blocking FastAPI.
"""
import logging
import time
import uuid
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict

import cv2
import supervision as sv

from backend.config import OUTPUT_DIR, UPLOAD_DIR, DEMO_VIDEO_PATH
from backend.services.inference import run_inference, get_class_names, is_model_loaded
from backend.database import SessionLocal
from backend.models import VideoJob, DetectionEvent

logger = logging.getLogger(__name__)

# Track active processing jobs (job_id → threading.Event for cancellation)
_active_jobs: Dict[str, threading.Event] = {}


def resolve_video_path(video_filename: str) -> Optional[Path]:
    """Resolve a video filename to its full path."""
    # Check if it's the demo video
    if video_filename == "demo.mp4" and DEMO_VIDEO_PATH.exists():
        return DEMO_VIDEO_PATH

    # Check uploads directory
    upload_path = UPLOAD_DIR / video_filename
    if upload_path.exists():
        return upload_path

    return None


def cancel_job(job_id: str) -> bool:
    """Signal a running job to cancel."""
    if job_id in _active_jobs:
        _active_jobs[job_id].set()
        return True
    return False


def process_video_background(job_id: str, input_path: str, confidence_threshold: float = 0.25):
    """
    Process a video in a background thread.
    This function is the thread target — it manages its own DB session.
    """
    cancel_event = threading.Event()
    _active_jobs[job_id] = cancel_event

    db = SessionLocal()
    cap = None
    out = None

    try:
        job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found in database")
            return

        if not is_model_loaded():
            job.status = "failed"
            job.error_message = "Model is not loaded"
            db.commit()
            return

        # Open input video
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            job.status = "failed"
            job.error_message = f"Could not open video: {input_path}"
            db.commit()
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if fps <= 0:
            fps = 25.0

        # Prepare output
        output_filename = f"analyzed_{job_id[:8]}_{Path(input_path).stem}.mp4"
        output_path = OUTPUT_DIR / output_filename

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

        if not out.isOpened():
            job.status = "failed"
            job.error_message = "Could not create output video writer"
            db.commit()
            return

        # Update job status
        job.status = "processing"
        job.total_frames = total_frames
        job.output_filename = output_filename
        job.output_path = str(output_path)
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # Annotators — use the API style from the existing app.py
        box_annotator = sv.BoxAnnotator()
        label_annotator = sv.LabelAnnotator()
        class_names = get_class_names()

        start_time = time.time()
        frame_number = 0
        total_detections = 0
        cheating_count = 0
        non_cheating_count = 0

        while True:
            if cancel_event.is_set():
                job.status = "cancelled"
                job.error_message = "Processing was cancelled by user"
                break

            ret, frame = cap.read()
            if not ret:
                break

            frame_number += 1

            # Run inference
            result = run_inference(frame, confidence_threshold)
            detections = sv.Detections.from_ultralytics(result)

            # Record detection events
            if len(detections) > 0:
                for i in range(len(detections)):
                    class_id = int(detections.class_id[i]) if detections.class_id is not None else -1
                    confidence = float(detections.confidence[i]) if detections.confidence is not None else 0.0
                    class_name = class_names.get(class_id, f"class_{class_id}")

                    bbox = detections.xyxy[i] if detections.xyxy is not None and len(detections.xyxy) > i else None

                    event = DetectionEvent(
                        id=str(uuid.uuid4()),
                        job_id=job_id,
                        session_id=job.session_id,
                        frame_number=frame_number,
                        timestamp_sec=round(frame_number / fps, 3) if fps > 0 else None,
                        class_id=class_id,
                        class_name=class_name,
                        confidence=round(confidence, 4),
                        bbox_x1=float(bbox[0]) if bbox is not None else None,
                        bbox_y1=float(bbox[1]) if bbox is not None else None,
                        bbox_x2=float(bbox[2]) if bbox is not None else None,
                        bbox_y2=float(bbox[3]) if bbox is not None else None,
                        source_video=Path(input_path).name,
                        review_status="pending",
                    )
                    db.add(event)
                    total_detections += 1

                    if class_name == "cheating":
                        cheating_count += 1
                    else:
                        non_cheating_count += 1

            # Annotate frame
            labels = []
            if detections.class_id is not None and detections.confidence is not None:
                for i in range(len(detections)):
                    cid = int(detections.class_id[i])
                    conf = float(detections.confidence[i])
                    cname = class_names.get(cid, f"class_{cid}")
                    labels.append(f"{cname} {conf:.2f}")

            annotated = box_annotator.annotate(
                scene=frame.copy(),
                detections=detections,
            )
            annotated = label_annotator.annotate(
                scene=annotated,
                detections=detections,
                labels=labels if labels else None,
            )

            out.write(annotated)

            # Update progress periodically (every 30 frames to reduce DB writes)
            if frame_number % 30 == 0 or frame_number == total_frames:
                job.processed_frames = frame_number
                job.progress = round((frame_number / total_frames * 100) if total_frames > 0 else 0, 1)
                job.total_detections = total_detections
                job.cheating_count = cheating_count
                job.non_cheating_count = non_cheating_count
                db.commit()

        elapsed = time.time() - start_time

        # Final update
        if job.status != "cancelled":
            job.status = "completed"
        job.processed_frames = frame_number
        job.progress = 100.0 if job.status == "completed" else job.progress
        job.total_detections = total_detections
        job.cheating_count = cheating_count
        job.non_cheating_count = non_cheating_count
        job.processing_time = round(elapsed, 2)
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(
            f"Job {job_id} {job.status}: {frame_number} frames, "
            f"{total_detections} detections in {elapsed:.1f}s"
        )

    except Exception as exc:
        logger.exception(f"Error processing job {job_id}")
        try:
            job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                db.commit()
        except Exception:
            pass

    finally:
        if cap is not None:
            cap.release()
        if out is not None:
            out.release()
        _active_jobs.pop(job_id, None)
        db.close()

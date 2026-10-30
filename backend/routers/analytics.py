"""
AI ExamGuard — Analytics Router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import ExamSession, VideoJob, DetectionEvent
from backend.schemas import AnalyticsSummaryResponse, TimelineResponse, TimelinePoint

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def analytics_summary(db: Session = Depends(get_db)):
    """Return dashboard statistics from actual database values."""
    total_sessions = db.query(ExamSession).count()
    completed_jobs = db.query(VideoJob).filter(VideoJob.status == "completed").count()
    failed_jobs = db.query(VideoJob).filter(VideoJob.status == "failed").count()
    videos_processed = completed_jobs

    total_detections = db.query(DetectionEvent).count()
    cheating_detections = db.query(DetectionEvent).filter(
        DetectionEvent.class_name == "cheating"
    ).count()
    non_cheating_detections = db.query(DetectionEvent).filter(
        DetectionEvent.class_name == "non-cheating"
    ).count()
    pending_reviews = db.query(DetectionEvent).filter(
        DetectionEvent.review_status == "pending"
    ).count()

    return AnalyticsSummaryResponse(
        total_sessions=total_sessions,
        videos_processed=videos_processed,
        total_detections=total_detections,
        cheating_detections=cheating_detections,
        non_cheating_detections=non_cheating_detections,
        pending_reviews=pending_reviews,
        completed_jobs=completed_jobs,
        failed_jobs=failed_jobs,
    )


@router.get("/timeline", response_model=TimelineResponse)
def analytics_timeline(db: Session = Depends(get_db)):
    """Return prediction counts grouped by date."""
    # Group events by the date portion of created_at
    rows = (
        db.query(
            func.date(DetectionEvent.created_at).label("date"),
            DetectionEvent.class_name,
            func.count().label("count"),
        )
        .group_by(func.date(DetectionEvent.created_at), DetectionEvent.class_name)
        .order_by(func.date(DetectionEvent.created_at))
        .all()
    )

    # Pivot into timeline points
    date_map: dict = {}
    for row in rows:
        d = str(row.date)
        if d not in date_map:
            date_map[d] = {"cheating": 0, "non_cheating": 0}
        if row.class_name == "cheating":
            date_map[d]["cheating"] = row.count
        else:
            date_map[d]["non_cheating"] = row.count

    timeline = [
        TimelinePoint(date=d, cheating=v["cheating"], non_cheating=v["non_cheating"])
        for d, v in date_map.items()
    ]

    return TimelineResponse(timeline=timeline)

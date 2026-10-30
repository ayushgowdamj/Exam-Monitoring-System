"""
AI ExamGuard — Detection Events Router
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timezone
from typing import Optional
import csv
import io

from backend.database import get_db
from backend.models import DetectionEvent
from backend.schemas import (
    DetectionEventResponse, ReviewUpdateRequest, EventListResponse,
)

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=EventListResponse)
def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    class_name: Optional[str] = None,
    review_status: Optional[str] = None,
    job_id: Optional[str] = None,
    session_id: Optional[str] = None,
    min_confidence: Optional[float] = None,
    max_confidence: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Return paginated prediction events with filters."""
    query = db.query(DetectionEvent)

    # Apply filters
    if class_name:
        query = query.filter(DetectionEvent.class_name == class_name)
    if review_status:
        query = query.filter(DetectionEvent.review_status == review_status)
    if job_id:
        query = query.filter(DetectionEvent.job_id == job_id)
    if session_id:
        query = query.filter(DetectionEvent.session_id == session_id)
    if min_confidence is not None:
        query = query.filter(DetectionEvent.confidence >= min_confidence)
    if max_confidence is not None:
        query = query.filter(DetectionEvent.confidence <= max_confidence)

    total = query.count()
    events = (
        query.order_by(DetectionEvent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return EventListResponse(
        events=[DetectionEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
def export_events_csv(
    class_name: Optional[str] = None,
    review_status: Optional[str] = None,
    job_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export events as CSV."""
    query = db.query(DetectionEvent)
    if class_name:
        query = query.filter(DetectionEvent.class_name == class_name)
    if review_status:
        query = query.filter(DetectionEvent.review_status == review_status)
    if job_id:
        query = query.filter(DetectionEvent.job_id == job_id)

    events = query.order_by(DetectionEvent.created_at.desc()).limit(10000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Job ID", "Frame", "Timestamp (s)", "Class", "Confidence",
        "BBox X1", "BBox Y1", "BBox X2", "BBox Y2",
        "Source Video", "Review Status", "Created At",
    ])
    for e in events:
        writer.writerow([
            e.id, e.job_id, e.frame_number, e.timestamp_sec,
            e.class_name, e.confidence,
            e.bbox_x1, e.bbox_y1, e.bbox_x2, e.bbox_y2,
            e.source_video, e.review_status, e.created_at,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=detection_events.csv"},
    )


@router.get("/{event_id}", response_model=DetectionEventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Return an individual event."""
    event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return DetectionEventResponse.model_validate(event)


@router.patch("/{event_id}/review", response_model=DetectionEventResponse)
def update_review(event_id: str, request: ReviewUpdateRequest, db: Session = Depends(get_db)):
    """Update the review status of an event."""
    event = db.query(DetectionEvent).filter(DetectionEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.review_status = request.review_status
    event.review_notes = request.review_notes
    if request.review_status in ("reviewed", "dismissed"):
        event.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(event)
    return DetectionEventResponse.model_validate(event)

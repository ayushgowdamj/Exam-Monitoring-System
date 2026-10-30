"""
AI ExamGuard — Exam Sessions Router
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import ExamSession
from backend.schemas import SessionCreateRequest, SessionUpdateRequest, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    """List examination sessions."""
    sessions = db.query(ExamSession).order_by(ExamSession.created_at.desc()).limit(100).all()
    return [SessionResponse.model_validate(s) for s in sessions]


@router.post("", response_model=SessionResponse, status_code=201)
def create_session(request: SessionCreateRequest, db: Session = Depends(get_db)):
    """Create an examination session."""
    session = ExamSession(**request.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a specific session."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.model_validate(session)


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(session_id: str, request: SessionUpdateRequest, db: Session = Depends(get_db)):
    """Update a session."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)

    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session)

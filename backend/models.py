"""
AI ExamGuard — SQLAlchemy ORM Models
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from backend.database import Base


def _uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(String, primary_key=True, default=_uuid)
    session_name = Column(String, nullable=False)
    exam_name = Column(String, nullable=False)
    exam_date = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    room = Column(String, nullable=True)
    camera_id = Column(String, ForeignKey("camera_devices.id"), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="scheduled")  # scheduled, in_progress, completed, cancelled
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    events = relationship("DetectionEvent", back_populates="session", lazy="dynamic")


class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(String, primary_key=True, default=_uuid)
    input_filename = Column(String, nullable=False)
    input_path = Column(String, nullable=False)
    output_filename = Column(String, nullable=True)
    output_path = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, processing, completed, failed, cancelled
    progress = Column(Float, default=0.0)
    total_frames = Column(Integer, nullable=True)
    processed_frames = Column(Integer, default=0)
    total_detections = Column(Integer, default=0)
    cheating_count = Column(Integer, default=0)
    non_cheating_count = Column(Integer, default=0)
    processing_time = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    session_id = Column(String, ForeignKey("exam_sessions.id"), nullable=True)
    confidence_threshold = Column(Float, default=0.25)
    created_at = Column(DateTime, default=_utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    events = relationship("DetectionEvent", back_populates="job", lazy="dynamic")


class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("video_jobs.id"), nullable=False)
    session_id = Column(String, ForeignKey("exam_sessions.id"), nullable=True)
    frame_number = Column(Integer, nullable=False)
    timestamp_sec = Column(Float, nullable=True)
    class_id = Column(Integer, nullable=False)
    class_name = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_x1 = Column(Float, nullable=True)
    bbox_y1 = Column(Float, nullable=True)
    bbox_x2 = Column(Float, nullable=True)
    bbox_y2 = Column(Float, nullable=True)
    source_video = Column(String, nullable=True)
    review_status = Column(String, default="pending")  # pending, reviewed, dismissed
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    job = relationship("VideoJob", back_populates="events")
    session = relationship("ExamSession", back_populates="events")


class CameraDevice(Base):
    __tablename__ = "camera_devices"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    camera_type = Column(String, default="esp32-cam")  # esp32-cam, ip-camera, usb
    stream_url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_enabled = Column(Boolean, default=True)
    is_connected = Column(Boolean, default=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

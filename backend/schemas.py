"""
AI ExamGuard — Pydantic Schemas for API request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Health ─────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    backend: str
    database: str
    model_loaded: bool
    model_file: str
    demo_video_available: bool
    version: str


# ─── Model Info ─────────────────────────────────────────
class ModelInfoResponse(BaseModel):
    filename: str
    loaded: bool
    class_names: dict
    task: Optional[str] = None


# ─── Video / Demo ──────────────────────────────────────
class DemoVideoResponse(BaseModel):
    available: bool
    filename: Optional[str] = None
    size_bytes: Optional[int] = None
    url: Optional[str] = None


class VideoUploadResponse(BaseModel):
    filename: str
    original_name: str
    size_bytes: int
    url: str


# ─── Video Jobs ────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    video_filename: str
    session_id: Optional[str] = None
    confidence_threshold: Optional[float] = Field(default=0.25, ge=0.0, le=1.0)


class JobStatusResponse(BaseModel):
    id: str
    status: str
    progress: float
    total_frames: Optional[int] = None
    processed_frames: int
    total_detections: int
    cheating_count: int
    non_cheating_count: int
    processing_time: Optional[float] = None
    error_message: Optional[str] = None
    input_filename: str
    output_filename: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobResultResponse(JobStatusResponse):
    output_url: Optional[str] = None


# ─── Detection Events ─────────────────────────────────
class DetectionEventResponse(BaseModel):
    id: str
    job_id: str
    session_id: Optional[str] = None
    frame_number: int
    timestamp_sec: Optional[float] = None
    class_id: int
    class_name: str
    confidence: float
    bbox_x1: Optional[float] = None
    bbox_y1: Optional[float] = None
    bbox_x2: Optional[float] = None
    bbox_y2: Optional[float] = None
    source_video: Optional[str] = None
    review_status: str
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewUpdateRequest(BaseModel):
    review_status: str = Field(..., pattern=r"^(pending|reviewed|dismissed)$")
    review_notes: Optional[str] = None


class EventListResponse(BaseModel):
    events: List[DetectionEventResponse]
    total: int
    page: int
    page_size: int


# ─── Exam Sessions ────────────────────────────────────
class SessionCreateRequest(BaseModel):
    session_name: str
    exam_name: str
    exam_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    camera_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "scheduled"


class SessionUpdateRequest(BaseModel):
    session_name: Optional[str] = None
    exam_name: Optional[str] = None
    exam_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    camera_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    session_name: str
    exam_name: str
    exam_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    camera_id: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ─────────────────────────────────────────
class AnalyticsSummaryResponse(BaseModel):
    total_sessions: int
    videos_processed: int
    total_detections: int
    cheating_detections: int
    non_cheating_detections: int
    pending_reviews: int
    completed_jobs: int
    failed_jobs: int


class TimelinePoint(BaseModel):
    date: str
    cheating: int
    non_cheating: int


class TimelineResponse(BaseModel):
    timeline: List[TimelinePoint]


# ─── Camera Devices ───────────────────────────────────
class CameraCreateRequest(BaseModel):
    name: str
    camera_type: Optional[str] = "esp32-cam"
    stream_url: Optional[str] = None
    location: Optional[str] = None
    is_enabled: Optional[bool] = True


class CameraResponse(BaseModel):
    id: str
    name: str
    camera_type: str
    stream_url: Optional[str] = None
    location: Optional[str] = None
    is_enabled: bool
    is_connected: bool
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Settings ─────────────────────────────────────────
class SettingResponse(BaseModel):
    key: str
    value: str


class SettingUpdateRequest(BaseModel):
    value: str

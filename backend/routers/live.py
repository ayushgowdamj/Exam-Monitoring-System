"""
AI ExamGuard — Live Camera Monitoring Router
"""
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.services.live_camera import (
    start_live_monitoring,
    stop_live_monitoring,
    get_live_status,
    get_latest_frame,
    normalize_camera_ip,
)

router = APIRouter(prefix="/api/live", tags=["live"])


class LiveStartRequest(BaseModel):
    camera_ip: Optional[str] = "10.134.243.228"
    capture_interval: Optional[float] = 2.0


@router.post("/start")
def start_live(req: LiveStartRequest = None):
    """Start live monitoring worker for ESP32-CAM."""
    ip = req.camera_ip if (req and req.camera_ip) else "10.134.243.228"
    interval = req.capture_interval if (req and req.capture_interval) else 2.0
    res = start_live_monitoring(camera_ip=ip, capture_interval=interval)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to start live stream"))
    return res


@router.post("/stop")
def stop_live():
    """Stop live monitoring worker."""
    return stop_live_monitoring()


@router.get("/status")
def live_status():
    """Get current connection and inference status."""
    return get_live_status()


@router.get("/frame")
def live_frame(t: Optional[str] = None):
    """Serve the latest annotated JPEG frame directly."""
    frame_bytes = get_latest_frame()
    if not frame_bytes:
        raise HTTPException(status_code=404, detail="No frame captured yet")
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


def _mjpeg_generator():
    """Yield multipart JPEG stream frames for browser <img src='/api/live/stream'>."""
    while True:
        frame_bytes = get_latest_frame()
        if frame_bytes:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
        time.sleep(1.0)


@router.get("/stream")
def live_stream():
    """Serve an MJPEG multipart stream composed of the annotated frames."""
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


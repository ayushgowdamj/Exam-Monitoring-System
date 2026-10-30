"""
AI ExamGuard — Camera Devices Router (ESP32-CAM Preparation)
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CameraDevice
from backend.schemas import CameraCreateRequest, CameraResponse

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


@router.get("", response_model=list[CameraResponse])
def list_cameras(db: Session = Depends(get_db)):
    """List configured camera devices."""
    cameras = db.query(CameraDevice).order_by(CameraDevice.created_at.desc()).all()
    return [CameraResponse.model_validate(c) for c in cameras]


@router.post("", response_model=CameraResponse, status_code=201)
def create_camera(request: CameraCreateRequest, db: Session = Depends(get_db)):
    """Register a camera device."""
    camera = CameraDevice(**request.model_dump())
    # is_connected is always False until actual connectivity is tested
    camera.is_connected = False
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return CameraResponse.model_validate(camera)


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    """Get a specific camera."""
    camera = db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return CameraResponse.model_validate(camera)


@router.delete("/{camera_id}")
def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    """Remove a camera device."""
    camera = db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(camera)
    db.commit()
    return {"message": "Camera deleted", "id": camera_id}

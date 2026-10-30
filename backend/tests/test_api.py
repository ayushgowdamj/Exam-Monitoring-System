"""
AI ExamGuard — Backend Integration & Unit Tests
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import init_db

# Initialize database tables for testing
init_db()

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "app" in data
    assert data["app"] == "AI ExamGuard"
    assert "version" in data


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["backend"] == "running"
    assert data["database"] == "connected"
    assert "model_loaded" in data


def test_model_info():
    response = client.get("/api/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "filename" in data
    assert "loaded" in data
    assert "class_names" in data


def test_demo_video():
    response = client.get("/api/videos/demo")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data


def test_exam_sessions_crud():
    # 1. Create a session
    payload = {
        "session_name": "Midterm Examination 2026",
        "exam_name": "Computer Networks 101",
        "exam_date": "2026-11-15",
        "start_time": "10:00",
        "end_time": "13:00",
        "room": "Room 402",
        "notes": "Automated surveillance test",
    }
    create_res = client.post("/api/sessions", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    session_id = created_data["id"]
    assert created_data["session_name"] == payload["session_name"]
    assert created_data["status"] == "scheduled"

    # 2. List sessions
    list_res = client.get("/api/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert any(s["id"] == session_id for s in sessions)

    # 3. Get single session
    get_res = client.get(f"/api/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["exam_name"] == payload["exam_name"]

    # 4. Update session
    update_res = client.patch(
        f"/api/sessions/{session_id}",
        json={"status": "in_progress", "notes": "Active exam monitoring"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "in_progress"
    assert update_res.json()["notes"] == "Active exam monitoring"


def test_camera_devices_crud():
    # 1. Register a camera
    payload = {
        "name": "Hall-B ESP32 Unit 01",
        "camera_type": "esp32-cam",
        "stream_url": "http://192.168.1.50:81/stream",
        "location": "North Hall B",
    }
    create_res = client.post("/api/cameras", json=payload)
    assert create_res.status_code == 201
    camera_data = create_res.json()
    camera_id = camera_data["id"]
    assert camera_data["name"] == payload["name"]

    # 2. List cameras
    list_res = client.get("/api/cameras")
    assert list_res.status_code == 200
    cameras = list_res.json()
    assert any(c["id"] == camera_id for c in cameras)

    # 3. Get single camera
    get_res = client.get(f"/api/cameras/{camera_id}")
    assert get_res.status_code == 200
    assert get_res.json()["stream_url"] == payload["stream_url"]

    # 4. Delete camera
    delete_res = client.delete(f"/api/cameras/{camera_id}")
    assert delete_res.status_code == 200

    # 5. Confirm deletion
    get_after_delete = client.get(f"/api/cameras/{camera_id}")
    assert get_after_delete.status_code == 404


def test_analytics_endpoints():
    # Summary
    summary_res = client.get("/api/analytics/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "total_sessions" in summary
    assert "videos_processed" in summary
    assert "total_detections" in summary

    # Timeline
    timeline_res = client.get("/api/analytics/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert "timeline" in timeline


def test_events_pagination():
    response = client.get("/api/events?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1


# AI ExamGuard — Real-Time Exam Hall Monitoring & Cheating Detection

> **Smarter Monitoring. Fairer Examinations.**  
> An enterprise-grade AI-powered computer vision system designed to detect and flag suspicious behavior during examinations using custom-trained YOLO deep learning models.

---

## 📌 Project Overview

AI ExamGuard modernizes exam invigilation by combining a fine-tuned computer vision model (`best.pt`) with an asynchronous backend processing pipeline and an intuitive, dark-themed operational dashboard. 

The system supports:
- **Video Analysis Workspace**: Upload surveillance footage (MP4, AVI, MOV, MKV up to 500 MB) or run the integrated `demo.mp4` to perform automated frame-by-frame inference.
- **Annotated Visual Outputs**: Generated videos with color-coded bounding boxes and confidence scores (Class 0: `cheating`, Class 1: `non-cheating`).
- **Detection Event Audit Log**: Paginated event registry allowing proctors to filter, inspect coordinates, add notes, and approve or dismiss flags.
- **Exam Sessions Management**: Schedule exam rooms, bind cameras, and monitor session status.
- **Comprehensive Analytics**: Time-series incident timelines, category breakdowns, and resolution ratios built with Recharts.
- **ESP32-CAM & IP Camera Integration**: Hardware registration endpoint to bind remote microcontrollers and RTSP/HTTP streams.
- **Live Monitoring Grid**: Multi-camera surveillance dashboard.

---

## 🏗️ System Architecture

```
AI-Exam-Monitor/
├── Detecting-Cheating-with-computer-vision-.../ # Original YOLO project (preserved)
│   ├── best.pt                                 # Fine-tuned YOLO model weights
│   ├── last.pt                                 # Model training checkpoint
│   └── app.py                                  # Original OpenCV CLI script
├── demo.mp4                                    # Sample exam hall surveillance footage
├── examguard.db                                # SQLite operational database
├── start-dev.bat                               # One-click dual server startup script
├── backend/                                    # FastAPI Backend (Python 3.13)
│   ├── main.py                                 # ASGI entrypoint & middleware
│   ├── config.py                               # Application settings & absolute paths
│   ├── database.py                             # SQLAlchemy session & SQLite engine
│   ├── models.py                               # DB models (Jobs, Events, Sessions, Cameras)
│   ├── schemas.py                              # Pydantic v2 validation schemas
│   ├── requirements.txt                        # Backend dependencies
│   ├── routers/                                # Modular API routers
│   │   ├── health.py                           # System & model health checks
│   │   ├── videos.py                           # Video uploads, analysis jobs, streaming
│   │   ├── events.py                           # Paginated detection event logs & reviews
│   │   ├── sessions.py                         # Exam session scheduling CRUD
│   │   ├── cameras.py                          # ESP32-CAM & camera registration
│   │   └── analytics.py                        # Incident metrics & timeline aggregations
│   ├── services/
│   │   ├── inference.py                        # Singleton YOLO model loader
│   │   └── video_processor.py                  # Background frame processing & annotation
│   └── tests/
│       └── test_api.py                         # Pytest test suite (100% passing)
├── frontend/                                   # Modern React Dashboard
│   ├── src/
│   │   ├── api/client.ts                       # Axios API client & TypeScript interfaces
│   │   ├── components/layout/                  # Header, Sidebar, and App Layout
│   │   ├── pages/
│   │   │   ├── Overview.tsx                    # System KPIs & quick actions
│   │   │   ├── VideoAnalysis.tsx               # Upload, demo runner & video player
│   │   │   ├── DetectionEvents.tsx             # Audit log & proctor review table
│   │   │   ├── ExamSessions.tsx                # Exam scheduling & calendar view
│   │   │   ├── Analytics.tsx                   # Graphical trends & charts
│   │   │   ├── CameraDevices.tsx               # ESP32-CAM & stream management
│   │   │   ├── LiveMonitoring.tsx              # Multi-camera live grid deck
│   │   │   └── Settings.tsx                    # System diagnostics & tuning
│   │   ├── App.tsx                             # Route definitions & health polling
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── uploads/                                    # Uploaded video storage
└── outputs/                                    # Annotated processed video storage
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10 to 3.13
- **Node.js**: v18+ and `npm`

### One-Click Launch (Windows)
Double-click `start-dev.bat` from the root directory, or run in terminal:
```bat
start-dev.bat
```
This automatically boots both the FastAPI backend on port 8000 and Vite React dev server on port 5173.

---

### Manual Setup

#### 1. Backend Setup
```bash
# Navigate to project root
cd AI-Exam-Monitor

# Activate existing backend virtual environment
.\backend_venv\Scripts\activate

# Install dependencies (if setting up fresh)
pip install -r backend/requirements.txt

# Run the backend server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

#### 2. Frontend Setup
```bash
# In a new terminal window
cd AI-Exam-Monitor/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
- Dashboard UI: `http://localhost:5173`

---

## 🧪 Running Automated Tests

A comprehensive pytest suite verifies API integrity, model loading, database operations, and session CRUD:
```bash
.\backend_venv\Scripts\python.exe -m pytest backend/tests
```
Expected output:
```
backend/tests/test_api.py ........ [100%]
======================== 8 passed in ~3s ========================
```

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health diagnostics (model status, DB, demo video) |
| `GET` | `/api/model/info` | YOLO model weights status and class mapping |
| `GET` | `/api/videos/demo` | Information and stream URL for sample `demo.mp4` |
| `POST` | `/api/videos/upload` | Upload surveillance video (up to 500 MB) |
| `POST` | `/api/videos/analyze` | Start asynchronous background analysis job |
| `GET` | `/api/videos/jobs/{id}` | Poll analysis progress and frame metrics |
| `GET` | `/api/videos/jobs/{id}/output` | Retrieve annotated processed output video |
| `POST` | `/api/videos/jobs/{id}/cancel` | Cancel in-progress processing job |
| `GET` | `/api/events` | Paginated detection event logs with filters |
| `PATCH` | `/api/events/{id}/review` | Update event status (`reviewed`, `dismissed`) |
| `GET` | `/api/sessions` | List scheduled examination sessions |
| `POST` | `/api/sessions` | Create a new exam session |
| `PATCH` | `/api/sessions/{id}` | Update session status or details |
| `GET` | `/api/cameras` | List configured ESP32-CAM and IP streams |
| `POST` | `/api/cameras` | Register a new camera device |
| `DELETE` | `/api/cameras/{id}` | Remove a camera device |
| `GET` | `/api/analytics/summary` | Aggregated surveillance KPIs |
| `GET` | `/api/analytics/timeline` | Daily detection incident distribution |

---

## 📹 Video Processing Pipeline

1. **Model Singleton**: `best.pt` is loaded into memory only once at server startup via [backend/services/inference.py](file:///c:/Users/ayush/OneDrive%20-%20Dhanvith%20Ventures%20LLP/Desktop/AI-Exam-Monitor/backend/services/inference.py).
2. **Background Thread**: Video decoding and inference runs asynchronously inside a background worker thread managed by [backend/services/video_processor.py](file:///c:/Users/ayush/OneDrive%20-%20Dhanvith%20Ventures%20LLP/Desktop/AI-Exam-Monitor/backend/services/video_processor.py).
3. **Supervision Annotations**: Bounding boxes, labels, and class confidence percentages are painted onto frames and compiled into an H.264/MP4 stream in `outputs/`.
4. **Instant Event Logging**: Every positive detection is recorded into the `detection_events` SQLite table with exact frame numbers, bounding box coordinates, and timestamps.


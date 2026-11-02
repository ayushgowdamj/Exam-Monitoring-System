@echo off
title AI ExamGuard Server
echo ========================================================
echo   Starting AI ExamGuard Exam Monitoring System
echo   Hardware Target: ESP32-CAM (10.134.243.228)
echo ========================================================
echo.

echo [1/2] Ensuring latest frontend build...
call npm --prefix frontend run build

echo.
echo [2/2] Launching Unified FastAPI + YOLO AI Engine on port 8000...
echo Opening browser at http://localhost:8000/live
echo.
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000/live"
.\backend_venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

@echo off
TITLE AI ExamGuard — Unified Dev Server Launcher
echo ===================================================
echo             AI ExamGuard Surveillance
echo      Smarter Monitoring. Fairer Examinations.
echo ===================================================
echo.

REM Determine current project directory
cd /d "%~dp0"

echo [1/3] Verifying Python backend virtual environment...
if not exist "backend_venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at backend_venv\Scripts\python.exe!
    echo Please create the virtual environment and install requirements first.
    pause
    exit /b 1
)

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "AI ExamGuard Backend (Port 8000)" cmd /k "backend_venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting Vite React Frontend on http://localhost:5173 ...
start "AI ExamGuard Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo AI ExamGuard is booting up!
echo.
echo   - Web Dashboard:     http://localhost:5173
echo   - Backend API:       http://localhost:8000
echo   - Interactive Docs:  http://localhost:8000/docs
echo ===================================================
echo Keep this window open or close it when done.
echo.
pause


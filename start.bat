@echo off
title SubTranslate AI Launcher
echo ========================================================
echo               SubTranslate AI Launcher
echo ========================================================

echo [1/2] Khoi dong Backend (FastAPI)...
start "SubTranslate AI - Backend" cmd /k "cd backend && .venv\Scripts\activate && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Khoi dong Frontend (React + Vite)...
start "SubTranslate AI - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Da khoi dong ca 2 server:
echo  - Backend:  http://127.0.0.1:8000
echo  - Frontend: http://localhost:5173
echo.
timeout /t 3 >nul
start http://localhost:5173

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "              SubTranslate AI Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "[1/2] Khoi dong Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Khoi dong Frontend (React + Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nDa khoi dong ca 2 server:" -ForegroundColor Green
Write-Host " - Backend:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host " - Frontend: http://localhost:5173" -ForegroundColor White

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host "=== FairAI Backend Setup ===" -ForegroundColor Cyan
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
Write-Host ""
Write-Host "Starting FairAI API server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""
uvicorn main:app --reload --port 8000 --host 0.0.0.0

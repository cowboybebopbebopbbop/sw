# Simple dev server script
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Opening: http://localhost:8000/public/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start Python HTTP server
python -m http.server 8000

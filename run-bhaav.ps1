# BHAAV (भाव) - PowerShell Launcher
Write-Host "===================================================" -ForegroundColor DarkYellow
Write-Host "  BHAAV (भाव) - Winning Hackathon Demo Launcher" -ForegroundColor Yellow
Write-Host "  'Write normally. We'll tell you what your hands already know.'" -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor DarkYellow

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "`n[1/4] Installing dependencies..." -ForegroundColor Cyan
npm install --silent 2>$null
Set-Location "$ScriptDir\server"
npm install --silent 2>$null
Set-Location "$ScriptDir\client"
npm install --silent 2>$null
Set-Location $ScriptDir

Write-Host "`n[2/4] Seeding 12-session demo trajectory..." -ForegroundColor Cyan
Set-Location "$ScriptDir\server"
npm run seed
Set-Location $ScriptDir

Write-Host "`n[3/4] Starting Bhaav Backend (port 8787) and Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir\server'; `$env:PORT=8787; node src/index.js"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir\client'; npx vite"

Write-Host "`n[4/4] Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Write-Host "`n✓ Bhaav is live!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:8787/api/health" -ForegroundColor White
Write-Host "`nClose the two server windows to stop." -ForegroundColor Gray

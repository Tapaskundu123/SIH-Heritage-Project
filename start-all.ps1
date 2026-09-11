# KarigarSetu — Master Startup Script
# Starts all 3 services: Frontend + Backend + AI

Write-Host ""
Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       KarigarSetu — SIH 2024          ║" -ForegroundColor Cyan
Write-Host "║  AI Business Manager for Artisans     ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
Write-Host "📁 Project root: $root" -ForegroundColor Gray
Write-Host ""

# ---- 1. Start MongoDB (if not running) ----
Write-Host "🗄️  Checking MongoDB..." -ForegroundColor Yellow
$mongo = Get-Process mongod -ErrorAction SilentlyContinue
if (-not $mongo) {
    Write-Host "   Starting MongoDB..." -ForegroundColor Gray
    Start-Process mongod -ArgumentList "--dbpath C:\data\db" -WindowStyle Hidden
    Start-Sleep 2
}
Write-Host "✅ MongoDB ready on port 27017" -ForegroundColor Green
Write-Host ""

# ---- 2. Start Backend ----
Write-Host "🖥️  Starting Backend (Express + TypeScript)..." -ForegroundColor Yellow
$backendPath = Join-Path $root "Backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal
Start-Sleep 3
Write-Host "✅ Backend starting on http://localhost:5000" -ForegroundColor Green
Write-Host ""

# ---- 3. Start AI Service ----
Write-Host "🤖 Starting AI Service (FastAPI + PyTorch)..." -ForegroundColor Yellow
$aiPath = Join-Path $root "AI"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$aiPath'; uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal
Write-Host "✅ AI Service starting on http://localhost:8000" -ForegroundColor Green
Write-Host "   ⏳ First run downloads AI models (~5GB) — may take 5-10 mins" -ForegroundColor Yellow
Write-Host ""

# ---- 4. Start Frontend ----
Write-Host "🌐 Starting Frontend (Next.js)..." -ForegroundColor Yellow
$frontendPath = Join-Path $root "Frontend\my-app"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
Start-Sleep 4
Write-Host "✅ Frontend starting on http://localhost:3000" -ForegroundColor Green
Write-Host ""

# ---- Summary ----
Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           All Services Started!       ║" -ForegroundColor Green
Write-Host "╠═══════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  🌐 Frontend:  http://localhost:3000  ║" -ForegroundColor White
Write-Host "║  🖥️  Backend:   http://localhost:5000  ║" -ForegroundColor White
Write-Host "║  🤖 AI:        http://localhost:8000  ║" -ForegroundColor White
Write-Host "║  📖 AI Docs:   http://localhost:8000/docs ║" -ForegroundColor White
Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Sleep 3
Start-Process "http://localhost:3000"

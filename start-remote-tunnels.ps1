# KarigarSetu — Remote Access Launcher (No Shared Wi-Fi Required)
# Starts Backend + Cloudflare Tunnels + Expo Tunnel
# Run this ONCE before sharing the QR code with remote users.

$root = $PSScriptRoot
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   KarigarSetu — Remote Access Launcher         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ── 1. Kill stale cloudflared processes ──────────────────────────────────────
Get-Process -Name "*cloudflared*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

$cfExe = Join-Path $root "cloudflared.exe"
if (-not (Test-Path $cfExe)) {
    Write-Host "❌ cloudflared.exe not found at $cfExe" -ForegroundColor Red; exit 1
}

# ── 2. Ensure Backend (port 5000) is running ─────────────────────────────────
Write-Host "🖥️  Checking Backend (port 5000)..." -ForegroundColor Yellow
$backendUp = $false
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $backendUp = $true }
} catch {}

if (-not $backendUp) {
    Write-Host "   Backend not running — starting it..." -ForegroundColor Gray
    $backendPath = Join-Path $root "Backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal
    Write-Host "   ⏳ Waiting for backend to start..." -ForegroundColor Gray
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep 2
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $backendUp = $true; break }
        } catch {}
    }
}

if ($backendUp) {
    Write-Host "✅ Backend is healthy on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend may still be starting — continuing anyway..." -ForegroundColor Yellow
}

# ── 3. Open Backend Cloudflare Tunnel (port 5000) ────────────────────────────
Write-Host "`n🌐 Opening public tunnel for Backend (port 5000)..." -ForegroundColor Yellow
$logBackend = Join-Path $root "cloudflared-backend.log"
if (Test-Path $logBackend) { Remove-Item $logBackend -Force }
Start-Process -FilePath $cfExe -ArgumentList "tunnel --protocol http2 --url http://127.0.0.1:5000" -RedirectStandardError $logBackend -WindowStyle Hidden

# ── 4. Open AI Service Cloudflare Tunnel (port 8000) ─────────────────────────
Write-Host "🤖 Opening public tunnel for AI Service (port 8000)..." -ForegroundColor Yellow
$logAi = Join-Path $root "cloudflared-ai.log"
if (Test-Path $logAi) { Remove-Item $logAi -Force }
Start-Process -FilePath $cfExe -ArgumentList "tunnel --protocol http2 --url http://127.0.0.1:8000" -RedirectStandardError $logAi -WindowStyle Hidden

# ── 5. Extract public tunnel URLs ────────────────────────────────────────────
Write-Host "⏳ Waiting for public tunnel URLs (up to 30s)..." -ForegroundColor Gray
$backendUrl = ""; $aiUrl = ""
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep 2
    if (-not $backendUrl -and (Test-Path $logBackend)) {
        $m = Select-String -Path $logBackend -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
        if ($m) { $backendUrl = $m.Matches[0].Value }
    }
    if (-not $aiUrl -and (Test-Path $logAi)) {
        $m = Select-String -Path $logAi -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
        if ($m) { $aiUrl = $m.Matches[0].Value }
    }
    if ($backendUrl -and $aiUrl) { break }
}

if (-not $backendUrl) {
    Write-Host "❌ Could not get Backend tunnel URL. Check $logBackend" -ForegroundColor Red; exit 1
}

Write-Host "✅ Backend Public URL : $backendUrl" -ForegroundColor Green
if ($aiUrl) {
    Write-Host "✅ AI Service Public URL: $aiUrl" -ForegroundColor Green
} else {
    Write-Host "⚠️  AI URL not captured — AI Studio features will proxy through backend" -ForegroundColor Yellow
    $aiUrl = $backendUrl  # Fallback: backend proxies AI anyway
}

# ── 6. Verify the backend tunnel actually reaches the server ─────────────────
Write-Host "`n🔍 Verifying backend tunnel is reachable..." -ForegroundColor Yellow
$tunnelOk = $false
for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep 2
    try {
        $r = Invoke-WebRequest -Uri "$backendUrl/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -eq 200 -and $r.Content -notlike "*DOCTYPE*") {
            $tunnelOk = $true; break
        }
    } catch {}
}
if ($tunnelOk) {
    Write-Host "✅ Backend tunnel is reachable from internet!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend tunnel health check failed — may still be initializing" -ForegroundColor Yellow
}

# ── 7. Update Frontend/mobile-app/.env with live URLs ────────────────────────
$envPath = Join-Path $root "Frontend\mobile-app\.env"
@"
# Public Backend Tunnel URL (Cloudflare Tunnel — no shared Wi-Fi needed)
# Generated by start-remote-tunnels.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm')
EXPO_PUBLIC_API_URL=$backendUrl
# Public AI Service Tunnel URL (backend proxies AI internally, this is legacy)
EXPO_PUBLIC_AI_URL=$aiUrl
"@ | Set-Content -Path $envPath
Write-Host "✅ Updated $envPath" -ForegroundColor Green

# ── 8. Start Expo with Tunnel (after clearing cache) ─────────────────────────
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║            Services Are Ready!                         ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  🌐 Backend API  : $backendUrl" -ForegroundColor White
Write-Host "║  🤖 AI Service   : $aiUrl" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Starting Expo with tunnel — scan QR code from ANYWHERE (4G/5G/any Wi-Fi)..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop.`n" -ForegroundColor Gray

$mobilePath = Join-Path $root "Frontend\mobile-app"
Set-Location $mobilePath
npx expo start -c --tunnel

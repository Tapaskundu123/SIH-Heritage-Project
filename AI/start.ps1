# KarigarSetu — AI Service Startup Script
# Run this to start the AI FastAPI service

Write-Host "🚀 Starting KarigarSetu AI Service..." -ForegroundColor Cyan
Write-Host ""

# Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "❌ Python not found! Install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Python found: $(python --version)" -ForegroundColor Green

# Check CUDA
Write-Host ""
Write-Host "🖥️  Checking CUDA (RTX 4050)..." -ForegroundColor Yellow
python -c "import torch; print(f'PyTorch: {torch.__version__} | CUDA: {torch.cuda.is_available()} | GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PyTorch not installed. Installing with CUDA support..." -ForegroundColor Yellow
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
}

# Install requirements
Write-Host ""
Write-Host "📦 Installing AI requirements..." -ForegroundColor Yellow
pip install -r requirements.txt

# Start server
Write-Host ""
Write-Host "🤖 Starting FastAPI AI Service on http://localhost:8000" -ForegroundColor Green
Write-Host "📖 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ First startup may take 5-10 minutes (model downloads ~5GB)" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# =============================================================
# KarigarSetu AI Service — Dockerfile
#
# CPU variant (default) — works everywhere.
# For GPU (CUDA 12.1) uncomment the CUDA base image below
# and install torch with CUDA wheels in the pip step.
# =============================================================

# ---- CPU base (default) ----
FROM python:3.11-slim AS base

# ---- Uncomment for CUDA 12.1 GPU support ----
# FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04 AS base
# RUN apt-get update && apt-get install -y python3.11 python3-pip python3.11-venv \
#     && ln -sf python3.11 /usr/bin/python && ln -sf pip3 /usr/bin/pip \
#     && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------
# System dependencies
# -----------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # ffmpeg for audio processing
    ffmpeg \
    # OpenCV headless needs libgl
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # curl for health checks
    curl \
    # build tools for some pip wheels
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -----------------------------------------------------------
# Python dependencies (cached layer unless requirements change)
# -----------------------------------------------------------
# CPU torch (lightweight). For CUDA, replace with:
#   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------
# Application code
# -----------------------------------------------------------
COPY . .

# Hugging Face model cache lives in a volume so models are not
# re-downloaded on every container restart.
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface

EXPOSE 8000

HEALTHCHECK --interval=60s --timeout=15s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

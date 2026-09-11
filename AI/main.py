"""
KarigarSetu AI Service — FastAPI entry point
Serves local AI models on NVIDIA RTX 4050 (CUDA)
"""
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import settings
from routers import voice, image, catalog, pricing

# Configure logger
logger.remove()
logger.add(sys.stdout, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}", level="INFO")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, unload on shutdown"""
    logger.info("🚀 KarigarSetu AI Service starting...")
    logger.info(f"🖥️  Device: {settings.DEVICE}")
    logger.info(f"📁 Models cache: {settings.MODELS_DIR}")

    # Warm up models
    try:
        from services.whisper_service import WhisperService
        from services.translation_service import TranslationService
        from services.extraction_service import ExtractionService
        from services.bg_removal_service import BGRemovalService

        app.state.whisper = WhisperService()
        app.state.translator = TranslationService()
        app.state.extractor = ExtractionService()
        app.state.bg_remover = BGRemovalService()

        logger.success("✅ All AI models loaded successfully!")
    except Exception as e:
        logger.error(f"❌ Model loading error: {e}")
        logger.warning("⚠️  Service starting in degraded mode — some features may be unavailable")

    yield  # App runs here

    logger.info("👋 KarigarSetu AI Service shutting down...")


app = FastAPI(
    title="KarigarSetu AI Service",
    description="Local AI inference for KarigarSetu — ASR, Translation, Image Processing",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(voice.router, prefix="/ai/voice", tags=["Voice"])
app.include_router(image.router, prefix="/ai/image", tags=["Image"])
app.include_router(catalog.router, prefix="/ai/catalog", tags=["Catalog"])
app.include_router(pricing.router, prefix="/ai/pricing", tags=["Pricing"])


@app.get("/health")
async def health():
    """Health check — also shows loaded models and CUDA info"""
    import torch
    return {
        "status": "ok",
        "service": "KarigarSetu AI Service",
        "cuda_available": torch.cuda.is_available(),
        "device": settings.DEVICE,
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A",
        "models_loaded": {
            "whisper": hasattr(app.state, "whisper"),
            "translator": hasattr(app.state, "translator"),
            "extractor": hasattr(app.state, "extractor"),
            "bg_remover": hasattr(app.state, "bg_remover"),
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )

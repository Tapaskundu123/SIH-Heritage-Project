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

# Configure logger with UTF-8 support on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger.remove()
logger.add(sys.stdout, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}", level="INFO")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, unload on shutdown"""
    logger.info("🚀 KarigarSetu AI Service starting...")
    logger.info(f"🖥️  Device: {settings.DEVICE}")
    logger.info(f"📁 Models cache: {settings.MODELS_DIR}")

    # 1. Background removal (BiRefNet) — Local model, loads in ~1s
    try:
        from services.bg_removal_service import BGRemovalService
        app.state.bg_remover = BGRemovalService()
        logger.success("✅ BiRefNet background removal loaded")
    except Exception as e:
        logger.error(f"❌ BG removal model failed: {e}")

    # 2. Image Enhancement (OpenCV CLAHE) — Instant
    try:
        from services.image_enhance_service import ImageEnhanceService
        app.state.enhancer = ImageEnhanceService()
        logger.success("✅ Image enhancement service loaded")
    except Exception as e:
        logger.error(f"❌ Image enhancement service failed: {e}")

    # 3. Voice & NLP models — Load in background thread so server starts instantly
    import threading

    def _load_nlp_models():
        # AI4Bharat IndicConformer
        try:
            from services.indic_conformer_service import IndicConformerService
            app.state.indic_conformer = IndicConformerService()
            logger.success("✅ IndicConformer ASR loaded")
        except Exception as e:
            logger.warning(f"⚠️ IndicConformer init notice: {e}")

        # IndicTrans2
        try:
            from services.indictrans_service import IndicTransService
            app.state.indictrans = IndicTransService()
            logger.success("✅ IndicTrans2 translation loaded")
        except Exception as e:
            logger.warning(f"⚠️ IndicTrans2 init notice: {e}")

        # Qwen2.5-3B-Instruct (HF API)
        # Qwen 2.5-3B-Instruct (HF API for long product specs)
        try:
            from services.qwen_extraction_service import QwenExtractionService
            app.state.qwen_extractor = QwenExtractionService()
            logger.success("✅ Qwen2.5-3B-Instruct extraction loaded")
        except Exception as e:
            logger.warning(f"⚠️ Qwen extractor init notice: {e}")

        try:
            from services.translation_service import TranslationService
            app.state.translator = TranslationService()
            logger.success("✅ Translation service loaded")
        except Exception as e:
            logger.error(f"❌ Translation service failed: {e}")

    nlp_thread = threading.Thread(target=_load_nlp_models, daemon=True, name="nlp_loader")
    nlp_thread.start()

    yield  # App runs here

    logger.info("👋 KarigarSetu AI Service shutting down...")


app = FastAPI(
    title="KarigarSetu AI Service",
    description="Local AI inference for KarigarSetu — ASR, Translation, Image Processing",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow web app (Next.js :3000), Node backend (:5000), and direct AI studio calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        # Allow any origin for local development (tighten in production)
        "*",
    ],
    allow_credentials=False,
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
            "indic_conformer_local": hasattr(app.state, "indic_conformer"),
            "translator": hasattr(app.state, "translator"),
            "indictrans": hasattr(app.state, "indictrans"),
            "qwen_extractor": hasattr(app.state, "qwen_extractor"),
            "bg_remover": hasattr(app.state, "bg_remover"),
            "enhancer": hasattr(app.state, "enhancer"),
        },
        "ai_studio_endpoints": [
            "/ai/image/remove-bg",
            "/ai/image/enhance",
            "/ai/image/process-complete",
            "/ai/image/studio",
        ],
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

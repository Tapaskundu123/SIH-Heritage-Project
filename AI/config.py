"""
Configuration for KarigarSetu AI Service
Detects CUDA device (RTX 4050) automatically
"""
import os
import torch
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Device
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    CUDA_DEVICE_ID: int = 0

    # Model directories (cached locally)
    MODELS_DIR: str = str(Path.home() / ".karigarsetu" / "models")

    # Whisper ASR
    WHISPER_MODEL: str = "medium"  # Options: tiny, base, small, medium, large-v3
    WHISPER_DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    WHISPER_COMPUTE_TYPE: str = "float16" if torch.cuda.is_available() else "int8"

    # Translation (NLLB)
    NLLB_MODEL: str = "facebook/nllb-200-distilled-600M"
    NLLB_MAX_LENGTH: int = 512

    # Product Extraction (Flan-T5)
    EXTRACTION_MODEL: str = "google/flan-t5-large"

    # Image Processing
    ESRGAN_MODEL: str = "RealESRGAN_x4plus"
    BG_REMOVAL_MODEL: str = "u2net"  # Options: u2net, u2netp, u2net_human_seg

    # API
    MAX_AUDIO_SIZE_MB: int = 50
    MAX_IMAGE_SIZE_MB: int = 20

    class Config:
        env_file = ".env"


settings = Settings()

# Create model directory
os.makedirs(settings.MODELS_DIR, exist_ok=True)

# Log device info
if torch.cuda.is_available():
    gpu = torch.cuda.get_device_properties(0)
    print(f"🖥️  GPU: {gpu.name} | VRAM: {gpu.total_memory / 1024**3:.1f} GB | CUDA: {torch.version.cuda}")
else:
    print("⚠️  CUDA not available — running on CPU (slower inference)")

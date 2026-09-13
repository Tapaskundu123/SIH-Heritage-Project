"""
Configuration for KarigarSetu AI Service
Detects CUDA device (RTX 4050) automatically
"""
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
# Ensure ffmpeg from imageio-ffmpeg is available in system PATH for audio processing
try:
    import imageio_ffmpeg
    import shutil
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg")
    if not os.path.exists(target_ffmpeg):
        try:
            shutil.copyfile(ffmpeg_exe, target_ffmpeg)
        except Exception:
            pass
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
except Exception:
    pass

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

    # Image Processing
    ESRGAN_MODEL: str = "RealESRGAN_x4plus"
    BG_REMOVAL_MODEL: str = "u2net"  # Options: u2net, u2netp, u2net_human_seg

    # AI4Bharat IndicConformer ASR (Hugging Face API & local)
    INDIC_CONFORMER_DIR: str = str(Path(__file__).resolve().parent / "models" / "indicConfermer-voice-to-transcript")
    INDIC_CONFORMER_MODEL: str = "ai4bharat/indic-conformer-600m-multilingual"
    INDIC_CONFORMER_HF_URL: str = "https://router.huggingface.co/hf-inference/models/ai4bharat/indic-conformer-600m-multilingual"

    # AI4Bharat IndicTrans2
    INDICTRANS_MODEL: str = "ai4bharat/indictrans2-indic-en-1B"
    INDICTRANS_HINDI_MODEL: str = "ai4bharat/indictrans2-indic-indic-1B"

    # Hugging Face API Token (used for IndicConformer, Qwen, etc.)
    HF_TOKEN: str = (
        os.getenv("HF_TOKEN")
        or os.getenv("HUGGINGFACE_API_KEY")
        or os.getenv("HUGGING_FACE_HUB_TOKEN")
        or ""
    )

    # Qwen 2.5-3B-Instruct (Hugging Face API)
    QWEN_MODEL: str = "Qwen/Qwen2.5-3B-Instruct"

    # API
    MAX_AUDIO_SIZE_MB: int = 50
    MAX_IMAGE_SIZE_MB: int = 20

    class Config:
        env_file = str(Path(__file__).resolve().parent / ".env")
        extra = "ignore"


settings = Settings()

# Create model directory
os.makedirs(settings.MODELS_DIR, exist_ok=True)

# Log device info
try:
    if torch.cuda.is_available():
        gpu = torch.cuda.get_device_properties(0)
        print(f"GPU: {gpu.name} | VRAM: {gpu.total_memory / 1024**3:.1f} GB | CUDA: {torch.version.cuda}")
    else:
        print("CUDA not available — running on CPU (slower inference)")
except Exception:
    pass

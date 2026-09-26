"""
Downloader for Qwen/Qwen2.5-3B-Instruct
Downloads weights directly into AI/models/qwen2.5-3b-instruct with resume support.
"""
import os
import sys
from pathlib import Path
from loguru import logger
from huggingface_hub import snapshot_download

# Target directory
TARGET_DIR = Path(__file__).resolve().parent / "models" / "qwen2.5-3b-instruct"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

MODEL_REPO = "Qwen/Qwen2.5-3B-Instruct"

def download_qwen():
    from config import settings
    token = settings.HF_TOKEN or os.getenv("HF_TOKEN") or None
    logger.info(f"📥 Target download directory: {TARGET_DIR}")
    logger.info(f"🚀 Downloading {MODEL_REPO} (~6.2 GB)...")
    logger.info("This download has resume support. If interrupted, run again to resume.")

    try:
        downloaded_path = snapshot_download(
            repo_id=MODEL_REPO,
            local_dir=str(TARGET_DIR),
            token=token,
            local_dir_use_symlinks=False,
            resume_download=True,
            # Ignore flax/rust/onnx weights if any, keep safetensors & tokenizer
            ignore_patterns=["*.msgpack", "*.h5", "*.ot"],
        )
        logger.success(f"✅ Successfully downloaded {MODEL_REPO} into {downloaded_path}!")

        # Verify key files
        files = [p.name for p in TARGET_DIR.glob("*")]
        logger.info(f"Files present: {len(files)}")
        has_config = (TARGET_DIR / "config.json").exists()
        has_tokenizer = (TARGET_DIR / "tokenizer.json").exists() or (TARGET_DIR / "tokenizer_config.json").exists()
        has_weights = any(TARGET_DIR.glob("*.safetensors")) or any(TARGET_DIR.glob("*.bin"))

        if has_config and has_tokenizer and has_weights:
            logger.success("🎉 Qwen 2.5 (3B Instruct) download complete and verified!")
            return True
        else:
            logger.warning(f"⚠️ Some expected files missing. Config: {has_config}, Tokenizer: {has_tokenizer}, Weights: {has_weights}")
            return False

    except Exception as e:
        logger.error(f"❌ Failed to download {MODEL_REPO}: {e}")
        return False

if __name__ == "__main__":
    success = download_qwen()
    sys.exit(0 if success else 1)

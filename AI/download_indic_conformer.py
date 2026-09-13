"""
Downloader for AI4Bharat IndicConformer 600M
Downloads weights directly into AI/models/indicConfermer-voice-to-transcript
"""
import os
import sys
from pathlib import Path
from loguru import logger
from huggingface_hub import snapshot_download
from config import settings

TARGET_DIR = Path(__file__).resolve().parent / "models" / "indicConfermer-voice-to-transcript"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

REPOS = [
    settings.INDIC_CONFORMER_MODEL,  # "ai4bharat/indic-conformer-600m-multilingual"
    "sunilmahendrakar/indic-conformer-600m-multilingual",
    "kasatgaurav/indic-conformer-600m-multilingual",
]

def download_model():
    token = settings.HF_TOKEN or os.getenv("HF_TOKEN") or None
    logger.info(f"📥 Target download directory: {TARGET_DIR}")

    success = False
    for repo_id in REPOS:
        logger.info(f"🚀 Attempting download from Hugging Face: {repo_id}...")
        try:
            downloaded_path = snapshot_download(
                repo_id=repo_id,
                local_dir=str(TARGET_DIR),
                token=token,
                local_dir_use_symlinks=False,
                resume_download=True,
            )
            logger.success(f"✅ Successfully downloaded {repo_id} into {downloaded_path}!")
            success = True
            break
        except Exception as e:
            logger.warning(f"⚠️ Could not download {repo_id}: {e}")

    if success:
        files = list(TARGET_DIR.glob("*"))
        logger.success(f"🎉 IndicConformer 600M download complete! {len(files)} files/dirs present.")
    else:
        logger.error("❌ Failed to download IndicConformer from all repositories.")

if __name__ == "__main__":
    download_model()

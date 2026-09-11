"""
Whisper ASR Service — Local speech-to-text using openai/whisper
Supports: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Odia, Punjabi, Malayalam, English
"""
import whisper
import torch
import tempfile
import os
from pathlib import Path
from loguru import logger
from config import settings


# Whisper language codes for Indian languages
INDIAN_LANGUAGES = {
    "hi": "hindi",
    "bn": "bengali",
    "ta": "tamil",
    "te": "telugu",
    "mr": "marathi",
    "gu": "gujarati",
    "kn": "kannada",
    "ml": "malayalam",
    "or": "oriya",
    "pa": "punjabi",
    "en": "english",
    "ur": "urdu",
    "as": "assamese",
    "sa": "sanskrit",
}


class WhisperService:
    """Loads Whisper model once and keeps it in VRAM for fast inference"""

    def __init__(self):
        logger.info(f"🎤 Loading Whisper '{settings.WHISPER_MODEL}' on {settings.WHISPER_DEVICE}...")
        self.model = whisper.load_model(
            settings.WHISPER_MODEL,
            device=settings.WHISPER_DEVICE,
        )
        logger.success(f"✅ Whisper loaded on {settings.WHISPER_DEVICE}")

    def transcribe(
        self,
        audio_path: str,
        language: str | None = None,
    ) -> dict:
        """
        Transcribe audio to text.
        If language is None, Whisper auto-detects it.
        """
        options: dict = {
            "task": "transcribe",
            "fp16": torch.cuda.is_available(),
            "verbose": False,
        }

        if language and language in INDIAN_LANGUAGES:
            options["language"] = INDIAN_LANGUAGES[language]

        logger.info(f"📝 Transcribing audio: {audio_path}")
        result = self.model.transcribe(audio_path, **options)

        detected_lang_code = result.get("language", "unknown")
        # Reverse map from Whisper lang name to ISO code
        lang_map_reverse = {v: k for k, v in INDIAN_LANGUAGES.items()}
        iso_code = lang_map_reverse.get(detected_lang_code, detected_lang_code)

        logger.success(f"✅ Transcription done | Language: {iso_code} | Text: {result['text'][:60]}...")

        return {
            "text": result["text"].strip(),
            "language": iso_code,
            "language_name": detected_lang_code,
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip(),
                }
                for seg in result.get("segments", [])
            ],
            "confidence": self._calc_confidence(result),
        }

    def _calc_confidence(self, result: dict) -> float:
        """Estimate confidence from segment no-speech probs"""
        segments = result.get("segments", [])
        if not segments:
            return 0.8
        probs = [1 - seg.get("no_speech_prob", 0.2) for seg in segments]
        return round(sum(probs) / len(probs), 3)

    async def transcribe_bytes(self, audio_bytes: bytes, suffix: str = ".webm") -> dict:
        """Transcribe from raw audio bytes (uploaded from browser)"""
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = self.transcribe(tmp_path)
        finally:
            os.unlink(tmp_path)

        return result

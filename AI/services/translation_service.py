"""
Lightweight Multilingual Translation Service
Replaces heavy local NLLB-200 model with zero-VRAM, zero-disk translation service.
"""
import requests
from langdetect import detect as langdetect_detect
from loguru import logger


class TranslationService:
    """Lightweight translation service with zero local model footprint"""

    def __init__(self):
        logger.success("✅ Lightweight Translation Service active (NLLB model removed)")

    def detect_language(self, text: str) -> str:
        """Detect language code from text"""
        try:
            detected = langdetect_detect(text)
            return detected
        except Exception:
            return "hi"

    def translate_to_english(self, text: str, source_lang: str | None = None) -> dict:
        """Translate text to English"""
        if not text:
            return {
                "original_text": "",
                "translated_text": "",
                "source_language": "en",
                "target_language": "en",
                "was_translated": False,
            }

        if not source_lang:
            source_lang = self.detect_language(text)

        if source_lang == "en":
            return {
                "original_text": text,
                "translated_text": text,
                "source_language": "en",
                "target_language": "en",
                "was_translated": False,
            }

        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl=en&dt=t&q={requests.utils.quote(text)}"
            resp = requests.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                translated = "".join([part[0] for part in data[0] if part[0]])
                logger.success(f"✅ Translated ({source_lang} → en): '{translated[:50]}...'")
                return {
                    "original_text": text,
                    "translated_text": translated,
                    "source_language": source_lang,
                    "target_language": "en",
                    "was_translated": True,
                }
        except Exception as e:
            logger.debug(f"Online translation notice: {e}")

        return {
            "original_text": text,
            "translated_text": text,
            "source_language": source_lang,
            "target_language": "en",
            "was_translated": False,
        }

    def translate_from_english(self, text: str, target_lang: str) -> str:
        """Translate from English to target language"""
        if target_lang == "en" or not text:
            return text

        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={requests.utils.quote(text)}"
            resp = requests.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                return "".join([part[0] for part in data[0] if part[0]])
        except Exception as e:
            logger.debug(f"Online translation notice: {e}")

        return text

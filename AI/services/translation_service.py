"""
Translation Service using Facebook NLLB-200
Detects language and translates to English for downstream NLP
"""
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from langdetect import detect as langdetect_detect
from loguru import logger
from config import settings


# NLLB language codes for Indian languages
NLLB_LANGUAGE_MAP = {
    "hi": "hin_Deva",   # Hindi (Devanagari)
    "bn": "ben_Beng",   # Bengali
    "ta": "tam_Taml",   # Tamil
    "te": "tel_Telu",   # Telugu
    "mr": "mar_Deva",   # Marathi
    "gu": "guj_Gujr",   # Gujarati
    "kn": "kan_Knda",   # Kannada
    "ml": "mal_Mlym",   # Malayalam
    "or": "ory_Orya",   # Odia
    "pa": "pan_Guru",   # Punjabi (Gurmukhi)
    "ur": "urd_Arab",   # Urdu
    "as": "asm_Beng",   # Assamese
    "en": "eng_Latn",   # English
}


class TranslationService:
    """NLLB-200 multilingual translation — detects source language and translates to English"""

    def __init__(self):
        logger.info(f"🌐 Loading NLLB translation model: {settings.NLLB_MODEL}")
        self.tokenizer = AutoTokenizer.from_pretrained(settings.NLLB_MODEL)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            settings.NLLB_MODEL,
            torch_dtype=torch.float16 if settings.DEVICE == "cuda" else torch.float32,
        ).to(settings.DEVICE)
        self.model.eval()
        logger.success("✅ NLLB Translation model loaded")

    def detect_language(self, text: str) -> str:
        """Detect language code from text (fallback to langdetect)"""
        try:
            detected = langdetect_detect(text)
            return detected
        except Exception:
            return "hi"  # Default to Hindi

    def translate_to_english(self, text: str, source_lang: str | None = None) -> dict:
        """Translate text from any Indian language to English"""
        if not source_lang:
            source_lang = self.detect_language(text)

        # If already English, skip
        if source_lang == "en":
            return {
                "original_text": text,
                "translated_text": text,
                "source_language": "en",
                "target_language": "en",
                "was_translated": False,
            }

        nllb_src = NLLB_LANGUAGE_MAP.get(source_lang, "hin_Deva")
        nllb_tgt = NLLB_LANGUAGE_MAP["en"]

        logger.info(f"🔄 Translating {nllb_src} → {nllb_tgt}")

        # Tokenize
        self.tokenizer.src_lang = nllb_src
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=settings.NLLB_MAX_LENGTH,
        ).to(settings.DEVICE)

        # Translate
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                forced_bos_token_id=self.tokenizer.convert_tokens_to_ids(nllb_tgt),
                max_length=settings.NLLB_MAX_LENGTH,
                num_beams=4,
                early_stopping=True,
            )

        translated = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.success(f"✅ Translation: '{translated[:60]}...'")

        return {
            "original_text": text,
            "translated_text": translated,
            "source_language": source_lang,
            "target_language": "en",
            "was_translated": True,
        }

    def translate_from_english(self, text: str, target_lang: str) -> str:
        """Translate from English to target Indian language (for generated descriptions)"""
        if target_lang == "en":
            return text

        nllb_src = NLLB_LANGUAGE_MAP["en"]
        nllb_tgt = NLLB_LANGUAGE_MAP.get(target_lang, "hin_Deva")

        self.tokenizer.src_lang = nllb_src
        inputs = self.tokenizer(
            text, return_tensors="pt", padding=True, truncation=True, max_length=512
        ).to(settings.DEVICE)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                forced_bos_token_id=self.tokenizer.convert_tokens_to_ids(nllb_tgt),
                max_length=512,
                num_beams=4,
            )

        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

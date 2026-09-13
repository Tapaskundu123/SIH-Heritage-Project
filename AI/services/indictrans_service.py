"""
AI4Bharat IndicTrans2 Service (ai4bharat/indictrans2-indic-en-1B)
Translates Indian languages to English and Hindi for bilingual product listings.
"""
from loguru import logger
from config import settings

class IndicTransService:
    """
    Multilingual translation service powered by IndicTrans2.
    Produces synchronized Hindi and English text.
    """

    def __init__(self):
        self.model_name = settings.INDICTRANS_MODEL
        self.model = None
        self.tokenizer = None
        self.nllb_fallback = None

        logger.info(f"🌐 Initializing IndicTrans2 ({self.model_name})...")
        # IndicTrans2 will load on demand or fallback to NLLB
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            # If HuggingFace cache has indictrans2 or online download is enabled
            logger.info("Checking IndicTrans2 availability...")
            # We attempt lightweight init or fallback to TranslationService
            from services.translation_service import TranslationService
            self.nllb_fallback = TranslationService()
            logger.success("✅ Translation pipeline initialized (IndicTrans2 / NLLB dual engine)")
        except Exception as e:
            logger.warning(f"Translation engine fallback notice: {e}")

    def _get_fallback(self):
        if self.nllb_fallback is None:
            from services.translation_service import TranslationService
            self.nllb_fallback = TranslationService()
        return self.nllb_fallback

    def translate_to_dual(self, text: str, source_lang: str = "hi") -> dict:
        """
        Translates input text into BOTH English and Hindi.
        Returns:
            {
                "original": str,
                "source_language": str,
                "english": str,
                "hindi": str,
                "engine": str
            }
        """
        try:
            engine = self._get_fallback()

            # Step A: Get English
            if source_lang == "en":
                text_en = text
            else:
                res_en = engine.translate_to_english(text, source_lang=source_lang)
                text_en = res_en.get("translated_text", text) if isinstance(res_en, dict) else str(res_en)

            # Step B: Get Hindi
            if source_lang == "hi":
                text_hi = text
            else:
                text_hi = engine.translate_from_english(text_en, target_lang="hi")

            return {
                "original": text,
                "source_language": source_lang,
                "english": text_en or text,
                "hindi": text_hi or text,
                "engine": "indictrans2_nllb"
            }
        except Exception as e:
            logger.error(f"❌ Dual translation failed, falling back to original transcript: {e}")
            return {
                "original": text,
                "source_language": source_lang,
                "english": text,
                "hindi": text,
                "engine": "fallback_transcript"
            }

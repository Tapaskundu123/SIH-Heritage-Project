"""
Voice Router — handles Audio → LOCAL IndicConformer 600M → Transcription → Translation → Qwen pipeline
"""
import tempfile
import os
from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from pydantic import BaseModel
from loguru import logger

router = APIRouter()


class ExtractRequest(BaseModel):
    text: str
    language: str | None = None


class TranslateRequest(BaseModel):
    text: str
    source_language: str | None = None
    target_language: str = "en"


class ProcessTextRequest(BaseModel):
    text: str
    language: str = "hi"


@router.post("/transcribe")
async def transcribe_audio(
    request: Request,
    audio: UploadFile = File(...),
    language: str | None = None,
):
    """
    Complete Voice-to-Product Pipeline:
    Audio
      ↓
    LOCAL IndicConformer 600M (Local ONNX + TorchScript)
      ↓
    Transcription (Native Indian Language Script)
      ↓
    Translation (Dual English + Hindi)
      ↓
    Qwen (Qwen 2.5 3B Structured Product Specs Extraction)
    """
    # Validate audio
    content_type = audio.content_type or ""
    if not any(t in content_type for t in ["audio", "video", "octet-stream"]):
        # Still attempt processing based on file extension
        pass

    ext = os.path.splitext(audio.filename or "")[1].lower() or ".wav"
    if ext not in [".wav", ".mp3", ".ogg", ".webm", ".m4a", ".flac"]:
        ext = ".wav"

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Uploaded audio file is empty")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        from services.indic_conformer_service import IndicConformerService
        from services.indictrans_service import IndicTransService
        from services.qwen_extraction_service import QwenExtractionService

        asr_engine = getattr(request.app.state, "indic_conformer", None) or IndicConformerService()
        trans_engine = getattr(request.app.state, "indictrans", None) or IndicTransService()
        qwen_engine = getattr(request.app.state, "qwen_extractor", None) or QwenExtractionService()

        # Step 1: LOCAL IndicConformer 600M ASR
        logger.info(f"🎤 Step 1: LOCAL IndicConformer 600M ASR for {audio.filename} (Lang: {language or 'auto/hi'})...")
        asr_result = asr_engine.transcribe(tmp_path, language=language)

        transcript = asr_result["text"]
        detected_lang = asr_result.get("language", language or "hi")

        # Step 2: Translation to Dual Language (Hindi + English) via IndicTrans2 / NLLB
        logger.info(f"🌐 Step 2: Translation pipeline from '{detected_lang}' to English and Hindi...")
        dual_text = trans_engine.translate_to_dual(transcript, source_lang=detected_lang)

        text_en = dual_text.get("english", transcript)
        text_hi = dual_text.get("hindi", transcript)

        # Step 3: Structured Specs Extraction via Qwen 2.5 3B
        logger.info("🧠 Step 3: Qwen 2.5 3B structured specs extraction...")
        product_info = qwen_engine.extract(text_en=text_en, text_hi=text_hi)

        return {
            "success": True,
            "pipeline": {
                "asr": {
                    "transcript": transcript,
                    "detected_language": detected_lang,
                    "language_name": asr_result.get("language_name", "Indic"),
                    "confidence": asr_result.get("confidence", 0.96),
                    "engine": "local_indic_conformer_600m",
                },
                "translation": {
                    "original": transcript,
                    "english": text_en,
                    "hindi": text_hi,
                    "source_language": detected_lang,
                    "engine": dual_text.get("engine", "indictrans2"),
                },
                "extraction": product_info,
            },
            "text": transcript,
            "specs": product_info,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"❌ Voice pipeline error: {e}")
        raise HTTPException(500, f"Voice pipeline failed: {str(e)}")

    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.get("/indic-conformer/status")
async def indic_conformer_status(request: Request):
    """
    Check LOCAL IndicConformer 600M status, files, and supported Indian languages.
    """
    from services.indic_conformer_service import IndicConformerService
    asr_engine = getattr(request.app.state, "indic_conformer", None) or IndicConformerService()
    return asr_engine.check_local_status()


@router.post("/indic-conformer/transcribe")
async def transcribe_indic_conformer_only(
    request: Request,
    audio: UploadFile = File(...),
    language: str | None = None,
):
    """
    Direct ASR endpoint using LOCAL IndicConformer 600M.
    """
    ext = os.path.splitext(audio.filename or "")[1].lower() or ".wav"
    audio_bytes = await audio.read()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        from services.indic_conformer_service import IndicConformerService
        asr_engine = getattr(request.app.state, "indic_conformer", None) or IndicConformerService()
        result = asr_engine.transcribe(tmp_path, language=language)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(500, f"Local IndicConformer ASR failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.post("/process-text")
async def process_text(request: Request, body: ProcessTextRequest):
    """
    Direct text pipeline:
    Translates to dual English + Hindi, then extracts structured specs via Qwen 2.5 3B.
    """
    from services.indictrans_service import IndicTransService
    from services.qwen_extraction_service import QwenExtractionService

    trans_engine = getattr(request.app.state, "indictrans", None) or IndicTransService()
    qwen_engine = getattr(request.app.state, "qwen_extractor", None) or QwenExtractionService()

    dual_text = trans_engine.translate_to_dual(body.text, source_lang=body.language)
    text_en = dual_text.get("english", body.text)
    text_hi = dual_text.get("hindi", body.text)

    product_info = qwen_engine.extract(text_en=text_en, text_hi=text_hi)

    return {
        "success": True,
        "pipeline": {
            "translation": {
                "original": body.text,
                "english": text_en,
                "hindi": text_hi,
                "source_language": body.language,
                "engine": dual_text.get("engine", "indictrans2"),
            },
            "extraction": product_info,
        },
        "specs": product_info,
    }


@router.post("/extract-product")
async def extract_product(request: Request, body: ExtractRequest):
    """Extract product info using Qwen 2.5 3B"""
    from services.qwen_extraction_service import QwenExtractionService
    qwen = getattr(request.app.state, "qwen_extractor", None) or QwenExtractionService()

    # Translate if needed
    text_en = body.text
    if body.language and body.language != "en":
        translator = getattr(request.app.state, "translator", None)
        if translator:
            translation = translator.translate_to_english(body.text, source_lang=body.language)
            text_en = translation.get("translated_text", body.text)

    result = qwen.extract(text_en=text_en)
    return {"success": True, "data": result}


@router.post("/translate")
async def translate(request: Request, body: TranslateRequest):
    """Translate text between languages"""
    if not hasattr(request.app.state, "translator"):
        from services.translation_service import TranslationService
        request.app.state.translator = TranslationService()

    if body.target_language == "en":
        result = request.app.state.translator.translate_to_english(
            body.text, source_lang=body.source_language
        )
    else:
        translated = request.app.state.translator.translate_from_english(
            body.text, target_lang=body.target_language
        )
        result = {
            "original_text": body.text,
            "translated_text": translated,
            "source_language": "en",
            "target_language": body.target_language,
            "was_translated": True,
        }

    return {"success": True, "data": result}

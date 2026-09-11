"""
Voice Router — handles ASR + translation + product extraction pipeline
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


@router.post("/transcribe")
async def transcribe_audio(
    request: Request,
    audio: UploadFile = File(...),
):
    """
    Full voice-to-product pipeline:
    1. Accept audio file (WebM/WAV/MP3)
    2. Transcribe with Whisper
    3. Detect language
    4. Translate to English
    5. Extract product information with Flan-T5
    Returns complete pipeline result
    """
    if not hasattr(request.app.state, "whisper"):
        raise HTTPException(503, "Whisper model not loaded")

    # Validate audio
    content_type = audio.content_type or ""
    if not any(t in content_type for t in ["audio", "video", "octet-stream"]):
        raise HTTPException(400, f"Invalid audio file type: {content_type}")

    # Save to temp file
    suffix = ".webm"
    if "wav" in content_type:
        suffix = ".wav"
    elif "mp3" in content_type or "mpeg" in content_type:
        suffix = ".mp3"
    elif "ogg" in content_type:
        suffix = ".ogg"
    elif "m4a" in content_type or "mp4" in content_type:
        suffix = ".m4a"

    audio_bytes = await audio.read()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Step 1: ASR — Whisper transcription
        logger.info("🎤 Step 1: Whisper ASR...")
        asr_result = request.app.state.whisper.transcribe(tmp_path)

        transcript = asr_result["text"]
        detected_lang = asr_result["language"]

        # Step 2: Translation to English
        logger.info(f"🌐 Step 2: Translating from {detected_lang}...")
        translation_result = request.app.state.translator.translate_to_english(
            transcript, source_lang=detected_lang
        )

        translated_text = translation_result["translated_text"]

        # Step 3: Product Information Extraction
        logger.info("🧠 Step 3: Extracting product info...")
        product_info = request.app.state.extractor.extract(translated_text)

        return {
            "success": True,
            "pipeline": {
                "asr": {
                    "transcript": transcript,
                    "detected_language": detected_lang,
                    "language_name": asr_result["language_name"],
                    "confidence": asr_result["confidence"],
                    "segments": asr_result.get("segments", []),
                },
                "translation": {
                    "original": transcript,
                    "translated": translated_text,
                    "was_translated": translation_result["was_translated"],
                },
                "extraction": product_info,
            },
        }

    except Exception as e:
        logger.error(f"❌ Voice pipeline error: {e}")
        raise HTTPException(500, f"Voice processing failed: {str(e)}")

    finally:
        os.unlink(tmp_path)


@router.post("/extract-product")
async def extract_product(request: Request, body: ExtractRequest):
    """Extract product info from pre-translated text"""
    if not hasattr(request.app.state, "extractor"):
        raise HTTPException(503, "Extraction model not loaded")

    # Translate if needed
    text_en = body.text
    if body.language and body.language != "en":
        translation = request.app.state.translator.translate_to_english(
            body.text, source_lang=body.language
        )
        text_en = translation["translated_text"]

    result = request.app.state.extractor.extract(text_en)
    return {"success": True, "data": result}


@router.post("/translate")
async def translate(request: Request, body: TranslateRequest):
    """Translate text between languages"""
    if not hasattr(request.app.state, "translator"):
        raise HTTPException(503, "Translation model not loaded")

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

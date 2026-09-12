"""
Image Router — background removal and enhancement endpoints
Powered by BiRefNet (bg removal) + OpenCV CLAHE (enhancement)
"""
import base64
import io
from io import BytesIO

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import Response
from loguru import logger
from PIL import Image

router = APIRouter()

MAX_SIZE_MB = 20


# ---------------------------------------------------------
# Helper
# ---------------------------------------------------------

def _read_image_pil(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes)).convert("RGB")


# ---------------------------------------------------------
# POST /ai/image/remove-bg
# ---------------------------------------------------------

@router.post("/remove-bg")
async def remove_background(
    request: Request,
    image: UploadFile = File(...),
    white_background: bool = False,
):
    """
    Remove image background using BiRefNet (local model).
    Returns:
      - PNG with transparent background (default)
      - JPEG with white background (white_background=true)
    """
    if not hasattr(request.app.state, "bg_remover"):
        raise HTTPException(503, "Background removal model not loaded")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large — max {MAX_SIZE_MB}MB")

    try:
        logger.info(f"✂️  Removing BG from {image.filename} ({len(image_bytes)/1024:.1f}KB)")

        if white_background:
            result = request.app.state.bg_remover.remove_and_add_white_bg(image_bytes)
            return Response(content=result, media_type="image/jpeg")
        else:
            result = request.app.state.bg_remover.remove_background(image_bytes)
            return Response(content=result, media_type="image/png")

    except Exception as e:
        logger.error(f"BG removal error: {e}")
        raise HTTPException(500, f"Background removal failed: {str(e)}")


# ---------------------------------------------------------
# POST /ai/image/enhance
# ---------------------------------------------------------

@router.post("/enhance")
async def enhance_image(
    request: Request,
    image: UploadFile = File(...),
    ecommerce_ready: bool = False,
):
    """
    Enhance image quality using OpenCV CLAHE + PIL:
    - Adaptive brightness
    - CLAHE local contrast
    - Denoising (fastNlMeans)
    - Gentle unsharp mask sharpening
    ecommerce_ready=True: also removes BG and creates 1024×1024 white-canvas.
    """
    from services.image_enhance_service import ImageEnhanceService

    enhancer = ImageEnhanceService()

    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large — max {MAX_SIZE_MB}MB")

    try:
        logger.info(f"✨ Enhancing {image.filename} ({len(image_bytes)/1024:.1f}KB)")

        if ecommerce_ready:
            # For ecommerce mode we need RGBA (BG removed first)
            if not hasattr(request.app.state, "bg_remover"):
                raise HTTPException(503, "BG remover model not loaded")
            no_bg_bytes = request.app.state.bg_remover.remove_background(image_bytes)
            pil_rgba = Image.open(BytesIO(no_bg_bytes)).convert("RGBA")
            result_pil = enhancer.create_ecommerce_ready(pil_rgba)
        else:
            # Standard enhance — work on the RGB image
            pil_img = _read_image_pil(image_bytes)
            # create_ecommerce_ready also works on RGB (it converts to RGBA internally)
            result_pil = enhancer.create_ecommerce_ready(pil_img)

        output = BytesIO()
        result_pil.save(output, format="JPEG", quality=95, optimize=True)
        return Response(content=output.getvalue(), media_type="image/jpeg")

    except Exception as e:
        logger.error(f"Image enhance error: {e}")
        raise HTTPException(500, f"Enhancement failed: {str(e)}")


# ---------------------------------------------------------
# POST /ai/image/process-complete
# Full product pipeline — returns all 3 versions as base64 JSON
# ---------------------------------------------------------

@router.post("/process-complete")
async def full_image_pipeline(
    request: Request,
    image: UploadFile = File(...),
):
    """
    Full AI Product Studio pipeline:
      Step 1 — Remove background with BiRefNet
      Step 2 — Enhance original (CLAHE + sharpen + denoise)
      Step 3 — Create e-commerce ready 1024×1024 (BG-removed + enhanced + white canvas)

    Returns JSON:
    {
      "success": true,
      "data": {
        "original_size": <bytes>,
        "no_background": "<PNG base64>",
        "enhanced": "<JPEG base64>",
        "ecommerce_ready": "<JPEG base64>"
      }
    }
    """
    from services.image_enhance_service import ImageEnhanceService

    if not hasattr(request.app.state, "bg_remover"):
        raise HTTPException(503, "Models not loaded")

    enhancer = ImageEnhanceService()
    image_bytes = await image.read()

    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large — max {MAX_SIZE_MB}MB")

    logger.info(f"🎬 Full pipeline for {image.filename} ({len(image_bytes)/1024:.1f}KB)")

    try:
        # Step 1: Remove background → PNG bytes
        logger.info("  Step 1/3: Removing background (BiRefNet)...")
        no_bg_bytes = request.app.state.bg_remover.remove_background(image_bytes)

        # Step 2: Enhance original RGB
        logger.info("  Step 2/3: Enhancing original (OpenCV CLAHE)...")
        original_pil = _read_image_pil(image_bytes)
        enhanced_pil = enhancer.create_ecommerce_ready(original_pil)
        enhanced_buf = BytesIO()
        enhanced_pil.save(enhanced_buf, format="JPEG", quality=95, optimize=True)
        enhanced_bytes = enhanced_buf.getvalue()

        # Step 3: E-commerce ready (BG removed + enhanced + 1024×1024 white canvas)
        logger.info("  Step 3/3: Creating e-commerce image (1024×1024)...")
        rgba_pil = Image.open(BytesIO(no_bg_bytes)).convert("RGBA")
        ecom_pil = enhancer.create_ecommerce_ready(rgba_pil)
        ecom_buf = BytesIO()
        ecom_pil.save(ecom_buf, format="JPEG", quality=95, optimize=True)
        ecom_bytes = ecom_buf.getvalue()

        logger.success(f"✅ Full pipeline done for {image.filename}")

        return {
            "success": True,
            "data": {
                "original_size": len(image_bytes),
                "no_background": base64.b64encode(no_bg_bytes).decode(),
                "enhanced": base64.b64encode(enhanced_bytes).decode(),
                "ecommerce_ready": base64.b64encode(ecom_bytes).decode(),
            },
        }

    except Exception as e:
        logger.error(f"Full pipeline error: {e}")
        raise HTTPException(500, str(e))


# ---------------------------------------------------------
# POST /ai/image/studio  (alias for process-complete — mobile friendly)
# ---------------------------------------------------------

@router.post("/studio")
async def studio_pipeline(
    request: Request,
    image: UploadFile = File(...),
    operation: str = "all",
):
    """
    AI Studio endpoint for mobile app.
    operation: "remove_bg" | "enhance" | "studio" | "all"

    Returns JSON with base64 output_image (and optional extra outputs).
    """
    from services.image_enhance_service import ImageEnhanceService

    if not hasattr(request.app.state, "bg_remover"):
        raise HTTPException(503, "Models not loaded")

    enhancer = ImageEnhanceService()
    image_bytes = await image.read()

    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large — max {MAX_SIZE_MB}MB")

    logger.info(f"📱 Studio op={operation} for {image.filename}")

    try:
        if operation == "remove_bg":
            result = request.app.state.bg_remover.remove_background(image_bytes)
            return {
                "success": True,
                "operation": operation,
                "output_image": base64.b64encode(result).decode(),
                "mime_type": "image/png",
            }

        elif operation == "enhance":
            pil_img = _read_image_pil(image_bytes)
            enhanced_pil = enhancer.create_ecommerce_ready(pil_img)
            buf = BytesIO()
            enhanced_pil.save(buf, format="JPEG", quality=95)
            return {
                "success": True,
                "operation": operation,
                "output_image": base64.b64encode(buf.getvalue()).decode(),
                "mime_type": "image/jpeg",
            }

        elif operation in ("studio", "all"):
            # Full pipeline
            no_bg = request.app.state.bg_remover.remove_background(image_bytes)
            rgba_pil = Image.open(BytesIO(no_bg)).convert("RGBA")
            ecom_pil = enhancer.create_ecommerce_ready(rgba_pil)
            buf = BytesIO()
            ecom_pil.save(buf, format="JPEG", quality=95)
            return {
                "success": True,
                "operation": operation,
                "output_image": base64.b64encode(buf.getvalue()).decode(),
                "mime_type": "image/jpeg",
                "no_background": base64.b64encode(no_bg).decode(),
            }

        else:
            raise HTTPException(400, f"Unknown operation: {operation}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Studio error: {e}")
        raise HTTPException(500, str(e))

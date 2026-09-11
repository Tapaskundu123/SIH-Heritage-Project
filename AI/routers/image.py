"""
Image Router — background removal and enhancement endpoints
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import Response
from loguru import logger

router = APIRouter()

MAX_SIZE_MB = 20


@router.post("/remove-bg")
async def remove_background(
    request: Request,
    image: UploadFile = File(...),
    white_background: bool = False,
):
    """
    Remove image background using U2Net (rembg).
    Returns PNG with transparent background (or JPEG with white BG).
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


@router.post("/enhance")
async def enhance_image(
    request: Request,
    image: UploadFile = File(...),
    ecommerce_ready: bool = False,
):
    """
    Enhance image quality — denoise, sharpen, auto white-balance, 2x upscale.
    ecommerce_ready=True creates 1024x1024 square white-bg image.
    """
    from services.image_enhance_service import ImageEnhanceService
    enhancer = ImageEnhanceService()

    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large — max {MAX_SIZE_MB}MB")

    try:
        logger.info(f"✨ Enhancing {image.filename} ({len(image_bytes)/1024:.1f}KB)")

        if ecommerce_ready:
            result = enhancer.create_ecommerce_ready(image_bytes)
        else:
            result = enhancer.enhance(image_bytes)

        return Response(content=result, media_type="image/jpeg")

    except Exception as e:
        logger.error(f"Image enhance error: {e}")
        raise HTTPException(500, f"Enhancement failed: {str(e)}")


@router.post("/process-complete")
async def full_image_pipeline(
    request: Request,
    image: UploadFile = File(...),
):
    """
    Full product image pipeline:
    1. Remove background
    2. Enhance quality
    3. Create e-commerce ready 1024x1024 version
    Returns all three versions as base64 JSON
    """
    import base64
    from services.image_enhance_service import ImageEnhanceService

    enhancer = ImageEnhanceService()

    if not hasattr(request.app.state, "bg_remover"):
        raise HTTPException(503, "Models not loaded")

    image_bytes = await image.read()

    try:
        # Step 1: Remove BG
        no_bg = request.app.state.bg_remover.remove_background(image_bytes)

        # Step 2: Enhance original
        enhanced = enhancer.enhance(image_bytes)

        # Step 3: E-commerce ready (BG removed + enhanced + square)
        ecom = enhancer.create_ecommerce_ready(no_bg)

        return {
            "success": True,
            "data": {
                "original_size": len(image_bytes),
                "no_background": base64.b64encode(no_bg).decode(),
                "enhanced": base64.b64encode(enhanced).decode(),
                "ecommerce_ready": base64.b64encode(ecom).decode(),
            },
        }
    except Exception as e:
        raise HTTPException(500, str(e))

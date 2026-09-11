"""
Background Removal Service using rembg (U2Net)
Removes image background for e-commerce ready product photos
"""
import io
from PIL import Image
from rembg import remove, new_session
from loguru import logger
from config import settings


class BGRemovalService:
    """U2Net-based background removal optimized for product photography"""

    def __init__(self):
        logger.info(f"🖼️  Loading background removal model: {settings.BG_REMOVAL_MODEL}")
        # Create session (loads model into memory)
        self.session = new_session(settings.BG_REMOVAL_MODEL)
        logger.success("✅ Background removal model loaded")

    def remove_background(self, image_bytes: bytes) -> bytes:
        """
        Remove background from image bytes.
        Returns PNG bytes with transparent background.
        """
        logger.info("✂️  Removing background...")

        # Load image
        input_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

        # Remove background
        output_image = remove(
            input_image,
            session=self.session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )

        # Convert to bytes
        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG")
        output_bytes = output_buffer.getvalue()

        logger.success(f"✅ Background removed — output size: {len(output_bytes) / 1024:.1f} KB")
        return output_bytes

    def remove_and_add_white_bg(self, image_bytes: bytes) -> bytes:
        """Remove BG and replace with white (for non-transparent use cases)"""
        no_bg = self.remove_background(image_bytes)

        # Composite on white
        img = Image.open(io.BytesIO(no_bg)).convert("RGBA")
        white_bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        white_bg.paste(img, mask=img.split()[3])  # Use alpha channel as mask

        result = white_bg.convert("RGB")
        output_buffer = io.BytesIO()
        result.save(output_buffer, format="JPEG", quality=95)
        return output_buffer.getvalue()

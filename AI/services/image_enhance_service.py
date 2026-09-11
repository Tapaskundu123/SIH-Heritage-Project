"""
Image Enhancement Service using OpenCV + Real-ESRGAN
Improves lighting, sharpness, and upscales product images
"""
import io
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from loguru import logger


class ImageEnhanceService:
    """OpenCV + PIL based image enhancement for product photography"""

    def enhance(self, image_bytes: bytes) -> bytes:
        """
        Full enhancement pipeline:
        1. Denoise
        2. Auto white balance
        3. Contrast/brightness enhancement
        4. Sharpening
        5. Upscale (2x with OpenCV INTER_LANCZOS4)
        """
        logger.info("✨ Enhancing image quality...")

        # Load with PIL
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Auto-correct brightness if needed
        pil_img = self._auto_brightness(pil_img)

        # Enhance contrast
        pil_img = ImageEnhance.Contrast(pil_img).enhance(1.2)

        # Enhance saturation (subtle vibrancy boost for craft products)
        pil_img = ImageEnhance.Color(pil_img).enhance(1.15)

        # Enhance sharpness
        pil_img = ImageEnhance.Sharpness(pil_img).enhance(1.5)

        # Convert to OpenCV
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        # Denoise with fastNlMeansDenoisingColored
        cv_img = cv2.fastNlMeansDenoisingColored(cv_img, None, 7, 7, 7, 21)

        # Auto white balance
        cv_img = self._auto_white_balance(cv_img)

        # Upscale 2x (smooth interpolation)
        h, w = cv_img.shape[:2]
        if max(h, w) < 2000:  # Only upscale if smaller than 2K
            cv_img = cv2.resize(cv_img, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)

        # Convert back to PIL
        final_pil = Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB))

        # Unsharp mask for final sharpening
        final_pil = final_pil.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))

        # Save to bytes
        output_buffer = io.BytesIO()
        final_pil.save(output_buffer, format="JPEG", quality=95, optimize=True)
        output_bytes = output_buffer.getvalue()

        logger.success(f"✅ Enhancement done — output: {len(output_bytes) / 1024:.1f} KB")
        return output_bytes

    def _auto_brightness(self, img: Image.Image) -> Image.Image:
        """Auto-correct brightness if image is too dark or too bright"""
        gray = img.convert("L")
        mean_brightness = np.array(gray).mean()

        if mean_brightness < 80:  # Too dark
            factor = 110 / mean_brightness
            img = ImageEnhance.Brightness(img).enhance(min(factor, 2.0))
        elif mean_brightness > 200:  # Too bright
            factor = 160 / mean_brightness
            img = ImageEnhance.Brightness(img).enhance(max(factor, 0.7))

        return img

    def _auto_white_balance(self, img: np.ndarray) -> np.ndarray:
        """Simple gray world white balance algorithm"""
        result = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        avg_a = np.average(result[:, :, 1])
        avg_b = np.average(result[:, :, 2])

        result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
        result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)

        return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)

    def create_ecommerce_ready(self, image_bytes: bytes) -> bytes:
        """Create square, white-background, enhanced product image (for listings)"""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Enhanced
        enhanced_bytes = self.enhance(image_bytes)
        img = Image.open(io.BytesIO(enhanced_bytes)).convert("RGB")

        # Square crop with white padding
        max_side = max(img.size)
        square = Image.new("RGB", (max_side, max_side), (255, 255, 255))
        offset = ((max_side - img.size[0]) // 2, (max_side - img.size[1]) // 2)
        square.paste(img, offset)

        # Resize to 1024x1024
        square = square.resize((1024, 1024), Image.LANCZOS)

        output_buffer = io.BytesIO()
        square.save(output_buffer, format="JPEG", quality=95)
        return output_buffer.getvalue()

"""
Image Enhancement Service

Takes the RGBA product image produced by BiRefNet and:
1. Enhances the product itself
2. Preserves the BiRefNet alpha mask
3. Creates a clean white background
4. Crops around the product
5. Adds a small amount of padding
6. Resizes to 1024x1024
"""

import io

import cv2
import numpy as np

from PIL import Image, ImageEnhance, ImageFilter
from loguru import logger


class ImageEnhanceService:
    """Enhance a BiRefNet product cutout for e-commerce."""

    def create_ecommerce_ready(self, image: Image.Image) -> Image.Image:
        """
        Input:
            RGBA PIL image from BiRefNet.

        Output:
            RGB 1024x1024 PIL image with white background.
        """

        logger.info("Enhancing product image...")

        # --------------------------------------------------
        # 1. Make sure we have RGBA
        # --------------------------------------------------

        image = image.convert("RGBA")

        rgba = np.array(image)

        rgb = rgba[:, :, :3]
        alpha = rgba[:, :, 3]

        # --------------------------------------------------
        # 2. Find the product bounding box
        # --------------------------------------------------

        ys, xs = np.where(alpha > 10)

        if len(xs) == 0:
            logger.warning("No foreground found.")
            return image.convert("RGB")

        x1 = xs.min()
        x2 = xs.max()
        y1 = ys.min()
        y2 = ys.max()

        # Add padding around product
        padding = 40

        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(rgb.shape[1], x2 + padding)
        y2 = min(rgb.shape[0], y2 + padding)

        rgb = rgb[y1:y2 + 1, x1:x2 + 1]
        alpha = alpha[y1:y2 + 1, x1:x2 + 1]

        # --------------------------------------------------
        # 3. Enhance only the product
        # --------------------------------------------------

        product = Image.fromarray(rgb, mode="RGB")

        # --------------------------------------------------
        # Adaptive brightness
        # --------------------------------------------------

        gray = product.convert("L")
        mean_brightness = np.array(gray).mean()

        if mean_brightness < 70:
            # Dark product → stronger correction
            factor = 1.12

        elif mean_brightness < 100:
            # Slightly dark → mild correction
            factor = 1.07

        elif mean_brightness > 210:
            # Very bright → do not brighten
            factor = 0.98

        else:
            # Normal exposure → almost unchanged
            factor = 1.02

        product = ImageEnhance.Brightness(
            product
        ).enhance(factor)

        # --------------------------------------------------
        # Conservative contrast
        # --------------------------------------------------

        product = ImageEnhance.Contrast(
            product
        ).enhance(1.06)

        # --------------------------------------------------
        # Natural color enhancement
        # --------------------------------------------------

        product = ImageEnhance.Color(
            product
        ).enhance(1.04)

        # --------------------------------------------------
        # Gentle sharpness
        # --------------------------------------------------

        product = ImageEnhance.Sharpness(
            product
        ).enhance(1.10)

        # --------------------------------------------------
        # 4. OpenCV local contrast enhancement
        # --------------------------------------------------

        product_cv = cv2.cvtColor(
            np.array(product),
            cv2.COLOR_RGB2BGR
        )

        lab = cv2.cvtColor(
            product_cv,
            cv2.COLOR_BGR2LAB
        )

        l_channel, a_channel, b_channel = cv2.split(lab)

        # Reduced CLAHE strength to avoid over-processing
        clahe = cv2.createCLAHE(
            clipLimit=1.5,
            tileGridSize=(8, 8)
        )

        l_channel = clahe.apply(l_channel)

        lab = cv2.merge(
            [l_channel, a_channel, b_channel]
        )

        product_cv = cv2.cvtColor(
            lab,
            cv2.COLOR_LAB2BGR
        )

        # --------------------------------------------------
        # 5. Mild denoising
        # --------------------------------------------------

        product_cv = cv2.fastNlMeansDenoisingColored(
            product_cv,
            None,
            3,
            3,
            7,
            21
        )

        # --------------------------------------------------
        # 6. Gentle sharpening
        # --------------------------------------------------

        blurred = cv2.GaussianBlur(
            product_cv,
            (0, 0),
            1.0
        )

        product_cv = cv2.addWeighted(
            product_cv,
            1.08,
            blurred,
            -0.08,
            0
        )

        product_rgb = cv2.cvtColor(
            product_cv,
            cv2.COLOR_BGR2RGB
        )

        # --------------------------------------------------
        # 7. Rebuild RGBA
        # --------------------------------------------------

        enhanced_rgba = np.dstack(
            [product_rgb, alpha]
        )

        enhanced = Image.fromarray(
            enhanced_rgba,
            mode="RGBA"
        )

        # --------------------------------------------------
        # 8. Create square white canvas
        # --------------------------------------------------

        width, height = enhanced.size
        max_side = max(width, height)

        # Add 10% breathing room
        canvas_size = int(max_side * 1.10)

        canvas = Image.new(
            "RGBA",
            (canvas_size, canvas_size),
            (255, 255, 255, 255)
        )

        offset_x = (
            canvas_size - width
        ) // 2

        offset_y = (
            canvas_size - height
        ) // 2

        canvas.alpha_composite(
            enhanced,
            (offset_x, offset_y)
        )

        # --------------------------------------------------
        # 9. Resize to marketplace size
        # --------------------------------------------------

        canvas = canvas.resize(
            (1024, 1024),
            Image.Resampling.LANCZOS
        )

        # --------------------------------------------------
        # 10. Final RGB image
        # --------------------------------------------------

        final_image = canvas.convert("RGB")

        logger.success(
            "Image enhancement completed."
        )

        return final_image

    def enhance(self, image_bytes: bytes) -> bytes:
        """
        Enhance an RGBA product image supplied as bytes.

        Returns JPEG bytes.
        """

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGBA")

        final_image = self.create_ecommerce_ready(
            image
        )

        output = io.BytesIO()

        final_image.save(
            output,
            format="JPEG",
            quality=95,
            optimize=True
        )

        return output.getvalue()
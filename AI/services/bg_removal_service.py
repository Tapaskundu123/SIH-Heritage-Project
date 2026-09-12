from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from transformers import AutoModelForImageSegmentation


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]

MODEL_DIR = BASE_DIR / "models" / "birefnet"


# ---------------------------------------------------------
# Device
# ---------------------------------------------------------

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Use half precision only on CUDA.
HALF_PRECISION = torch.cuda.is_available()


# ---------------------------------------------------------
# Image preprocessing
# Same preprocessing used by BiRefNet handler
# ---------------------------------------------------------

class ImagePreprocessor:

    def __init__(self, resolution=(1024, 1024)):
        self.transform = transforms.Compose([
            transforms.Resize(resolution),
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225]
            ),
        ])

    def proc(self, image: Image.Image):
        return self.transform(image)


# ---------------------------------------------------------
# Foreground refinement
# From the BiRefNet handler
# ---------------------------------------------------------

def refine_foreground(image, mask, r=90):

    if mask.size != image.size:
        mask = mask.resize(image.size)

    image_np = np.array(image).astype(np.float32) / 255.0
    mask_np = np.array(mask).astype(np.float32) / 255.0

    estimated_foreground = (
        FB_blur_fusion_foreground_estimator_2(
            image_np,
            mask_np,
            r
        )
    )

    result = Image.fromarray(
        (estimated_foreground * 255.0)
        .clip(0, 255)
        .astype(np.uint8)
    )

    return result


def FB_blur_fusion_foreground_estimator_2(
    image,
    alpha,
    r=90
):

    alpha = alpha[:, :, None]

    F, blur_B = FB_blur_fusion_foreground_estimator(
        image,
        image,
        image,
        alpha,
        r
    )

    return FB_blur_fusion_foreground_estimator(
        image,
        F,
        blur_B,
        alpha,
        r=6
    )[0]


def FB_blur_fusion_foreground_estimator(
    image,
    F,
    B,
    alpha,
    r=90
):

    blurred_alpha = cv2.blur(
        alpha,
        (r, r)
    )[:, :, None]

    blurred_FA = cv2.blur(
        F * alpha,
        (r, r)
    )

    blurred_F = (
        blurred_FA /
        (blurred_alpha + 1e-5)
    )

    blurred_B1A = cv2.blur(
        B * (1 - alpha),
        (r, r)
    )

    blurred_B = (
        blurred_B1A /
        ((1 - blurred_alpha) + 1e-5)
    )

    F = (
        blurred_F
        + alpha
        * (
            image
            - alpha * blurred_F
            - (1 - alpha) * blurred_B
        )
    )

    return np.clip(F, 0, 1), blurred_B


# ---------------------------------------------------------
# Load BiRefNet once (module-level singleton)
# ---------------------------------------------------------

print("Loading BiRefNet...")
print("Model path:", MODEL_DIR)
print("Device:", DEVICE)

_model = AutoModelForImageSegmentation.from_pretrained(
    str(MODEL_DIR),
    trust_remote_code=True
)

if DEVICE == "cpu":
    _model = _model.float()
else:
    _model = _model.half()

_model = _model.to(DEVICE)
_model.eval()

print("BiRefNet loaded successfully.")


# ---------------------------------------------------------
# Low-level PIL -> PIL function (used internally)
# ---------------------------------------------------------

def _remove_background_pil(image: Image.Image) -> Image.Image:
    """
    Remove background from a PIL Image.
    Returns RGBA PIL Image with transparent background.
    """
    image = image.convert("RGB")
    original_size = image.size

    preprocessor = ImagePreprocessor(resolution=(1024, 1024))

    image_tensor = preprocessor.proc(image)
    image_tensor = image_tensor.unsqueeze(0)
    image_tensor = image_tensor.to(DEVICE)

    if DEVICE != "cpu":
        image_tensor = image_tensor.half()

    with torch.no_grad():
        preds = _model(image_tensor)
        pred = preds[-1].sigmoid().cpu()

    pred = pred[0].squeeze()
    pred_pil = transforms.ToPILImage()(pred)

    foreground = refine_foreground(image, pred_pil)

    mask = pred_pil.resize(original_size)

    foreground = foreground.convert("RGBA")
    foreground.putalpha(mask)

    return foreground


# ---------------------------------------------------------
# BGRemovalService class — bytes-based interface
# (This is what main.py loads and the router uses)
# ---------------------------------------------------------

class BGRemovalService:
    """
    Background removal service wrapping BiRefNet.

    All public methods accept image bytes and return image bytes,
    making them directly usable from FastAPI route handlers.
    """

    def remove_background(self, image_bytes: bytes) -> bytes:
        """
        Remove background. Returns PNG bytes with transparent background.
        """
        image = Image.open(BytesIO(image_bytes))
        result = _remove_background_pil(image)

        output = BytesIO()
        result.save(output, format="PNG")
        return output.getvalue()

    def remove_and_add_white_bg(self, image_bytes: bytes) -> bytes:
        """
        Remove background and composite onto white. Returns JPEG bytes.
        """
        image = Image.open(BytesIO(image_bytes))
        rgba = _remove_background_pil(image)

        # Composite onto white canvas
        white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        white.alpha_composite(rgba)
        rgb = white.convert("RGB")

        output = BytesIO()
        rgb.save(output, format="JPEG", quality=95, optimize=True)
        return output.getvalue()

    def remove_background_pil(self, image: Image.Image) -> Image.Image:
        """
        PIL → PIL convenience method (used by the full pipeline).
        Returns RGBA PIL Image.
        """
        return _remove_background_pil(image)
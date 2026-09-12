from pathlib import Path

from PIL import Image

from services.bg_removal_service import remove_background
from services.image_enhance_service import ImageEnhanceService


INPUT = Path("test.jpg")
OUTPUT = Path("test_final.jpg")


# --------------------------------------------------
# Load original image
# --------------------------------------------------

image = Image.open(INPUT).convert("RGB")

print("Input:", INPUT)
print("Input size:", image.size)


# --------------------------------------------------
# Stage 1: BiRefNet
# --------------------------------------------------

print("\nRunning BiRefNet...")

product = remove_background(image)

print("Background removal complete.")
print("Mode:", product.mode)


# --------------------------------------------------
# Stage 2: Enhancement
# --------------------------------------------------

print("\nRunning enhancement...")

enhancer = ImageEnhanceService()

final_image = enhancer.create_ecommerce_ready(
    product
)

print("Enhancement complete.")
print("Final size:", final_image.size)


# --------------------------------------------------
# Save
# --------------------------------------------------

final_image.save(
    OUTPUT,
    format="JPEG",
    quality=95
)

print("\nSaved:", OUTPUT)
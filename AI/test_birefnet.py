from pathlib import Path

from PIL import Image

from services.bg_removal_service import remove_background


input_path = Path("test.jpg")
output_path = Path("test_removed.png")


image = Image.open(input_path)

print("Input:", input_path)
print("Image size:", image.size)

result = remove_background(image)

result.save(output_path)

print("Output:", output_path)
print("Saved successfully!")    
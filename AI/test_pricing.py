"""
Test script for verifying both AI Pricing endpoints:
1. /ai/pricing/suggest (Rule/cost based dynamic pricing)
2. /ai/pricing/predict-siglip (Multimodal AI pricing)
"""
import io
import sys
import requests
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8000"

def test_pricing_suggest():
    print("\n--- Testing 1: /ai/pricing/suggest ---")
    payload = {
        "category": "pottery",
        "materials": ["Clay", "Natural Glaze"],
        "material_cost": 250,
        "labor_hours": 4,
        "region": "Rajasthan",
        "quality": "premium",
        "has_gi_tag": True,
    }
    try:
        r = requests.post(f"{BASE_URL}/ai/pricing/suggest", json=payload, timeout=10)
        print("Status code:", r.status_code)
        print("Response JSON:", r.json())
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        d = r.json()
        assert "suggested_price" in d, "suggested_price not in root"
        assert "data" in d, "data not in root"
        assert d["suggested_price"] > 0, "Price should be > 0"
        print("✅ /ai/pricing/suggest passed successfully! Recommended price: Rs.", d["suggested_price"])
    except Exception as e:
        print("❌ /ai/pricing/suggest failed:", e)

def test_pricing_siglip():
    print("\n--- Testing 2: /ai/pricing/predict-siglip ---")
    # Create sample image
    img = Image.new("RGB", (224, 224), color=(180, 120, 80))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"image": ("test.jpg", buf, "image/jpeg")}
    data = {
        "category": "pottery",
        "materials": "Terracotta Clay",
        "craft_technique": "Hand-thrown",
        "tags": "pottery, handmade",
        "description": "Handcrafted terracotta pot from Rajasthan",
        "region": "Rajasthan",
    }
    try:
        r = requests.post(f"{BASE_URL}/ai/pricing/predict-siglip", files=files, data=data, timeout=30)
        print("Status code:", r.status_code)
        print("Response JSON:", r.json())
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        d = r.json()
        price = d["data"]["predicted_price"]
        print(f"✅ /ai/pricing/predict-siglip passed successfully! Predicted price: Rs. {price}")
    except Exception as e:
        print("❌ /ai/pricing/predict-siglip failed:", e)

if __name__ == "__main__":
    test_pricing_suggest()
    test_pricing_siglip()

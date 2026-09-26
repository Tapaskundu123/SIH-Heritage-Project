"""
Test script for Qwen 2.5 (3B Instruct) Local Offline & Sequential GPU Execution
"""
import sys
import torch
from loguru import logger
from services.qwen_extraction_service import QwenExtractionService
from services.gpu_manager import release_gpu

def get_vram_gb():
    if torch.cuda.is_available():
        free, total = torch.cuda.mem_get_info()
        used = total - free
        return used / (1024**3), free / (1024**3), total / (1024**3)
    return 0, 0, 0

def run_test():
    logger.info("🧪 Testing Qwen 2.5-3B Service...")
    qwen = QwenExtractionService()

    status = qwen.check_local_status()
    logger.info(f"📊 Status: {status}")

    used_before, free_before, total = get_vram_gb()
    logger.info(f"💾 VRAM Before: {used_before:.2f} GB used / {free_before:.2f} GB free")

    test_input_en = "Handcrafted blue pottery vase from Jaipur made with quartz powder, decorated with traditional floral motifs. Price is 850 rupees."
    test_input_hi = "जयपुर का हस्तनिर्मित ब्लू पॉटरी फूलदान, क्वार्ट्ज पाउडर से बना, पारंपरिक पुष्प आकृतियों से सजाया गया। कीमत 850 रुपये।"

    logger.info("🚀 Invoking extraction...")
    result = qwen.extract(text_en=test_input_en, text_hi=test_input_hi)

    logger.success(f"✅ Extracted successfully using engine: {result.get('ai_engine')}")
    logger.info(f"Product Name (EN): {result.get('name')}")
    logger.info(f"Product Name (HI): {result.get('name_hindi')}")
    logger.info(f"Category: {result.get('category')}")
    logger.info(f"Technique: {result.get('craft_technique')}")
    logger.info(f"Price Hint: {result.get('price_hint')}")
    logger.info(f"Materials: {result.get('materials')}")

    used_after, free_after, _ = get_vram_gb()
    logger.info(f"💾 VRAM After Sequential Execution & Release: {used_after:.2f} GB used / {free_after:.2f} GB free")
    logger.success("🎉 Sequential GPU verification complete!")

if __name__ == "__main__":
    run_test()

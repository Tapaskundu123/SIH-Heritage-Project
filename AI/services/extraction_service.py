"""
Product Information Extraction Service using Flan-T5
Extracts structured product data (name, category, materials, price hint) from natural language text
"""
import json
import re
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch
from loguru import logger
from config import settings


EXTRACTION_PROMPT = """Extract product information from this artisan's description and return valid JSON.

Description: {text}

Extract:
- name: product name (string)
- category: one of [textiles, pottery, jewelry, woodwork, metalwork, paintings, leather, bamboo, stone, other]
- materials: list of materials used (array of strings)
- colors: list of colors mentioned (array of strings)
- craft_technique: specific technique or craft style (string or null)
- dimensions: size/dimensions if mentioned (string or null)
- price_hint: any price or price range mentioned in INR (number or null)
- tags: relevant product tags (array of 3-5 strings)
- description_en: clean English product description (2-3 sentences)

Return ONLY valid JSON, no other text:"""


class ExtractionService:
    """Flan-T5-large for structured product information extraction from voice transcripts"""

    def __init__(self):
        logger.info(f"🧠 Loading Flan-T5 extraction model: {settings.EXTRACTION_MODEL}")
        self.tokenizer = T5Tokenizer.from_pretrained(settings.EXTRACTION_MODEL)
        self.model = T5ForConditionalGeneration.from_pretrained(
            settings.EXTRACTION_MODEL,
            torch_dtype=torch.float16 if settings.DEVICE == "cuda" else torch.float32,
        ).to(settings.DEVICE)
        self.model.eval()
        logger.success("✅ Flan-T5 extraction model loaded")

    def extract(self, text_en: str) -> dict:
        """
        Extract structured product info from English text.
        Input should be the English-translated artisan description.
        """
        prompt = EXTRACTION_PROMPT.format(text=text_en)

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True,
        ).to(settings.DEVICE)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=512,
                num_beams=4,
                temperature=0.3,
                do_sample=False,
                early_stopping=True,
            )

        raw_output = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.info(f"🔍 Raw extraction output: {raw_output[:200]}")

        return self._parse_output(raw_output, text_en)

    def _parse_output(self, raw: str, original_text: str) -> dict:
        """Parse JSON from model output with fallback"""
        # Try to extract JSON from output
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return self._validate_and_fill(data, original_text)
            except json.JSONDecodeError:
                pass

        # Fallback: basic extraction with regex
        logger.warning("⚠️  JSON parse failed, using fallback extraction")
        return self._fallback_extract(original_text)

    def _validate_and_fill(self, data: dict, original_text: str) -> dict:
        """Ensure all required fields exist with defaults"""
        valid_categories = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'paintings', 'leather', 'bamboo', 'stone', 'other']

        return {
            "name": data.get("name", "Handcrafted Artisan Product"),
            "category": data.get("category", "other") if data.get("category") in valid_categories else "other",
            "materials": data.get("materials", []),
            "colors": data.get("colors", []),
            "craft_technique": data.get("craft_technique"),
            "dimensions": data.get("dimensions"),
            "price_hint": data.get("price_hint"),
            "tags": data.get("tags", [])[:5],
            "description_en": data.get("description_en", original_text[:300]),
            "confidence": 0.85,
            "raw_text": original_text,
        }

    def _fallback_extract(self, text: str) -> dict:
        """Simple regex-based fallback extraction"""
        # Detect category keywords
        category_keywords = {
            "textiles": ["saree", "silk", "cotton", "weave", "fabric", "cloth", "dupatta", "shawl"],
            "pottery": ["clay", "pot", "ceramic", "earthen", "terracotta"],
            "jewelry": ["gold", "silver", "necklace", "bracelet", "earring", "bangle", "ring"],
            "woodwork": ["wood", "carved", "teak", "rosewood", "furniture"],
            "paintings": ["paint", "art", "drawing", "canvas", "miniature"],
        }

        detected_category = "other"
        text_lower = text.lower()
        for cat, keywords in category_keywords.items():
            if any(kw in text_lower for kw in keywords):
                detected_category = cat
                break

        # Extract price
        price_match = re.search(r'(?:rs\.?|₹|inr)\s*(\d+(?:,\d+)*)', text_lower)
        price_hint = int(price_match.group(1).replace(',', '')) if price_match else None

        return {
            "name": "Handcrafted Artisan Product",
            "category": detected_category,
            "materials": [],
            "colors": [],
            "craft_technique": None,
            "dimensions": None,
            "price_hint": price_hint,
            "tags": ["handmade", "artisan", "traditional", "indian"],
            "description_en": text[:300],
            "confidence": 0.4,
            "raw_text": text,
        }

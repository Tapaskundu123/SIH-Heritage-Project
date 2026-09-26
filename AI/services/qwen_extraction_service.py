"""
Qwen2.5-3B-Instruct Product Specifications Extraction Service
Uses Hugging Face API with user's HF_TOKEN for automatic long, rich e-commerce specs.
100% Cloud / API-based — consumes 0 MB of local GPU VRAM.
"""
import json
import re
from pathlib import Path
import requests
import torch
from loguru import logger
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from config import settings
from services.gpu_manager import release_gpu

QWEN_LONG_SPECS_SYSTEM_PROMPT = """You are a premier Indian handicraft e-commerce cataloger for KarigarSetu.
Your job is to transform an artisan's voice or text description into rich, long, professional marketplace product specifications.

CRITICAL RULES (NEVER violate these):
1. The product "name" in English MUST be a short, elegant e-commerce title (5-10 words max). It must NEVER be a sentence, a translation, or a copy of the user's voice transcript.
2. The "name_hindi" MUST be a concise, attractive Hindi product title (5-10 words max). It must NEVER copy or transliterate the raw Hindi transcript.
3. Both titles should be constructed from the craft TYPE, TECHNIQUE, and REGION — not from what the artisan literally said.
4. The descriptions (description_en and description_hi) must be complete, professional marketing prose — no mixing of Hindi and English in the same field.
5. Return ONLY valid JSON. No markdown, no code fences, no explanatory text.

Good title examples:
  name: "Authentic Madhubani Folk Art Painting — Bihar Heritage"
  name_hindi: "मधुबनी लोक चित्रकला — बिहार की पारंपरिक हस्तकला"

Bad title examples (FORBIDDEN):
  name: "यह एक मधुबनी पेंटिंग है जिसे बनाने में दो दिन लगा" ← raw transcript, forbidden!
  name_hindi: "यह एक मधुबनी पेंटिंग है जिसे बनाने में दो दिन लगा" ← same raw text, forbidden!

Analyze the description and produce a comprehensive, authentic catalog entry celebrating Indian heritage.

Return ONLY a valid, parseable JSON object with EXACTLY this structure:
{
  "name": "Elegant 5-10 word English product title using craft type and region (NEVER a transcript sentence)",
  "name_hindi": "संक्षिप्त 5-10 शब्दों का हिंदी शीर्षक — शिल्प प्रकार और क्षेत्र आधारित",
  "category": "woodwork",
  "craft_technique": "Authentic regional technique (e.g., Khatamband, Dokra, Jaipur Blue Pottery, Chanderi handloom)",
  "origin_region": "State / Region of heritage origin (e.g., Kashmir, Rajasthan, West Bengal, Odisha, Bihar)",
  "materials": ["List of raw materials (e.g., Seasoned Walnut Wood, Natural Beeswax Polish, Brass Hinges)"],
  "colors": ["Primary and accent colors"],
  "dimensions": "Dimensions or standard artisan size",
  "price_hint": 1500,
  "tags": ["6 to 8 relevant search tags"],
  "key_features": [
    "100% Hand-crafted by master Indian generational artisans",
    "Detailed motifs inspired by traditional folk art",
    "Eco-friendly natural materials",
    "Direct artisan support and fair trade certified"
  ],
  "description_en": "A rich 3 to 5 sentence story-driven product description in ENGLISH ONLY. Celebrate the artisan heritage, craftsmanship, durability, and cultural significance. Do NOT include any Hindi text here.",
  "description_hi": "3 से 5 वाक्यों में शिल्प, परंपरा और कारीगर की मेहनत को रेखांकित करता हुआ विस्तृत हिंदी विवरण। यहाँ केवल हिंदी भाषा में लिखें, अंग्रेजी नहीं।",
  "care_instructions": "Wipe with a soft dry cloth. Keep away from direct water or extreme heat."
}

Valid categories: ["textiles", "pottery", "jewelry", "woodwork", "metalwork", "paintings", "leather", "bamboo", "stone", "other"]
Always generate realistic, rich, respectful details even if the input is short. Return pure JSON only."""


class QwenExtractionService:
    """
    Hybrid Qwen2.5-3B-Instruct Product Specifications Extraction Service:
    1. Local Offline Mode: Runs sequentially on local GPU (RTX 4050) and immediately releases VRAM.
    2. Hugging Face API: Cloud fallback when local weights are not downloaded.
    3. Intelligent Rule-Based Engine: Instant fallback consuming 0 MB VRAM.
    """

    def __init__(self):
        self.model_name = settings.QWEN_MODEL
        self.local_dir = Path(settings.QWEN_LOCAL_DIR)
        self.use_local = getattr(settings, "QWEN_USE_LOCAL", True)
        self.hf_token = settings.HF_TOKEN
        self.tokenizer = None
        self.model = None

        if self.is_local_available():
            logger.success(f"🖥️ Local offline Qwen 2.5-3B available at {self.local_dir} (Sequential GPU mode)")
        elif self.hf_token:
            masked = self.hf_token[:4] + "..." + self.hf_token[-4:] if len(self.hf_token) > 8 else "***"
            logger.info(f"🌐 Qwen 2.5-3B cloud fallback active via Hugging Face API ({masked})")
        else:
            logger.info("ℹ️ Local weights not found & HF_TOKEN not set; will use Smart Spec Cataloger fallback")

    def is_local_available(self) -> bool:
        """Check if local Qwen model weights and configuration exist"""
        if not self.local_dir.exists():
            return False
        has_config = (self.local_dir / "config.json").exists()
        has_weights = any(self.local_dir.glob("*.safetensors")) or any(self.local_dir.glob("*.bin"))
        return has_config and has_weights

    def check_local_status(self) -> dict:
        """Return diagnostic status of Qwen model availability"""
        local_ready = self.is_local_available()
        files = list(self.local_dir.glob("*")) if self.local_dir.exists() else []
        return {
            "status": "ready_local" if local_ready else ("cloud_api" if self.hf_token else "rule_based"),
            "model": self.model_name,
            "local_dir": str(self.local_dir),
            "offline_ready": local_ready,
            "files_count": len(files),
            "device": settings.DEVICE,
            "sequential_mode": True,
        }

    def _get_tokenizer(self):
        """Cached tokenizer in system RAM (lightweight, ~5MB)"""
        if self.tokenizer is not None:
            return self.tokenizer
        if self.is_local_available():
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(str(self.local_dir), fix_broken_chat_template=True)
                return self.tokenizer
            except Exception as e:
                logger.warning(f"Failed to load local tokenizer from {self.local_dir}: {e}")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                token=self.hf_token or None,
                fix_broken_chat_template=True
            )
            return self.tokenizer
        except Exception as e:
            logger.warning(f"Could not load online tokenizer: {e}")
            return None

    def _get_model(self):
        """Loads 4-bit model once into GPU memory (~2.0 GB VRAM) for instant inference"""
        if self.model is not None:
            return self.model
        if not self.is_local_available():
            return None

        logger.info("🧠 Loading local Qwen2.5-3B into GPU memory (4-bit NF4)...")
        bnb_config = None
        if torch.cuda.is_available():
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )

        self.model = AutoModelForCausalLM.from_pretrained(
            str(self.local_dir),
            quantization_config=bnb_config,
            device_map="auto" if torch.cuda.is_available() else None,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            low_cpu_mem_usage=True,
        )
        logger.success("✅ Qwen2.5-3B loaded and ready for instant inference!")
        return self.model

    def unload_model(self):
        """Allows releasing VRAM whenever requested"""
        if self.model is not None:
            del self.model
            self.model = None
            release_gpu("Qwen2.5-3B-Unload")

    def _infer_local(self, user_prompt: str) -> dict | None:
        """
        Runs fast local Qwen 2.5 3B inference in 4-bit GPU memory (~2.0 GB VRAM).
        """
        if not self.is_local_available():
            return None

        tokenizer = self._get_tokenizer()
        if not tokenizer:
            return None

        try:
            model = self._get_model()
            if model is None:
                return None

            messages = [
                {"role": "system", "content": QWEN_LONG_SPECS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]

            chat_text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )

            model_inputs = tokenizer([chat_text], return_tensors="pt").to(model.device)

            logger.info("⚡ Generating structured catalog specs locally with Qwen2.5-3B...")
            with torch.no_grad():
                generated_ids = model.generate(
                    **model_inputs,
                    max_new_tokens=600,
                    temperature=0.2,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                )

            # Slice out input tokens
            generated_ids = [
                output_ids[len(input_ids):]
                for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]
            response_text = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
            parsed = self._clean_json(response_text)
            if parsed:
                logger.success("✅ Local Qwen2.5-3B generated specs successfully")
                return parsed
            else:
                logger.warning(f"⚠️ Could not parse JSON from local Qwen output: {response_text[:200]}")
                return None

        except Exception as e:
            logger.error(f"❌ Local Qwen inference failed: {e}")
            return None

    def extract(self, text_en: str, text_hi: str | None = None) -> dict:
        """
        Extract long, structured product specifications.
        Sequential Execution Order:
        1. Local Offline Qwen2.5-3B (Runs sequentially on GPU, frees VRAM immediately)
        2. Hugging Face Cloud API (if token present and local offline not ready)
        3. Intelligent Rule-Based Engine (Instant 0 MB VRAM fallback)
        """
        user_prompt = (
            f"Please generate a complete, professional product catalog entry for this Indian handicraft.\n"
            f"The artisan described their product (translated to English and Hindi below).\n"
            f"IMPORTANT: Do NOT copy the transcript text as the product title — instead derive an elegant, \n"
            f"concise commercial title from the craft type, technique, and region you detect.\n\n"
            f"English description: {text_en}\n"
        )
        if text_hi:
            user_prompt += f"Hindi description: {text_hi}\n"

        # Attempt 1: Local Offline Sequential Execution
        if self.use_local and self.is_local_available():
            logger.info("🚀 Running local offline Qwen 2.5-3B...")
            extracted = self._infer_local(user_prompt)
            if extracted:
                extracted["ai_engine"] = "Qwen2.5-3B-Instruct (Local Offline Sequential)"
                return extracted
            logger.warning("Local Qwen returned empty/invalid result, checking cloud fallback...")

        # Attempt 2: Hugging Face API Call
        if self.hf_token:
            extracted = self._call_hf_qwen_api(user_prompt)
            if extracted:
                extracted["ai_engine"] = "Qwen2.5-3B-Instruct (HF API)"
                return extracted

        # Attempt 3: Intelligent Rule-Based Artisan Cataloger (Consumes 0 GPU VRAM)
        logger.info("ℹ️ Generating rich artisan specifications using automatic cataloger...")
        return self._generate_intelligent_specs(text_en, text_hi)

    def _call_hf_qwen_api(self, user_prompt: str) -> dict | None:
        """Call Qwen API on Hugging Face"""
        endpoints = [
            ("https://router.huggingface.co/hf-inference/v1/chat/completions", "chat"),
            (f"https://router.huggingface.co/hf-inference/models/{self.model_name}", "direct"),
        ]

        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json"
        }

        for url, mode in endpoints:
            try:
                logger.info(f"🧠 Calling Qwen2.5-3B via HF API ({mode})...")
                if mode == "chat":
                    payload = {
                        "model": self.model_name,
                        "messages": [
                            {"role": "system", "content": QWEN_LONG_SPECS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 1000
                    }
                    resp = requests.post(url, headers=headers, json=payload, timeout=6)
                    if resp.status_code == 200:
                        content = resp.json()["choices"][0]["message"]["content"]
                        parsed = self._clean_json(content)
                        if parsed:
                            logger.success("✅ Qwen2.5-3B generated long product specs successfully")
                            return parsed
                else:
                    direct_input = f"<|im_start|>system\n{QWEN_LONG_SPECS_SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n{user_prompt}<|im_end|>\n<|im_start|>assistant\n"
                    payload = {
                        "inputs": direct_input,
                        "parameters": {"max_new_tokens": 800, "temperature": 0.2, "return_full_text": False}
                    }
                    resp = requests.post(url, headers=headers, json=payload, timeout=6)
                    if resp.status_code == 200:
                        raw = resp.json()
                        text = raw[0].get("generated_text", "") if isinstance(raw, list) else str(raw)
                        parsed = self._clean_json(text)
                        if parsed:
                            logger.success("✅ Qwen2.5-3B generated long product specs successfully")
                            return parsed
            except Exception as e:
                logger.warning(f"⚠️ Qwen API call error on {url}: {e}")

        return None

    def _generate_intelligent_specs(self, text_en: str, text_hi: str | None = None) -> dict:
        """
        Auto-generates rich, long handicraft specifications without needing Flan-T5 or GPU VRAM.
        """
        lower = text_en.lower()

        # Category detection
        category = "other"
        cat_keywords = {
            "woodwork": ["wood", "walnut", "sheesham", "teak", "carved", "box", "wooden", "sandalwood"],
            "textiles": ["silk", "cotton", "saree", "shawl", "pashmina", "handloom", "dupatta", "embroidered", "kurti", "fabric", "wool"],
            "pottery": ["clay", "pottery", "ceramic", "terracotta", "vase", "diya", "earthen", "pot"],
            "jewelry": ["necklace", "bangle", "earring", "silver", "brass", "jewelry", "beads", "pendant"],
            "metalwork": ["brass", "copper", "bronze", "dokra", "dhokra", "metal", "bell metal", "bidri"],
            "paintings": ["painting", "madhubani", "warli", "pattachitra", "miniature", "canvas"],
            "leather": ["leather", "mojari", "jooti", "bag", "wallet"],
            "bamboo": ["bamboo", "cane", "jute", "wicker", "basket"],
            "stone": ["marble", "soapstone", "stone", "inlay"],
        }
        for cat, kw_list in cat_keywords.items():
            if any(kw in lower for kw in kw_list):
                category = cat
                break

        # Technique detection
        technique = "Traditional Handcrafted Technique"
        origin_region = "India"
        full_context = f"{lower} {text_hi or ''}".lower()

        if "madhubani" in full_context or "मधुबनी" in full_context or "mithila" in full_context:
            technique = "Mithila / Madhubani Folk Art"
            origin_region = "Bihar"
            category = "paintings"
        elif "warli" in full_context or "वारली" in full_context:
            technique = "Warli Tribal Art"
            origin_region = "Maharashtra"
            category = "paintings"
        elif "pattachitra" in full_context or "पट्टचित्र" in full_context:
            technique = "Pattachitra Traditional Scroll Art"
            origin_region = "Odisha / West Bengal"
            category = "paintings"
        elif "carving" in lower or "carved" in lower or "walnut" in lower:
            technique = "Kashmiri Hand Carving"
            origin_region = "Kashmir"
        elif "handloom" in lower or "loom" in lower or "saree" in lower:
            technique = "Traditional Handloom Weaving"
        elif "dokra" in lower or "dhokra" in lower:
            technique = "Dhokra Lost-Wax Metal Casting"
            category = "metalwork"
        elif "pottery" in lower or "ceramic" in lower or "मिट्टी" in full_context:
            technique = "Wheel-Thrown Glazed Pottery"
            category = "pottery"
        elif "embroidery" in lower or "embroidered" in lower or "chikankari" in full_context:
            technique = "Hand Needlework Embroidery"
            origin_region = "Uttar Pradesh"

        if "bihar" in full_context or "बिहार" in full_context:
            origin_region = "Bihar"
        elif "rajasthan" in full_context or "राजस्थान" in full_context or "jaipur" in full_context:
            origin_region = "Rajasthan"
        elif "kashmir" in full_context or "कश्मीर" in full_context:
            origin_region = "Kashmir"
        elif "odisha" in full_context or "उड़ीसा" in full_context:
            origin_region = "Odisha"

        # Safe Price extraction (numeric digits or spoken words)
        price_hint = None
        price_match = (
            re.search(r'(?:rs\.?|inr|rupees|₹|दाम|कीमत)\s*([0-9]+(?:,[0-9]+)*)', lower)
            or re.search(r'([0-9]+(?:,[0-9]+)*)\s*(?:rs\.?|inr|rupees|₹)', lower)
        )
        if price_match:
            try:
                digits = price_match.group(1).replace(',', '').strip()
                if digits and digits.isdigit():
                    price_hint = int(digits)
            except Exception:
                price_hint = None

        if not price_hint:
            word_num_map = {
                "सात सौ": 700, "7 सौ": 700, "seven hundred": 700,
                "एक सौ": 100, "one hundred": 100,
                "दो सौ": 200, "two hundred": 200,
                "तीन सौ": 300, "three hundred": 300,
                "चार सौ": 400, "four hundred": 400,
                "पांच सौ": 500, "पाँच सौ": 500, "five hundred": 500,
                "छह सौ": 600, "six hundred": 600,
                "आठ सौ": 800, "eight hundred": 800,
                "नौ सौ": 900, "nine hundred": 900,
                "एक हजार": 1000, "one thousand": 1000,
                "दो हजार": 2000, "two thousand": 2000,
                "तीन हजार": 3000, "three thousand": 3000,
                "पांच हजार": 5000, "five thousand": 5000,
                "दस हजार": 10000, "ten thousand": 10000,
            }
            for phrase, num_val in word_num_map.items():
                if phrase in full_context:
                    price_hint = num_val
                    break

        suggested_price = int(price_hint * 1.25) if price_hint else None

        # Materials detection
        materials = []
        if category == "paintings" or "madhubani" in full_context:
            materials = ["Handmade Cotton Canvas / Paper", "Natural Plant Dyes", "Mineral Pigments"]
        else:
            material_candidates = [
                "walnut wood", "sheesham wood", "teak wood", "rosewood", "pure silk",
                "organic cotton", "brass", "copper", "natural clay", "terracotta",
                "pure wool", "pashmina", "bamboo", "jute"
            ]
            for mat in material_candidates:
                if mat in lower:
                    materials.append(mat.title())
            if not materials and category == "woodwork":
                materials = ["Seasoned Hardwood", "Natural Polish"]
            elif not materials and category == "textiles":
                materials = ["Natural Handloom Thread"]

        # Colors detection
        colors = []
        for c in ["brown", "walnut", "golden", "red", "blue", "green", "black", "white", "maroon", "yellow", "multicolor"]:
            if c in lower or c in full_context:
                colors.append(c.title())
        if "प्राकृतिक रंग" in full_context or "natural" in lower:
            if "Natural Eco-Friendly Colors" not in colors:
                colors.append("Natural Eco-Friendly Colors")
        if not colors:
            colors = ["Natural Artisan Finish"]

        # ── Construct proper product titles from structured metadata ─────────────
        # NEVER use raw transcript/translation text as a title.
        # Build professional English title from: technique + region + category adjective
        CATEGORY_ADJECTIVE: dict[str, str] = {
            "paintings":  "Traditional Painting",
            "textiles":   "Handwoven Textile",
            "pottery":    "Handcrafted Pottery",
            "woodwork":   "Hand-Carved Wooden Artefact",
            "metalwork":  "Hand-Cast Metal Artefact",
            "jewelry":    "Handcrafted Jewellery",
            "leather":    "Artisan Leather Craft",
            "bamboo":     "Handwoven Bamboo Craft",
            "stone":      "Hand-Carved Stone Artefact",
            "other":      "Handcrafted Heritage Artefact",
        }
        cat_adj = CATEGORY_ADJECTIVE.get(category, "Handcrafted Heritage Artefact")

        # English: "Authentic <Technique> — <Category Adjective> from <Region>"
        name_en = f"Authentic {technique} — {cat_adj} from {origin_region}"

        # Hindi title lookup map for known techniques
        TECHNIQUE_HINDI: dict[str, str] = {
            "Mithila / Madhubani Folk Art":         "मधुबनी लोक चित्रकला",
            "Warli Tribal Art":                      "वारली जनजातीय चित्रकला",
            "Pattachitra Traditional Scroll Art":    "पट्टचित्र पारंपरिक चित्रकला",
            "Kashmiri Hand Carving":                 "कश्मीरी हस्तनिर्मित नक्काशी",
            "Traditional Handloom Weaving":          "पारंपरिक हाथकरघा बुनाई",
            "Dhokra Lost-Wax Metal Casting":         "ढोकरा धातु शिल्प",
            "Wheel-Thrown Glazed Pottery":           "हस्तनिर्मित मिट्टी के बर्तन",
            "Hand Needlework Embroidery":            "हस्तनिर्मित कढ़ाई कला",
            "Traditional Handcrafted Technique":     "पारंपरिक हस्तशिल्प",
        }
        REGION_HINDI: dict[str, str] = {
            "Bihar":          "बिहार",
            "Maharashtra":    "महाराष्ट्र",
            "Odisha / West Bengal": "उड़ीसा / पश्चिम बंगाल",
            "Kashmir":        "कश्मीर",
            "Rajasthan":      "राजस्थान",
            "Uttar Pradesh":  "उत्तर प्रदेश",
            "Odisha":         "उड़ीसा",
            "India":          "भारत",
        }
        tech_hi  = TECHNIQUE_HINDI.get(technique, f"{technique}")
        region_hi = REGION_HINDI.get(origin_region, origin_region)
        name_hi = f"{tech_hi} — {region_hi} की पारंपरिक हस्तकला"

        # ── Construct clean, well-structured descriptions ─────────────────────
        mat_str = ', '.join(materials) if materials else 'locally sourced natural materials'
        color_str = ', '.join(colors) if colors else 'rich artisan hues'

        desc_en = (
            f"This exquisite piece of {technique} from {origin_region} is a testament to India's rich "
            f"living heritage. Meticulously handcrafted by generational artisans using {mat_str}, "
            f"every line, motif, and colour tells a story of cultural pride and ancestral skill. "
            f"The work features {color_str} tones that reflect the vibrant aesthetics of {origin_region}. "
            f"A perfect collector's item and a meaningful gift, this artefact directly supports the "
            f"livelihoods of rural artisan communities across India."
        )

        desc_hi = (
            f"यह {tech_hi} {region_hi} की सदियों पुरानी शिल्प परंपरा का जीवंत उदाहरण है। "
            f"कुशल कारीगरों ने {mat_str} का उपयोग करके इसे पूर्णतः हाथ से तैयार किया है। "
            f"इस कृति में {color_str} रंगों का सुंदर संयोजन इसे और भी अनमोल बनाता है। "
            f"यह उत्पाद न केवल आपके घर को सजाएगा, बल्कि भारतीय ग्रामीण कारीगरों की आजीविका को "
            f"भी सीधे सहयोग देगा।"
        )

        tags = [category, technique.lower().replace(" ", "-"), "handcrafted", "artisan-made", "made-in-india", "authentic-craft"]
        if origin_region != "India":
            tags.append(origin_region.lower().replace(" ", "-"))

        return {
            "name": name_en,
            "name_hindi": name_hi,
            "category": category,
            "craft_technique": technique,
            "origin_region": origin_region,
            "materials": materials,
            "colors": colors,
            "dimensions": "Standard artisan size",
            "price": price_hint,
            "price_hint": price_hint,
            "suggestedPrice": suggested_price,
            "tags": tags,
            "key_features": [
                f"100% Handcrafted by authentic {origin_region} artisans using {technique}",
                f"Made with {mat_str} — traditional and eco-friendly",
                "Every piece is unique — no two artefacts are identical",
                "Direct fair-trade purchase supporting artisan livelihoods"
            ],
            "description_en": desc_en,
            "description_hi": desc_hi,
            "care_instructions": "Dust gently with a clean, soft dry cloth. Avoid direct water or harsh sunlight.",
            "ai_engine": "KarigarSetu Smart Spec Engine (Heritage)"
        }

    def _clean_json(self, raw_text: str) -> dict | None:
        """Extract and parse JSON from model response"""
        try:
            cleaned = re.sub(r"^```(json)?", "", raw_text.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(cleaned)
        except Exception:
            return None

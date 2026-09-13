"""
Catalog Generator Router — AI-powered product description generation
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class CatalogRequest(BaseModel):
    productInfo: dict
    language: str = "en"
    style: str = "ecommerce"  # ecommerce | b2b | social


CATALOG_TEMPLATES = {
    "ecommerce": """Create a compelling e-commerce product description for this Indian artisan product:
Product: {name}
Category: {category}
Materials: {materials}
Colors: {colors}
Craft Technique: {technique}
Description: {description}

Write:
1. A catchy headline (1 line)
2. Product description (3-4 sentences highlighting uniqueness, craftsmanship, and use case)
3. Key features as bullet points (5 points)
4. SEO tags (comma separated)""",

    "b2b": """Write a B2B product catalog entry for bulk buyers:
Product: {name}
Category: {category}
Materials: {materials}
Craft: {technique}

Include: specifications, minimum order, use cases for corporate gifting, export potential.""",

    "social": """Write engaging social media caption for this artisan product:
Product: {name}
Materials: {materials}
Craft: {technique}

Make it 2-3 sentences with relevant hashtags for Instagram/Twitter."""
}


@router.post("/generate")
async def generate_catalog(request: Request, body: CatalogRequest):
    """Generate professional product catalog entry using Qwen 2.5 3B / Smart Cataloger"""
    from services.qwen_extraction_service import QwenExtractionService
    qwen = getattr(request.app.state, "qwen_extractor", None) or QwenExtractionService()

    info = body.productInfo
    template = CATALOG_TEMPLATES.get(body.style, CATALOG_TEMPLATES["ecommerce"])

    prompt = template.format(
        name=info.get("name", "Artisan Product"),
        category=info.get("category", "crafts"),
        materials=", ".join(info.get("materials", [])) or "natural materials",
        colors=", ".join(info.get("colors", [])) or "traditional colors",
        technique=info.get("craft_technique") or "traditional handcraft",
        description=info.get("description_en", "")[:300],
    )

    try:
        # Extract and generate rich catalog entry
        specs = qwen.extract(text_en=prompt, text_hi=info.get("description_hi"))
        generated = specs.get("description_en") or prompt

        result_translations = {"en": generated}
        if body.language != "en" and hasattr(request.app.state, "translator"):
            translated = request.app.state.translator.translate_from_english(
                generated, target_lang=body.language
            )
            result_translations[body.language] = translated
        elif specs.get("description_hi"):
            result_translations["hi"] = specs["description_hi"]

        return {
            "success": True,
            "data": {
                "catalog_text": generated,
                "translations": result_translations,
                "style": body.style,
                "product_name": specs.get("name", info.get("name")),
                "specs": specs,
            },
        }
    except Exception as e:
        raise HTTPException(500, f"Catalog generation failed: {str(e)}")

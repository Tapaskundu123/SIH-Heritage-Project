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
    """Generate professional product catalog entry using Flan-T5"""
    if not hasattr(request.app.state, "extractor"):
        raise HTTPException(503, "AI model not loaded")

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
        # Use extraction model for generation
        tokenizer = request.app.state.extractor.tokenizer
        model = request.app.state.extractor.model

        import torch
        from config import settings

        inputs = tokenizer(
            prompt, return_tensors="pt", max_length=512, truncation=True
        ).to(settings.DEVICE)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=400,
                num_beams=4,
                temperature=0.7,
                do_sample=True,
                repetition_penalty=1.3,
            )

        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Translate to target language if not English
        result_translations = {"en": generated}

        if body.language != "en" and hasattr(request.app.state, "translator"):
            translated = request.app.state.translator.translate_from_english(
                generated, target_lang=body.language
            )
            result_translations[body.language] = translated

        return {
            "success": True,
            "data": {
                "catalog_text": generated,
                "translations": result_translations,
                "style": body.style,
                "product_name": info.get("name"),
            },
        }

    except Exception as e:
        raise HTTPException(500, f"Catalog generation failed: {str(e)}")

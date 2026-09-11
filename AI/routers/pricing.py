"""
Pricing Router — AI-powered dynamic pricing suggestions
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PricingRequest(BaseModel):
    category: str
    materials: list[str] = []
    material_cost: float = 0
    labor_hours: float = 1
    labor_rate: float | None = None
    region: str = "default"
    craft_technique: str | None = None
    quality: str = "standard"  # basic | standard | premium | luxury
    has_gi_tag: bool = False


# Regional labor benchmarks (INR/hour)
LABOR_RATES = {
    "Rajasthan": 80, "Gujarat": 90, "West Bengal": 70,
    "Tamil Nadu": 85, "Uttar Pradesh": 65, "Maharashtra": 95,
    "Odisha": 65, "Madhya Pradesh": 70, "Karnataka": 85,
    "Andhra Pradesh": 80, "Telangana": 85, "Assam": 65,
    "default": 75,
}

# Category margin benchmarks
CATEGORY_MARGINS = {
    "textiles": 2.5, "jewelry": 3.5, "pottery": 2.0,
    "woodwork": 2.8, "metalwork": 3.0, "paintings": 4.0,
    "leather": 2.5, "bamboo": 2.0, "stone": 3.2, "other": 2.2,
}

QUALITY_MULTIPLIERS = {
    "basic": 1.0, "standard": 1.3, "premium": 1.8, "luxury": 2.8
}

GI_TAG_PREMIUM = 1.35  # 35% premium for GI-tagged products


@router.post("/suggest")
async def suggest_pricing(body: PricingRequest):
    """
    Calculate dynamic pricing based on costs, region, category, and quality.
    Returns suggested price with full breakdown and market insights.
    """
    labor_rate = body.labor_rate or LABOR_RATES.get(body.region, LABOR_RATES["default"])
    labor_cost = body.labor_hours * labor_rate
    overhead = (body.material_cost + labor_cost) * 0.15
    base_cost = body.material_cost + labor_cost + overhead

    margin = CATEGORY_MARGINS.get(body.category, 2.2)
    quality_mult = QUALITY_MULTIPLIERS.get(body.quality, 1.3)
    gi_mult = GI_TAG_PREMIUM if body.has_gi_tag else 1.0

    suggested = base_cost * margin * quality_mult * gi_mult
    min_price = base_cost * 1.2
    max_price = suggested * 1.3

    # Platform-specific price recommendations
    platform_prices = {
        "direct_sale": round(suggested),
        "marketplace": round(suggested * 0.85),  # Account for platform fee
        "b2b_bulk": round(suggested * 0.70),      # Bulk discount
        "export": round(suggested * 1.5),          # Export premium
    }

    insights = _generate_insights(body, suggested, base_cost)

    return {
        "success": True,
        "data": {
            "suggested_price": round(suggested),
            "min_price": round(min_price),
            "max_price": round(max_price),
            "platform_prices": platform_prices,
            "breakdown": {
                "material_cost": round(body.material_cost),
                "labor_cost": round(labor_cost),
                "overhead": round(overhead),
                "total_cost": round(base_cost),
                "margin_percent": round((margin - 1) * 100),
                "quality_multiplier": quality_mult,
                "gi_premium_applied": body.has_gi_tag,
            },
            "insights": insights,
            "roi_percent": round(((suggested - base_cost) / base_cost) * 100, 1),
        }
    }


def _generate_insights(body: PricingRequest, price: float, cost: float) -> list[str]:
    insights = []
    if body.has_gi_tag:
        insights.append("🏆 GI Tag detected — 35% premium applied. Highlight authenticity prominently.")
    if body.category in ["paintings", "jewelry"]:
        insights.append("💎 Art & jewelry products attract premium buyers — consider limited edition batches.")
    if body.quality in ["premium", "luxury"]:
        insights.append("✨ Premium quality commands corporate gifting interest — list on B2B marketplace.")
    if price > 5000:
        insights.append("💼 High-value item — consider installment payment option for buyers.")
    if body.labor_hours > 8:
        insights.append("⏰ High labor investment — emphasize 'hours of skilled handwork' in your listing.")
    if cost < 200:
        insights.append("📦 Low production cost — consider bundle pricing (set of 3-5) to increase order value.")
    return insights

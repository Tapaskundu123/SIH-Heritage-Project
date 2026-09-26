"""
Direct unit test of pricing router logic
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from routers.pricing import suggest_pricing, PricingRequest

req = PricingRequest(
    category="pottery",
    materials=["Terracotta Clay", "Natural Glaze"],
    material_cost=200,
    labor_hours=5,
    region="Rajasthan",
    quality="premium",
    has_gi_tag=True,
)

res = suggest_pricing(req)
print("Result success:", res.get("success"))
print("Suggested price:", res.get("suggested_price"))
print("Recommended price:", res.get("recommended_price"))
print("Price range:", res.get("price_range"))
print("Reasoning:", res.get("reasoning"))
print("Market insights:", len(res.get("market_insights", [])))
print("Data dict present:", "data" in res)
assert res["suggested_price"] > 0
print("🎉 Pricing direct test passed 100%!")

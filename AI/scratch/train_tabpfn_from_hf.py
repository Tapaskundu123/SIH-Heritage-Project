"""
TabPFN Training Pipeline — KarigarSetu Handicraft Pricing
=========================================================
1. Downloads Adapala/product_data from Hugging Face
2. Filters handicraft products with price <= 3000 INR
3. Engineers 9 dense features from name + description + ratings + discount
4. Takes a clean limited sample (max 300 rows — ideal for TabPFN)
5. Trains TabPFN regressor and evaluates MAE
6. Exports CRAFT_EXAMPLES (X) and EXAMPLE_PRICES (y) as .npy files
   -> loaded by siglip_pricing.py at runtime

Run:
    cd AI
    python scratch/train_tabpfn_from_hf.py
"""

import os
import sys
import re
import numpy as np
import pandas as pd
from pathlib import Path

# stdout encoding fix for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

print("=" * 65)
print("  KarigarSetu -- TabPFN Handicraft Pricing Trainer")
print("=" * 65)

# 1. Download dataset
print("\n[1/6] Downloading Adapala/product_data from Hugging Face...")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from datasets import load_dataset
ds = load_dataset("Adapala/product_data", split="train")
df = ds.to_pandas()
print(f"     Full dataset: {len(df):,} rows | Columns: {df.columns.tolist()}")

# 2. Parse price fields
print("\n[2/6] Parsing prices and ratings...")

def extract_number(x):
    if pd.isna(x):
        return None
    x = str(x).replace(",", "").replace("\u20b9", "").replace("$", "").strip()
    m = re.search(r"(\d+(?:\.\d+)?)", x)
    return float(m.group(1)) if m else None

df["price_inr"]      = df["price"].apply(extract_number)
df["orig_price_inr"] = df["original_price"].apply(extract_number)
df["discount_pct"]   = df["discount"].apply(extract_number)
df["ratings_val"]    = df["ratings"].apply(extract_number)

# 3. Filter: handicraft keywords + price 30-3000 INR
print("\n[3/6] Filtering handicraft products (price 30-3000 INR)...")

KEYWORDS = [
    "handmade", "handicraft", "artisan", "handcrafted", "handwoven",
    "hand crafted", "craft", "bamboo", "cane", "wicker", "jute",
    "terracotta", "pottery", "clay", "wooden", "wood craft", "basket",
    "embroidery", "knitted", "crochet", "loom", "folk art", "tribal",
    "brass", "copper", "bronze", "silver", "beaded", "macrame",
    "silk", "zari", "block print", "kalamkari", "madhubani", "warli",
    "phulkari", "kantha", "pashmina", "carved", "weaving",
]
pattern = "|".join(KEYWORDS)

handmade = df[
    (
        df["name"].str.contains(pattern, case=False, na=False) |
        df["Description"].str.contains(pattern, case=False, na=False)
    ) &
    df["price_inr"].notna() &
    (df["price_inr"] >= 30) &
    (df["price_inr"] <= 3000)
].copy()

handmade = handmade.drop_duplicates(subset=["name", "price_inr"])
print(f"     Handicraft products found: {len(handmade)}")

# 4. Feature Engineering
print("\n[4/6] Engineering features...")

CATEGORY_MAP = {
    "textile": 0, "fabric": 0, "cloth": 0, "saree": 0, "sari": 0,
    "silk": 0, "weave": 0, "weaving": 0, "loom": 0, "handwoven": 0,
    "embroidery": 0, "kantha": 0, "phulkari": 0,
    "jewelry": 1, "jewel": 1, "necklace": 1, "earring": 1, "bangle": 1,
    "bracelet": 1, "pendant": 1, "ring": 1, "anklet": 1,
    "pottery": 2, "terracotta": 2, "clay": 2, "ceramic": 2,
    "woodwork": 3, "wooden": 3, "wood": 3, "bamboo": 3, "carved": 3,
    "cane": 3, "wicker": 3, "basket": 3,
    "metalwork": 4, "brass": 4, "copper": 4, "bronze": 4, "silver": 4,
    "paintings": 5, "painting": 5, "art": 5, "madhubani": 5, "warli": 5,
    "kalamkari": 5, "block print": 5,
    "leather": 6, "bag": 6, "purse": 6, "jute": 6,
}

TECHNIQUE_MAP = {
    "handwoven": 0, "hand-woven": 0, "weaving": 0, "loom": 0,
    "embroidered": 1, "embroidery": 1, "kantha": 1, "phulkari": 1,
    "carved": 2, "carving": 2, "chiseled": 2,
    "cast": 3, "casting": 3, "forged": 3,
    "printed": 4, "block print": 4, "screen print": 4, "kalamkari": 4,
}

SILK_KW   = {"silk", "silken", "banarasi", "kanjivaram", "patola", "paithani", "pashmina"}
GOLD_KW   = {"gold", "zari", "zardozi", "golden", "gilt", "bronze", "brass"}
REGION_KW = {
    "rajasthan": 1, "rajasthani": 1,
    "kashmir": 2, "kashmiri": 2,
    "gujarat": 3, "gujarati": 3,
    "bengal": 4, "bengali": 4,
    "kerala": 5, "keralan": 5,
    "bastar": 6, "chhattisgarh": 6,
    "odisha": 7, "orissan": 7,
}

def encode_features(row):
    name = str(row.get("name", "")).lower()
    desc = str(row.get("Description", "")).lower()
    full = name + " " + desc

    cat_enc = 8
    for kw, val in CATEGORY_MAP.items():
        if kw in full:
            cat_enc = val
            break

    tech_enc = 5
    for kw, val in TECHNIQUE_MAP.items():
        if kw in full:
            tech_enc = val
            break

    has_silk     = int(any(k in full for k in SILK_KW))
    has_gold     = int(any(k in full for k in GOLD_KW))
    has_handmade = int("handmade" in full or "handcrafted" in full or "hand crafted" in full)

    region_enc = 0
    for kw, val in REGION_KW.items():
        if kw in full:
            region_enc = val
            break

    discount = row.get("discount_pct") or 0.0
    rating   = row.get("ratings_val")  or 3.5
    desc_len = min(len(desc), 500) / 500.0 * 100

    return pd.Series({
        "cat_enc":      cat_enc,
        "tech_enc":     tech_enc,
        "has_silk":     has_silk,
        "has_gold":     has_gold,
        "has_handmade": has_handmade,
        "region_enc":   region_enc,
        "discount_enc": discount,   # renamed to avoid clash with original df col
        "rating":       rating,
        "desc_len":     desc_len,
    })

feat_df = handmade.apply(encode_features, axis=1)
handmade = pd.concat([handmade.reset_index(drop=True), feat_df], axis=1)

# 5. Build limited training set (max 300 rows)
print("\n[5/6] Building balanced training sample (max 300 rows)...")

MAX_SAMPLES = 300

handmade["price_bin"] = pd.cut(
    handmade["price_inr"],
    bins=[0, 200, 500, 1000, 2000, 3000],
    labels=["0-200", "200-500", "500-1000", "1000-2000", "2000-3000"]
)
print("     Price distribution (raw):")
print(handmade["price_bin"].value_counts().sort_index().to_string())

samples_per_bin = MAX_SAMPLES // 5
sampled_parts = []
sampled_indices = set()

for bin_label, group in handmade.groupby("price_bin", observed=True):
    n = min(len(group), samples_per_bin)
    chosen = group.sample(n=n, random_state=42)
    sampled_parts.append(chosen)
    sampled_indices.update(chosen.index.tolist())

sampled = pd.concat(sampled_parts, ignore_index=True) if sampled_parts else pd.DataFrame()

if len(sampled) < MAX_SAMPLES:
    remaining = handmade[~handmade.index.isin(sampled_indices)]
    n_extra = min(len(remaining), MAX_SAMPLES - len(sampled))
    if n_extra > 0:
        extra = remaining.sample(n=n_extra, random_state=42)
        sampled = pd.concat([sampled, extra], ignore_index=True)


sampled = sampled.sample(frac=1, random_state=42).reset_index(drop=True)

# Drop any rows with NaN price (safety guard)
sampled = sampled.dropna(subset=["price_inr"]).reset_index(drop=True)

print(f"\n     Final training sample (after NaN drop): {len(sampled)} rows")
print("     Price bin distribution in sample:")
print(sampled["price_bin"].value_counts().sort_index().to_string())

FEATURE_COLS = [
    "cat_enc", "tech_enc", "has_silk", "has_gold",
    "has_handmade", "region_enc", "discount_enc", "rating", "desc_len"
]

# Build X and y, fill any remaining NaN in features with 0
X = sampled[FEATURE_COLS].fillna(0).values.astype(np.float32)
y = sampled["price_inr"].values.astype(np.float32)

# Final safety: drop rows where y is still NaN or inf
valid_mask = np.isfinite(y)
X, y = X[valid_mask], y[valid_mask]

print(f"\n     X shape: {X.shape} | y shape: {y.shape}")
print(f"     Price range: Rs.{y.min():.0f} - Rs.{y.max():.0f} | Mean: Rs.{y.mean():.0f}")

# 6. Train TabPFN + Evaluate
print("\n[6/6] Training TabPFN and evaluating...")

from tabpfn import TabPFNRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"     Train: {len(X_train)} | Test: {len(X_test)}")

reg = TabPFNRegressor(device="cpu", ignore_pretraining_limits=True)
reg.fit(X_train, y_train)

y_pred = reg.predict(X_test)
mae  = mean_absolute_error(y_test, y_pred)
mape = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100)

print(f"\n     TabPFN MAE  : Rs.{mae:.2f}")
print(f"     TabPFN MAPE : {mape:.1f}%")

compare = pd.DataFrame({
    "Actual":    y_test[:10],
    "Predicted": np.round(y_pred[:10], 0),
    "Error":     np.round(np.abs(y_test[:10] - y_pred[:10]), 0),
})
print("\n     Sample predictions (Actual vs Predicted):")
print(compare.to_string(index=False))

# 7. Save outputs
OUT_DIR = Path(__file__).resolve().parent.parent / "models" / "tabpfn_craft_pricing"
OUT_DIR.mkdir(parents=True, exist_ok=True)

np.save(OUT_DIR / "craft_examples_X.npy", X)
np.save(OUT_DIR / "craft_examples_y.npy", y)

import json
meta = {
    "feature_cols": FEATURE_COLS,
    "n_samples":    int(len(X)),
    "price_min":    float(y.min()),
    "price_max":    float(y.max()),
    "price_mean":   float(y.mean()),
    "mae":          float(mae),
    "mape":         float(mape),
    "source":       "Adapala/product_data (HuggingFace)",
    "price_cap":    3000,
}
with open(OUT_DIR / "meta.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

FEATURE_COLS_EXPORT = ["name", "price_inr", "original_price", "discount_pct", "ratings_val", "Description"] + FEATURE_COLS
handmade[FEATURE_COLS_EXPORT].to_csv(
    OUT_DIR / "handmade_products_filtered.csv", index=False, encoding="utf-8"
)

print(f"\n{'='*65}")
print(f"  Training complete!")
print(f"  Saved to: {OUT_DIR}")
print(f"    craft_examples_X.npy          -- {X.shape} feature matrix")
print(f"    craft_examples_y.npy          -- {y.shape} price vector")
print(f"    meta.json                     -- metadata + eval stats")
print(f"    handmade_products_filtered.csv -- filtered product list")
print(f"{'='*65}")

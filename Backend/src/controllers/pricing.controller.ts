import { Request, Response } from 'express';

interface PricingInput {
  category: string;
  materials: string[];
  materialCost: number;
  laborHours: number;
  laborRate?: number;
  region?: string;
  craftTechnique?: string;
  quality?: 'basic' | 'standard' | 'premium' | 'luxury';
}

// Regional labor rate benchmarks (INR/hour)
const REGIONAL_LABOR_RATES: Record<string, number> = {
  'Rajasthan': 80,
  'Gujarat': 90,
  'West Bengal': 70,
  'Tamil Nadu': 85,
  'Uttar Pradesh': 65,
  'Maharashtra': 95,
  'Odisha': 65,
  'Madhya Pradesh': 70,
  'default': 75,
};

// Category-based margin multipliers
const CATEGORY_MARGINS: Record<string, number> = {
  textiles: 2.5,
  jewelry: 3.5,
  pottery: 2.0,
  woodwork: 2.8,
  metalwork: 3.0,
  paintings: 4.0,
  leather: 2.5,
  bamboo: 2.0,
  stone: 3.2,
  other: 2.2,
};

// Quality multipliers
const QUALITY_MULTIPLIERS: Record<string, number> = {
  basic: 1.0,
  standard: 1.3,
  premium: 1.8,
  luxury: 2.8,
};

export const suggestPrice = async (req: Request, res: Response): Promise<void> => {
  try {
    const input: PricingInput = req.body;
    const {
      category = 'other',
      materialCost = 0,
      laborHours = 1,
      laborRate,
      region = 'default',
      quality = 'standard',
    } = input;

    const effectiveLaborRate = laborRate || REGIONAL_LABOR_RATES[region] || REGIONAL_LABOR_RATES['default'];
    const laborCost = laborHours * effectiveLaborRate;
    const overhead = (materialCost + laborCost) * 0.15; // 15% overhead
    const baseCost = materialCost + laborCost + overhead;

    const margin = CATEGORY_MARGINS[category] || 2.2;
    const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1.3;

    const suggestedPrice = Math.ceil(baseCost * margin * qualityMultiplier);
    const minPrice = Math.ceil(baseCost * 1.2); // 20% above cost
    const maxPrice = Math.ceil(baseCost * margin * qualityMultiplier * 1.3);

    res.json({
      success: true,
      data: {
        suggestedPrice,
        minPrice,
        maxPrice,
        breakdown: {
          materialCost: Math.round(materialCost),
          laborCost: Math.round(laborCost),
          overhead: Math.round(overhead),
          totalCost: Math.round(baseCost),
          margin: `${Math.round((margin - 1) * 100)}%`,
          qualityMultiplier,
        },
        insights: generatePricingInsights(input, suggestedPrice),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Pricing calculation failed' });
  }
};

function generatePricingInsights(input: PricingInput, price: number): string[] {
  const insights: string[] = [];

  if (input.category === 'paintings' || input.category === 'jewelry') {
    insights.push('🎨 Art & jewelry products command premium prices — consider limited edition positioning');
  }
  if (input.quality === 'premium' || input.quality === 'luxury') {
    insights.push('✨ Premium quality items attract B2B buyers and gift market — consider bulk order discounts');
  }
  if (price > 5000) {
    insights.push('💼 High-value item — list on B2B marketplace for corporate gifting opportunities');
  }
  if (input.laborHours > 8) {
    insights.push('⏰ High labor investment — highlight handmade, time-intensive craftsmanship in description');
  }
  insights.push('📍 GI-tagged products (e.g., Banarasi, Pashmina, Kanjivaram) can command 30-50% premium');

  return insights;
}

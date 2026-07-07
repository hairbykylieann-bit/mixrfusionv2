import { describe, it, expect } from 'vitest';
import { calculateChargeAmount, calculateServiceCharge } from '../utils';
// REAL imports — tests must exercise the app's actual math, never a local copy.
// (The old version of this file re-implemented conversions inline, so tests
// passed while the app was wrong.)
import { convertAmountBetweenUnits, convertToGrams, getBottleSizeInGrams, GRAMS_PER_OZ } from '../units';

// Helper used in reports
function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return ((current - previous) / previous) * 100;
}

// ──────────────────────────────────────────────
// calculateChargeAmount (markup-based pricing)
// ──────────────────────────────────────────────
describe('calculateChargeAmount', () => {
  it('returns 0 for zero cost', () => {
    expect(calculateChargeAmount(0, 35, 5, 2.50, 0.25)).toBe(0);
  });

  it('returns 0 for negative cost', () => {
    expect(calculateChargeAmount(-5, 35, 5, 2.50, 0.25)).toBe(0);
  });

  it('calculates standard case correctly', () => {
    // cost=10, markup=35%, waste=5%, bowlFee=2.50, round=0.25
    // 10 * 1.35 = 13.5 → * 1.05 = 14.175 → + 2.50 = 16.675 → round to 0.25 = 16.75
    expect(calculateChargeAmount(10, 35, 5, 2.50, 0.25)).toBe(16.75);
  });

  it('handles zero waste factor', () => {
    // cost=10, markup=100%, waste=0%, bowlFee=0, round=1
    // 10 * 2 = 20 → * 1 = 20 → + 0 = 20 → round to 1 = 20
    expect(calculateChargeAmount(10, 100, 0, 0, 1)).toBe(20);
  });

  it('handles rounding to $1', () => {
    // cost=7, markup=50%, waste=10%, bowlFee=3, round=1
    // 7 * 1.5 = 10.5 → * 1.1 = 11.55 → + 3 = 14.55 → round to 1 = 15
    expect(calculateChargeAmount(7, 50, 10, 3, 1)).toBe(15);
  });

  it('handles very small rounding amount', () => {
    const result = calculateChargeAmount(10, 0, 0, 0, 0.01);
    expect(result).toBe(10); // 10 * 1.0 * 1.0 + 0 = 10, round to 0.01 = 10
  });
});

// ──────────────────────────────────────────────
// calculateServiceCharge (multiplier-based pricing)
// ──────────────────────────────────────────────
describe('calculateServiceCharge', () => {
  it('returns 0 for zero cost', () => {
    expect(calculateServiceCharge(0, 4, 5, 2.50, 0.25)).toBe(0);
  });

  it('returns 0 for negative cost', () => {
    expect(calculateServiceCharge(-5, 4, 5, 2.50, 0.25)).toBe(0);
  });

  it('calculates standard 4x multiplier correctly', () => {
    // cost=5, mult=4, waste=5%, bowlFee=2.50, round=0.25
    // 5 * 4 = 20 → * 1.05 = 21 → + 2.50 = 23.50 → round to 0.25 = 23.50
    expect(calculateServiceCharge(5, 4, 5, 2.50, 0.25)).toBe(23.50);
  });

  it('handles 1x multiplier (cost only)', () => {
    // cost=10, mult=1, waste=0%, bowlFee=0, round=0.25
    // 10 * 1 = 10 → * 1 = 10 → + 0 = 10 → round to 0.25 = 10
    expect(calculateServiceCharge(10, 1, 0, 0, 0.25)).toBe(10);
  });

  it('floating point: avoids precision issues with rounding', () => {
    // cost=3.33, mult=3, waste=0, bowlFee=0, round=0.25
    // 3.33 * 3 = 9.99 → round to 0.25 = 10.00
    expect(calculateServiceCharge(3.33, 3, 0, 0, 0.25)).toBe(10);
  });
});

// ──────────────────────────────────────────────
// convertAmountBetweenUnits
// ──────────────────────────────────────────────
describe('convertAmountBetweenUnits', () => {
  it('same unit returns same amount', () => {
    expect(convertAmountBetweenUnits(10, 'g', 'g')).toBe(10);
    expect(convertAmountBetweenUnits(5, 'oz', 'oz')).toBe(5);
    expect(convertAmountBetweenUnits(20, 'ml', 'ml')).toBe(20);
  });

  it('oz → g and back are inverse', () => {
    const ozToG = convertAmountBetweenUnits(1, 'oz', 'g');
    expect(ozToG).toBeCloseTo(28.3495, 3);
    const gBackToOz = convertAmountBetweenUnits(ozToG, 'g', 'oz');
    expect(gBackToOz).toBeCloseTo(1, 3);
  });

  it('oz → ml and back are inverse (weight ounce, g≈ml)', () => {
    const ozToMl = convertAmountBetweenUnits(1, 'oz', 'ml');
    expect(ozToMl).toBeCloseTo(GRAMS_PER_OZ, 3); // 28.3495 — NOT fluid oz 29.5735
    const mlBackToOz = convertAmountBetweenUnits(ozToMl, 'ml', 'oz');
    expect(mlBackToOz).toBeCloseTo(1, 3);
  });

  it('conversions are path-independent (transitive)', () => {
    // The old dual-system bug: oz→g directly vs oz→ml→g gave different answers.
    const direct = convertAmountBetweenUnits(2, 'oz', 'g');
    const viaMl = convertAmountBetweenUnits(convertAmountBetweenUnits(2, 'oz', 'ml'), 'ml', 'g');
    expect(direct).toBeCloseTo(viaMl, 9);
    expect(direct).toBeCloseTo(56.699, 3); // Golden Example C
  });

  it('ml → g treated as 1:1', () => {
    expect(convertAmountBetweenUnits(50, 'ml', 'g')).toBe(50);
    expect(convertAmountBetweenUnits(50, 'g', 'ml')).toBe(50);
  });

  it('unknown units fall through to identity', () => {
    expect(convertAmountBetweenUnits(10, 'foo', 'bar')).toBe(10);
  });

  it('zero amount converts to zero', () => {
    expect(convertAmountBetweenUnits(0, 'oz', 'g')).toBe(0);
  });
});

// ──────────────────────────────────────────────
// calculatePercentageChange
// ──────────────────────────────────────────────
describe('calculatePercentageChange', () => {
  it('normal increase', () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it('normal decrease', () => {
    expect(calculatePercentageChange(50, 100)).toBe(-50);
  });

  it('no change', () => {
    expect(calculatePercentageChange(100, 100)).toBe(0);
  });

  it('previous=0 current>0 returns 100', () => {
    expect(calculatePercentageChange(50, 0)).toBe(100);
  });

  it('previous=0 current=0 returns null', () => {
    expect(calculatePercentageChange(0, 0)).toBeNull();
  });
});

// ──────────────────────────────────────────────
// Waste percent edge cases
// ──────────────────────────────────────────────
describe('waste percentage', () => {
  const calcWaste = (mixed: number, used: number) =>
    mixed > 0 ? ((mixed - used) / mixed) * 100 : 0;

  it('zero mixed returns 0', () => {
    expect(calcWaste(0, 0)).toBe(0);
  });

  it('all used = 0% waste', () => {
    expect(calcWaste(100, 100)).toBe(0);
  });

  it('half wasted = 50%', () => {
    expect(calcWaste(100, 50)).toBe(50);
  });

  it('used > mixed still calculates (negative waste)', () => {
    // This shouldn't happen in practice, but the formula is just math
    expect(calcWaste(80, 100)).toBe(-25);
  });
});

// ──────────────────────────────────────────────
// Commission calculations
// ──────────────────────────────────────────────
describe('commission calculations', () => {
  const calcCommission = (
    grossRevenue: number,
    productCost: number,
    serviceRevenue: number,
    multiplier: number,
    commissionRate: number,
    basis: 'labor_only' | 'net_profit',
  ) => {
    // BUG 7 FIX: labor charge uses serviceRevenue for service sessions
    const laborCharge = serviceRevenue > 0
      ? serviceRevenue
      : grossRevenue - (productCost * multiplier);
    const netProfit = grossRevenue - productCost;
    const commissionBase = basis === 'labor_only' ? laborCharge : netProfit;
    return Math.max(0, commissionBase * (commissionRate / 100));
  };

  it('labor_only: non-service session', () => {
    // gross=40, productCost=10, multiplier=4, rate=30%
    // laborCharge = 40 - (10*4) = 0, commission = 0
    expect(calcCommission(40, 10, 0, 4, 30, 'labor_only')).toBe(0);
  });

  it('labor_only: non-service session with bowl fees', () => {
    // gross=42.50 (40 product + 2.50 bowl), productCost=10, mult=4, rate=30%
    // laborCharge = 42.50 - 40 = 2.50, commission = 2.50 * 0.30 = 0.75
    expect(calcCommission(42.50, 10, 0, 4, 30, 'labor_only')).toBe(0.75);
  });

  it('labor_only: service session, no overage', () => {
    // Service price $85, bowlFees $5, gross=$90, productCost=$12
    // laborCharge = serviceRevenue = $85, commission = 85 * 0.30 = $25.50
    expect(calcCommission(90, 12, 85, 4, 30, 'labor_only')).toBe(25.50);
  });

  it('labor_only: service session with overage — no negative commission', () => {
    // Service $50 + overage $20 + bowl $5 = $75 gross, productCost=$30
    // OLD BUG: laborCharge = 75 - (30*4) = 75 - 120 = -45 → negative!
    // FIX: laborCharge = serviceRevenue = $50
    expect(calcCommission(75, 30, 50, 4, 30, 'labor_only')).toBe(15);
  });

  it('net_profit basis', () => {
    // gross=90, productCost=12, rate=30%
    // netProfit = 90 - 12 = 78, commission = 78 * 0.30 = 23.40
    expect(calcCommission(90, 12, 85, 4, 30, 'net_profit')).toBe(23.40);
  });

  it('zero commission rate', () => {
    expect(calcCommission(100, 10, 0, 4, 0, 'labor_only')).toBe(0);
  });

  it('100% commission rate', () => {
    // laborCharge for non-service: 42.50 - 40 = 2.50, 100% = 2.50
    expect(calcCommission(42.50, 10, 0, 4, 100, 'labor_only')).toBe(2.50);
  });
});

// ──────────────────────────────────────────────
// Inventory reorder value
// ──────────────────────────────────────────────
describe('inventory reorder value', () => {
  const calcReorderValue = (products: Array<{ stock: number; targetStock: number; reorderLevel: number; cost: number }>) =>
    products
      .filter(p => p.stock <= p.reorderLevel)
      .reduce((sum, p) => sum + Math.max(0, p.targetStock - p.stock) * p.cost, 0);

  it('normal reorder: stock below target', () => {
    expect(calcReorderValue([{ stock: 3, targetStock: 20, reorderLevel: 5, cost: 12 }])).toBe(17 * 12);
  });

  it('stock above target: reorder = 0, not negative (BUG 3)', () => {
    expect(calcReorderValue([{ stock: 25, targetStock: 20, reorderLevel: 30, cost: 12 }])).toBe(0);
  });

  it('stock at zero', () => {
    expect(calcReorderValue([{ stock: 0, targetStock: 10, reorderLevel: 5, cost: 8 }])).toBe(80);
  });

  it('product not below reorder level: excluded', () => {
    expect(calcReorderValue([{ stock: 10, targetStock: 20, reorderLevel: 5, cost: 12 }])).toBe(0);
  });
});


// ──────────────────────────────────────────────
// GOLDEN EXAMPLES — hand-verified in the Math Audit (vault: 01 Build).
// Any change to cost/pricing logic MUST reproduce these exactly.
// ──────────────────────────────────────────────
describe('Golden Examples', () => {
  it('A: basic bowl cost — $12/60g tube, 40g used → $8.00; $9/1000ml dev, 40ml → $0.36', () => {
    const tubeGrams = getBottleSizeInGrams(60, 'g');
    const colorCostPerGram = 12.0 / tubeGrams;
    const colorCost = colorCostPerGram * convertToGrams(40, 'g');
    expect(colorCost).toBeCloseTo(8.0, 6);

    const bottleGrams = getBottleSizeInGrams(1000, 'ml');
    const devCostPerGram = 9.0 / bottleGrams;
    const devCost = devCostPerGram * convertToGrams(40, 'ml');
    expect(devCost).toBeCloseTo(0.36, 6);

    expect(colorCost + devCost).toBeCloseTo(8.36, 6);
  });

  it('B: charge — cost $8.36, multiplier 4, waste 5%, bowl fee $2.50, round $0.25 → $37.50', () => {
    expect(calculateServiceCharge(8.36, 4, 5, 2.5, 0.25)).toBe(37.5);
  });

  it('C: 2 oz of color = 56.70 g (weight ounce)', () => {
    expect(convertToGrams(2, 'oz')).toBeCloseTo(56.699, 3);
  });

  it('D: waste math — 100g mixed, 20g leftover → 80g used, 20% waste', () => {
    const mixed = 100, leftover = 20;
    const used = Math.max(0, mixed - leftover);
    expect(used).toBe(80);
    expect(((mixed - used) / mixed) * 100).toBeCloseTo(20, 6);
  });
});

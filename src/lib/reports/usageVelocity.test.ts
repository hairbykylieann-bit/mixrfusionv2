import { describe, it, expect } from "vitest";
import { computeStockSuggestion, TARGET_COVER_WEEKS } from "./usageVelocity";

const NOW = new Date("2026-07-06T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

const tube6N = { id: "p1", size: 60, sizeUnit: "g", stock: 3, reorderLevel: 5, targetStock: 20 };

describe("computeStockSuggestion", () => {
  it("Kylie's example: ~8 tubes/month → keep 8 (4 weeks), reorder at 4 (2 weeks)", () => {
    // 8 tubes over 30 days = 480g across events
    const events = Array.from({ length: 16 }, (_, i) => ({
      product_id: "p1", amount: 30, unit: "g", created_at: daysAgo(30 - (i * 30) / 16),
    }));
    const s = computeStockSuggestion(tube6N, events, NOW)!;
    expect(s.containersPerWeek).toBeCloseTo(8 / (30 / 7), 1); // ≈1.87/wk
    expect(s.suggestedTargetStock).toBe(8);   // ceil(1.87 × 4)
    expect(s.suggestedReorderLevel).toBe(4);  // ceil(1.87 × 2)
    // 3 tubes left at ~0.267/day → ~11 days
    expect(s.daysUntilOut).toBe(11);
    expect(s.differsFromCurrent).toBe(true);
  });

  it("mixed units: oz entries count correctly (weight oz)", () => {
    const events = [
      { product_id: "p1", amount: 1, unit: "oz", created_at: daysAgo(20) },  // 28.35g
      { product_id: "p1", amount: 30, unit: "g", created_at: daysAgo(10) },
      { product_id: "p1", amount: 1.66, unit: "oz", created_at: daysAgo(2) }, // ≈47.06g
    ];
    const s = computeStockSuggestion(tube6N, events, NOW)!;
    // total ≈105.4g ≈ 1.757 tubes over 20 days → ≈0.615/wk
    expect(s.containersPerWeek).toBeCloseTo(0.61, 1);
  });

  it("refuses to guess from thin data (< 3 uses or < 14 days)", () => {
    const twoUses = [
      { product_id: "p1", amount: 30, unit: "g", created_at: daysAgo(20) },
      { product_id: "p1", amount: 30, unit: "g", created_at: daysAgo(10) },
    ];
    expect(computeStockSuggestion(tube6N, twoUses, NOW)).toBeNull();
    const recentOnly = Array.from({ length: 5 }, (_, i) => ({
      product_id: "p1", amount: 30, unit: "g", created_at: daysAgo(i + 1),
    }));
    expect(computeStockSuggestion(tube6N, recentOnly, NOW)).toBeNull();
  });

  it("out-of-stock product shows 0 days left", () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      product_id: "p1", amount: 30, unit: "g", created_at: daysAgo(5 + i * 7),
    }));
    const s = computeStockSuggestion({ ...tube6N, stock: 0 }, events, NOW)!;
    expect(s.daysUntilOut).toBe(0);
  });

  it("target always clears the reorder level", () => {
    const events = Array.from({ length: 3 }, (_, i) => ({
      product_id: "p1", amount: 5, unit: "g", created_at: daysAgo(10 + i * 20),
    }));
    const s = computeStockSuggestion(tube6N, events, NOW)!;
    expect(s.suggestedTargetStock).toBeGreaterThan(s.suggestedReorderLevel);
  });
});

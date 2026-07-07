import { describe, it, expect } from 'vitest';
import {
  buildEngineItems,
  calculateSessionRevenueV2,
  calculatePeriodTotals,
  type ServiceMenuItem,
  type EngineBowlInput,
  type EngineItemInput,
} from './revenueEngine';

const settings = { backbar_multiplier: 4, bowl_fee: 2.5 };

function makeService(overrides: Partial<ServiceMenuItem> = {}): ServiceMenuItem {
  return {
    id: 'svc1',
    name: 'Test',
    price: 100,
    color_amount: 2,
    color_unit: 'oz',
    developer_amount: 2,
    developer_unit: 'oz',
    ...overrides,
  };
}

describe('buildEngineItems — developer double-count fix', () => {
  it('uses bowl_items when developer bowl_item exists (ignores legacy slot)', () => {
    const bowls: EngineBowlInput[] = [{
      id: 'b1', session_id: 's1',
      amount_mixed: 100, amount_used: 100,
      developer_product_id: 'devP', developer_amount: 60, developer_unit: 'g',
      developer: { cost_per_unit: 0.1, size_unit: 'ml' }, // legacy would compute 60 * 0.1 = 6.00
    }];
    const items: EngineItemInput[] = [
      { bowl_id: 'b1', product_id: 'colorP', amount: 40, unit: 'g', cost: 4, item_type: 'color', products: { type: 'Color' } },
      { bowl_id: 'b1', product_id: 'devP', amount: 60, unit: 'g', cost: 6, item_type: 'developer', products: { type: 'Developer' } },
    ];
    const rows = buildEngineItems(bowls, items);
    // Should be exactly 2 rows (color + dev item). Legacy slot skipped.
    expect(rows.length).toBe(2);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    expect(totalCost).toBe(10); // not 16
  });

  it('falls back to legacy developer slot for old sessions with no dev bowl_items', () => {
    const bowls: EngineBowlInput[] = [{
      id: 'b1', session_id: 's1',
      amount_mixed: 100, amount_used: 100,
      developer_product_id: 'devP', developer_amount: 60, developer_unit: 'ml',
      developer: { cost_per_unit: 0.1, size_unit: 'ml' },
    }];
    const items: EngineItemInput[] = [
      { bowl_id: 'b1', product_id: 'colorP', amount: 40, unit: 'g', cost: 4, item_type: 'color', products: { type: 'Color' } },
    ];
    const rows = buildEngineItems(bowls, items);
    expect(rows.length).toBe(2);
    expect(rows.find((r) => r.bucket === 'developer')?.cost).toBeCloseTo(6);
  });
});

describe('calculateSessionRevenueV2 — service overage', () => {
  it('within allotment: revenue = service price + bowl fee, no overage', () => {
    const svc = makeService();
    const map = new Map([[svc.id, svc]]);
    // 2oz color + 2oz dev exactly matches allotment
    const items = buildEngineItems(
      [{ id: 'b1', session_id: 's1', amount_mixed: 100, amount_used: 100, developer_product_id: null, developer_amount: null, developer_unit: null, developer: null }],
      [
        { bowl_id: 'b1', product_id: 'c', amount: 2, unit: 'oz', cost: 3, item_type: 'color', products: { type: 'Color' } },
        { bowl_id: 'b1', product_id: 'd', amount: 2, unit: 'oz', cost: 1, item_type: 'developer', products: { type: 'Developer' } },
      ],
    );
    const rev = calculateSessionRevenueV2('svc1', 1, items, map, settings);
    expect(rev.overageRevenue).toBe(0);
    expect(rev.grossRevenue).toBe(100 + 2.5);
    expect(rev.productCost).toBe(4);
  });

  it('lightener-only overage does not charge for color usage that stayed in-bucket', () => {
    // Multi-component service: lightener 2oz + dev 4oz, color 1oz + dev 1oz.
    const svc = makeService({
      components: [
        { product_type: 'lightener', product_amount: 2, product_unit: 'oz', developer_amount: 4, developer_unit: 'oz' },
        { product_type: 'color', product_amount: 1, product_unit: 'oz', developer_amount: 1, developer_unit: 'oz' },
      ],
    });
    const map = new Map([[svc.id, svc]]);
    // Use 3oz lightener (1oz over) but exactly 1oz color + 5oz dev (matches 4+1)
    const items = buildEngineItems(
      [{ id: 'b1', session_id: 's1', amount_mixed: 100, amount_used: 100, developer_product_id: null, developer_amount: null, developer_unit: null, developer: null }],
      [
        { bowl_id: 'b1', product_id: 'l', amount: 3, unit: 'oz', cost: 9, item_type: 'color', products: { type: 'Lightener' } },
        { bowl_id: 'b1', product_id: 'c', amount: 1, unit: 'oz', cost: 2, item_type: 'color', products: { type: 'Color' } },
        { bowl_id: 'b1', product_id: 'd', amount: 5, unit: 'oz', cost: 5, item_type: 'developer', products: { type: 'Developer' } },
      ],
    );
    const rev = calculateSessionRevenueV2('svc1', 1, items, map, settings);
    // Lightener overage = 1/3 of lightener cost * multiplier = 9/3 * 4 = 12
    expect(rev.overageRevenue).toBeCloseTo(12);
    expect(rev.productCost).toBe(16);
  });

  it('no service linked: charges productCost × multiplier + bowl fees', () => {
    const items = buildEngineItems(
      [{ id: 'b1', session_id: 's1', amount_mixed: 100, amount_used: 100, developer_product_id: null, developer_amount: null, developer_unit: null, developer: null }],
      [
        { bowl_id: 'b1', product_id: 'c', amount: 2, unit: 'oz', cost: 5, item_type: 'color', products: { type: 'Color' } },
      ],
    );
    const rev = calculateSessionRevenueV2(null, 1, items, new Map(), settings);
    expect(rev.grossRevenue).toBe(5 * 4 + 2.5);
    expect(rev.serviceRevenue).toBe(0);
  });
});

describe('calculatePeriodTotals — no double count across a period', () => {
  it('period totals equal sum of session revenues', () => {
    const svc = makeService();
    const map = new Map([[svc.id, svc]]);
    const bowls: EngineBowlInput[] = [
      { id: 'b1', session_id: 's1', amount_mixed: 100, amount_used: 100,
        developer_product_id: 'd', developer_amount: 60, developer_unit: 'g',
        developer: { cost_per_unit: 0.1, size_unit: 'ml' } },
    ];
    const items: EngineItemInput[] = [
      { bowl_id: 'b1', product_id: 'c', amount: 2, unit: 'oz', cost: 4, item_type: 'color', products: { type: 'Color' } },
      { bowl_id: 'b1', product_id: 'd', amount: 60, unit: 'g', cost: 6, item_type: 'developer', products: { type: 'Developer' } },
    ];
    const totals = calculatePeriodTotals({
      sessions: [{ id: 's1', service_id: 'svc1', total_amount_mixed: 100, total_amount_used: 100 }],
      bowls, items, serviceMap: map, settings,
    });
    // Product cost = 4 + 6 = 10 (NOT 16 — legacy slot ignored because bowl already has dev item)
    expect(totals.totalProductCost).toBe(10);
  });
});

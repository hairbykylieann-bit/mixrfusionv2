import { useQuery } from "@tanstack/react-query";
import { convertAmountBetweenUnits } from "@/lib/units";
import { supabase } from "@/integrations/supabase/client";
import {
  buildEngineItems,
  calculateSessionRevenueV2,
  type ServiceMenuItem,
  type EngineBowlInput,
  type EngineItemInput,
} from "@/lib/reports/revenueEngine";

export interface SessionFinancials {
  charged: number;
  productCost: number;
  laborCharge: number;
  productMarkup: number;
  bowlFee: number;
  salonKeeps: number;
  overageCharge: number;
  // Ledger of every product row the math counted, for the trust surface.
  countedRows: Array<{
    productId: string | null;
    name: string;
    brand: string | null;
    shade: string | null;
    bucket: 'color' | 'lightener' | 'developer';
    amount: number;
    unit: string;
    cost: number;
    source: 'bowl_item' | 'legacy_developer_slot';
    hasCostData: boolean;
  }>;
}

/**
 * Fetches a single color session's bowls + items + service and returns the
 * full financial breakdown for that one session using the shared engine.
 */
export function useSessionFinancials(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['session-financials', sessionId],
    enabled: !!sessionId && enabled,
    queryFn: async (): Promise<SessionFinancials> => {
      const { data: settings } = await supabase
        .from('salon_settings')
        .select('bowl_fee, backbar_multiplier')
        .limit(1)
        .maybeSingle();
      const s = settings || { bowl_fee: 2.5, backbar_multiplier: 4 };

      const { data: session, error: sErr } = await supabase
        .from('color_sessions')
        .select('id, service_id, stylist_id')
        .eq('id', sessionId!)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!session) throw new Error('Session not found');

      let service: ServiceMenuItem | null = null;
      if (session.service_id) {
        const { data } = await supabase
          .from('service_menu')
          .select('id, name, price, color_amount, color_unit, developer_amount, developer_unit, components:service_menu_components(product_type, product_amount, product_unit, developer_amount, developer_unit)' as any)
          .eq('id', session.service_id)
          .maybeSingle();
        if (data) {
          const d: any = data;
          service = {
            id: d.id,
            name: d.name,
            price: Number(d.price) || 0,
            color_amount: Number(d.color_amount) || 0,
            color_unit: d.color_unit || 'g',
            developer_amount: Number(d.developer_amount) || 0,
            developer_unit: d.developer_unit || 'g',
            components: (d.components || []).map((c: any) => ({
              product_type: c.product_type,
              product_amount: Number(c.product_amount) || 0,
              product_unit: c.product_unit || 'g',
              developer_amount: Number(c.developer_amount) || 0,
              developer_unit: c.developer_unit || 'g',
            })),
          };
        }
      }

      const { data: bowlsRaw } = await supabase
        .from('session_bowls')
        .select(`id, session_id, amount_mixed, amount_used, developer_product_id, developer_amount, developer_unit,
          developer:developer_product_id (id, name, brand, shade, cost_per_unit, size_unit)`)
        .eq('session_id', session.id);
      const bowls = (bowlsRaw || []) as any[];

      const bowlIds = bowls.map((b) => b.id);
      const { data: itemsRaw } = bowlIds.length
        ? await supabase
            .from('bowl_items')
            .select('bowl_id, product_id, amount, unit, cost, item_type, products:product_id (id, name, brand, shade, type, size, cost_per_unit)')
            .in('bowl_id', bowlIds)
        : { data: [] as any[] };
      const items = (itemsRaw || []) as any[];

      const engineBowls: EngineBowlInput[] = bowls.map((b) => ({
        id: b.id,
        session_id: b.session_id,
        amount_mixed: b.amount_mixed,
        amount_used: b.amount_used,
        developer_product_id: b.developer_product_id,
        developer_amount: b.developer_amount,
        developer_unit: b.developer_unit,
        developer: b.developer
          ? { cost_per_unit: b.developer.cost_per_unit, size_unit: b.developer.size_unit }
          : null,
      }));
      const engineItems: EngineItemInput[] = items.map((it) => ({
        bowl_id: it.bowl_id,
        product_id: it.product_id,
        amount: it.amount,
        unit: it.unit,
        cost: it.cost,
        item_type: it.item_type,
        products: it.products ? { type: it.products.type } : null,
      }));

      const engineRows = buildEngineItems(engineBowls, engineItems);

      const serviceMap = new Map<string, ServiceMenuItem>();
      if (service) serviceMap.set(service.id, service);

      const rev = calculateSessionRevenueV2(
        session.service_id,
        bowls.length,
        engineRows,
        serviceMap,
        { bowl_fee: s.bowl_fee || 0, backbar_multiplier: s.backbar_multiplier || 1 },
      );

      // Build the human-readable "products counted" ledger.
      const productLookup = new Map<string, any>();
      items.forEach((it) => { if (it.products) productLookup.set(it.product_id, it.products); });
      bowls.forEach((b) => { if (b.developer) productLookup.set(b.developer_product_id, b.developer); });

      const countedRows: SessionFinancials['countedRows'] = [];
      // From bowl_items (source of truth for anything entered post-March 2026)
      for (const it of items) {
        const p = it.products;
        countedRows.push({
          productId: it.product_id,
          name: p?.name || 'Unknown product',
          brand: p?.brand || null,
          shade: p?.shade || null,
          bucket: (it.item_type === 'developer'
            ? 'developer'
            : (p?.type || '').toLowerCase() === 'lightener'
              ? 'lightener'
              : 'color'),
          amount: Number(it.amount) || 0,
          unit: it.unit || 'g',
          cost: Number(it.cost) || 0,
          source: 'bowl_item',
          hasCostData: !!p?.cost_per_unit && !!p?.size,
        });
      }
      // Legacy developer slot rows (only bowls without a developer bowl_item)
      const bowlHasDevItem = new Set(
        items.filter((it) => it.item_type === 'developer').map((it) => it.bowl_id),
      );
      for (const b of bowls) {
        if (!b.developer_product_id || !b.developer_amount) continue;
        if (bowlHasDevItem.has(b.id)) continue;
        const dev = b.developer;
        const devUnit = b.developer_unit || 'g';
        const devSizeUnit = dev?.size_unit || 'ml';
        const amt = Number(b.developer_amount) || 0;
        const converted = convertAmountBetweenUnits(amt, devUnit, devSizeUnit); // FIX: was a no-op (×1 both branches)
        const cost = (dev ? Number(dev.cost_per_unit) || 0 : 0) * converted;
        countedRows.push({
          productId: b.developer_product_id,
          name: dev?.name || 'Legacy developer',
          brand: dev?.brand || null,
          shade: dev?.shade || null,
          bucket: 'developer',
          amount: amt,
          unit: devUnit,
          cost,
          source: 'legacy_developer_slot',
          hasCostData: !!dev?.cost_per_unit,
        });
      }

      const laborCharge = rev.serviceRevenue;
      const productMarkup = rev.grossRevenue - rev.productCost - rev.bowlFeeRevenue - rev.serviceRevenue;

      return {
        charged: rev.grossRevenue,
        productCost: rev.productCost,
        laborCharge,
        productMarkup,
        bowlFee: rev.bowlFeeRevenue,
        salonKeeps: rev.grossRevenue - rev.productCost,
        overageCharge: rev.overageRevenue,
        countedRows,
      };
    },
  });
}

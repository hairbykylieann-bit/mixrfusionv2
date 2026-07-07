import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import type { DateRange } from "@/components/reports/DateRangeSelector";
import { fetchAllRows, fetchAllInChunks } from "@/lib/reports/fetchAllRows";

import { convertAmountBetweenUnits } from "@/lib/units";
import { buildEngineItems, calculateSessionRevenueV2 } from "@/lib/reports/revenueEngine";

export interface ProductUsageItem {
  id: string;
  name: string;
  brand: string;
  shade: string | null;
  amountUsed: number;
  unit: string;
  cost: number;
  revenue: number;
  profit: number;
  wastePercent: number;
}

export interface CategoryUsage {
  category: string;
  totalAmountUsed: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  unit: string;
  wastePercent: number;
  wasteAmount: number;
  wasteValue: number;
  items: ProductUsageItem[];
}

export interface StaffReportSummary {
  services: number;
  bowlCount: number;
  productCost: number;
  markupRevenue: number;
  bowlFeeRevenue: number;
  grossRevenue: number;
  netProfit: number;
  netAfterProduct: number;
  wastePercent: number;
  wasteAmount: number;
  wasteValue: number;
  avgServiceCost: number;
  serviceRevenue: number;
  overageRevenue: number;
}

export interface PeriodChanges {
  servicesChange: number | null;
  revenueChange: number | null;
  profitChange: number | null;
  wasteChange: number | null;
}

export interface WasteByCategory {
  category: string;
  wasteAmount: number;
  wastePercent: number;
  wasteValue: number;
}

export interface CommissionData {
  enabled: boolean;
  rate: number;
  baseRevenue: number;
  earned: number;
  basis: 'labor_only' | 'net_profit';
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  receives_commission: boolean;
  commission_percent: number;
}

export interface ServiceClientSession {
  sessionId: string;
  clientId: string;
  clientName: string;
  sessionDate: string;
  grossRevenue: number;
  productCost: number;
  wastePercent: number;
  products: Array<{
    name: string;
    brand: string;
    shade: string | null;
    amount: number;
    unit: string;
  }>;
}

export interface ServiceGroup {
  serviceId: string | null;
  serviceName: string;
  sessionCount: number;
  totalRevenue: number;
  sessions: ServiceClientSession[];
}

export interface StaffReportData {
  staff: StaffMember | null;
  summary: StaffReportSummary;
  changes: PeriodChanges;
  products: CategoryUsage[];
  wasteByCategory: WasteByCategory[];
  commission: CommissionData | null;
  serviceGroups: ServiceGroup[];
  isLoading: boolean;
  error: Error | null;
}

function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return ((current - previous) / previous) * 100;
}

function getPreviousPeriod(dateRange: DateRange): { from: Date; to: Date } {
  const daysDiff = differenceInDays(dateRange.to, dateRange.from) + 1;
  const prevTo = new Date(dateRange.from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - daysDiff + 1);
  return { from: prevFrom, to: prevTo };
}

interface ServiceMenuItem {
  id: string;
  name: string;
  price: number;
  color_amount: number;
  color_unit: string;
  developer_amount: number;
  developer_unit: string;
}

/**
 * Calculate revenue for a single session, accounting for service-linked overage-only charging.
 */
// (legacy calculateSessionRevenue removed 2026-07-06 — all revenue math now lives in lib/reports/revenueEngine)

export function useStaffReport(staffId: string | undefined, dateRange: DateRange | null): StaffReportData {
  const fromDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : null;
  const toDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : null;

  const previousPeriod = dateRange ? getPreviousPeriod(dateRange) : null;
  const prevFromDate = previousPeriod ? format(previousPeriod.from, 'yyyy-MM-dd') : null;
  const prevToDate = previousPeriod ? format(previousPeriod.to, 'yyyy-MM-dd') : null;

  // Fetch staff member info
  const staffQuery = useQuery({
    queryKey: ['staff-report-member', staffId],
    queryFn: async () => {
      if (!staffId) return null;
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, email, receives_commission, commission_percent')
        .eq('id', staffId)
        .single();
      if (error) throw error;
      return data as StaffMember;
    },
    enabled: !!staffId,
  });

  // Fetch salon settings
  const settingsQuery = useQuery({
    queryKey: ['staff-report-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_settings')
        .select('markup_percent, bowl_fee, waste_factor_percent, backbar_multiplier, commission_basis')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || { markup_percent: 35, bowl_fee: 2.50, waste_factor_percent: 5, backbar_multiplier: 4, commission_basis: 'labor_only' };
    },
  });

  // Fetch service menu for overage calculations
  const serviceMenuQuery = useQuery({
    queryKey: ['staff-report-service-menu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_menu')
        .select('id, name, price, color_amount, color_unit, developer_amount, developer_unit, components:service_menu_components(product_type, product_amount, product_unit, developer_amount, developer_unit)' as any)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ['staff-report-sessions', staffId, fromDate, toDate],
    queryFn: async () => {
      if (!staffId) return [] as any[];
      return await fetchAllRows<any>((from, to) => {
        let query = supabase
          .from('color_sessions')
          .select('id, session_date, total_cost, total_amount_mixed, total_amount_used, service_id, client_id, clients:client_id(id, name)')
          .eq('stylist_id', staffId)
          .gt('total_amount_mixed', 0);
        if (fromDate && toDate) {
          query = query.gte('session_date', fromDate).lte('session_date', toDate);
        }
        return query.range(from, to);
      });
    },
    enabled: !!staffId,
  });

  // Fetch previous period sessions for comparison
  const prevSessionsQuery = useQuery({
    queryKey: ['staff-report-sessions-prev', staffId, prevFromDate, prevToDate],
    queryFn: async () => {
      if (!staffId || !prevFromDate || !prevToDate) return [] as any[];
      return await fetchAllRows<any>((from, to) =>
        supabase
          .from('color_sessions')
          .select('id, total_cost, total_amount_mixed, total_amount_used, service_id')
          .eq('stylist_id', staffId)
          .gte('session_date', prevFromDate)
          .lte('session_date', prevToDate)
          .gt('total_amount_mixed', 0)
          .range(from, to)
      );
    },
    enabled: !!staffId && !!prevFromDate && !!prevToDate,
  });

  // Previous-period bowls + items for service-aware prev revenue
  const prevBowlDataQuery = useQuery({
    queryKey: ['staff-report-bowls-prev', staffId, prevFromDate, prevToDate],
    queryFn: async () => {
      const prev = prevSessionsQuery.data || [];
      if (prev.length === 0) return { bowls: [], items: [] };
      const sessionIds = prev.map(s => s.id);
      const bowls = await fetchAllInChunks<any>(sessionIds, (chunk, from, to) =>
        supabase
          .from('session_bowls')
          .select(`id, session_id, amount_mixed, amount_used, developer_product_id, developer_amount, developer_unit, developer:developer_product_id (id, name, brand, type, cost_per_unit, size_unit)`)
          .in('session_id', chunk)
          .range(from, to)
      );
      if (bowls.length === 0) return { bowls: [], items: [] };
      const items = await fetchAllInChunks<any>(bowls.map(b => b.id), (chunk, from, to) =>
        supabase
          .from('bowl_items')
          .select('id, amount, cost, unit, bowl_id, product_id, item_type, products:product_id (type)')

          .in('bowl_id', chunk)
          .range(from, to)
      );
      return { bowls, items };
    },
    enabled: !!staffId && prevSessionsQuery.isSuccess && (prevSessionsQuery.data?.length || 0) > 0,
  });


  // Fetch bowl data with items for current period
  const bowlDataQuery = useQuery({
    queryKey: ['staff-report-bowls', staffId, fromDate, toDate],
    queryFn: async () => {
      const sessions = sessionsQuery.data || [];
      if (sessions.length === 0) {
        return { bowls: [], items: [] };
      }

      const sessionIds = sessions.map(s => s.id);

      const bowls = await fetchAllInChunks<any>(sessionIds, (chunk, from, to) =>
        supabase
          .from('session_bowls')
          .select(`
            id,
            session_id,
            amount_mixed,
            amount_used,
            developer_product_id,
            developer_amount,
            developer_unit,
            developer:developer_product_id (
              id,
              name,
              brand,
              type,
              cost_per_unit,
              size_unit,
              shade
            )
          `)
          .in('session_id', chunk)
          .range(from, to)
      );

      if (bowls.length === 0) {
        return { bowls: [], items: [] };
      }

      const bowlIds = bowls.map(b => b.id);

      const items = await fetchAllInChunks<any>(bowlIds, (chunk, from, to) =>
        supabase
          .from('bowl_items')
          .select(`
            id,
            amount,
            cost,
            unit,
            bowl_id,
            product_id,
            item_type,
            products:product_id (
              id,
              name,
              brand,
              type,
              cost_per_unit,
              shade
            )
          `)

          .in('bowl_id', chunk)
          .range(from, to)
      );

      return { bowls, items };
    },
    enabled: !!staffId && sessionsQuery.isSuccess && (sessionsQuery.data?.length || 0) > 0,
  });

  // Calculate all metrics
  const isLoading = staffQuery.isLoading || settingsQuery.isLoading || sessionsQuery.isLoading || bowlDataQuery.isLoading || serviceMenuQuery.isLoading;
  const error = staffQuery.error || settingsQuery.error || sessionsQuery.error || bowlDataQuery.error || serviceMenuQuery.error;

  const staff = staffQuery.data || null;
  const settings = settingsQuery.data || { markup_percent: 35, bowl_fee: 2.50, waste_factor_percent: 5, backbar_multiplier: 4, commission_basis: 'labor_only' };
  const sessions = sessionsQuery.data || [];
  const prevSessions = prevSessionsQuery.data || [];
  const bowlData = bowlDataQuery.data || { bowls: [], items: [] };
  const serviceMenuItems = serviceMenuQuery.data || [];

  // Build service lookup map
  const serviceMap = new Map<string, ServiceMenuItem>();
  serviceMenuItems.forEach(s => serviceMap.set(s.id, s));

  // Build maps for per-session calculations
  const sessionBowlsMap = new Map<string, typeof bowlData.bowls>();
  bowlData.bowls.forEach(bowl => {
    const existing = sessionBowlsMap.get(bowl.session_id) || [];
    existing.push(bowl);
    sessionBowlsMap.set(bowl.session_id, existing);
  });

  const bowlItemsMap = new Map<string, typeof bowlData.items>();
  bowlData.items.forEach(item => {
    const existing = bowlItemsMap.get(item.bowl_id) || [];
    existing.push(item);
    bowlItemsMap.set(item.bowl_id, existing);
  });

  // Calculate summary stats - now service-aware
  const summary: StaffReportSummary = (() => {
    const bowlItems = bowlData.items || [];
    const bowls = bowlData.bowls || [];

    // Calculate total product cost from bowl items (which already include developer rows
    // for any session created after March 2026 via item_type='developer').
    let productCost = bowlItems.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

    // Bowls without developer bowl_items are legacy — fall back to session_bowls.developer_* slot.
    const bowlsWithDevItem = new Set(
      bowlItems.filter((it: any) => it.item_type === 'developer').map((it: any) => it.bowl_id)
    );
    bowls.forEach(bowl => {
      if (bowlsWithDevItem.has(bowl.id)) return;
      if (bowl.developer_product_id && bowl.developer_amount) {
        const developer = bowl.developer as { cost_per_unit: number; size_unit: string | null } | null;
        if (developer) {
          const devSizeUnit = developer.size_unit || 'ml';
          const devUnit = bowl.developer_unit || 'g';
          const devAmount = Number(bowl.developer_amount) || 0;
          const devAmountConverted = convertAmountBetweenUnits(devAmount, devUnit, devSizeUnit);
          productCost += devAmountConverted * (Number(developer.cost_per_unit) || 0);
        }
      }
    });


    const bowlCount = bowls.length;
    const services = sessions.length;

    // Calculate waste
    const totalMixed = sessions.reduce((sum, s) => sum + (Number(s.total_amount_mixed) || 0), 0);
    const totalUsed = sessions.reduce((sum, s) => sum + (Number(s.total_amount_used) || 0), 0);
    const wasteAmount = totalMixed - totalUsed;
    const wastePercent = totalMixed > 0 ? (wasteAmount / totalMixed) * 100 : 0;
    const wasteValue = totalMixed > 0 ? (wasteAmount / totalMixed) * productCost : 0;

    // Per-session revenue calculation (service-aware)
    let totalGrossRevenue = 0;
    let totalServiceRevenue = 0;
    let totalOverageRevenue = 0;
    let totalBowlFeeRevenue = 0;
    let totalProductCharge = 0;

    sessions.forEach(session => {
      const sBowls = sessionBowlsMap.get(session.id) || [];
      let sessionProductCost = 0;

      const bowlsForCalc = sBowls.map(bowl => {
        const items = bowlItemsMap.get(bowl.id) || [];
        let bowlCost = 0;
        const itemAmounts = items.map(item => {
          bowlCost += Number(item.cost) || 0;
          return { amount: Number(item.amount) || 0, unit: item.unit || 'g' };
        });

        // Legacy developer slot: only add if no developer bowl_items exist for this bowl.
        const hasDevItem = items.some((it: any) => it.item_type === 'developer');
        if (!hasDevItem && bowl.developer_product_id && bowl.developer_amount) {
          const developer = bowl.developer as { cost_per_unit: number; size_unit: string | null } | null;
          if (developer) {
            const devSizeUnit = developer.size_unit || 'ml';
            const devUnit = bowl.developer_unit || 'g';
            const devAmount = Number(bowl.developer_amount) || 0;
            const devAmountConverted = convertAmountBetweenUnits(devAmount, devUnit, devSizeUnit);
            bowlCost += devAmountConverted * (Number(developer.cost_per_unit) || 0);
          }
        }

        sessionProductCost += bowlCost;

        return {
          developer_amount: bowl.developer_amount ? Number(bowl.developer_amount) : null,
          developer_unit: bowl.developer_unit,
          items: itemAmounts,
        };
      });

      // V2 engine — the SAME math as salon reports (single source of truth).
      // The old local formula counted developer items as color usage and
      // ignored multi-component service allotments.
      const rev = calculateSessionRevenueV2(
        session.service_id,
        sBowls.length,
        buildEngineItems(sBowls as any, sBowls.flatMap((b: any) => bowlItemsMap.get(b.id) || []) as any),
        serviceMap as any,
        settings,
      );

      totalGrossRevenue += rev.grossRevenue;
      totalServiceRevenue += rev.serviceRevenue;
      totalOverageRevenue += rev.overageRevenue;
      totalBowlFeeRevenue += rev.bowlFeeRevenue;
      totalProductCharge += rev.productCharge;
    });

    // If no sessions were processed, fall back to simple calculation
    if (sessions.length === 0) {
      totalBowlFeeRevenue = bowlCount * settings.bowl_fee;
      totalProductCharge = productCost * settings.backbar_multiplier;
      totalGrossRevenue = totalProductCharge + totalBowlFeeRevenue;
    }

    const markupRevenue = totalGrossRevenue - productCost - totalBowlFeeRevenue - totalServiceRevenue;
    const netAfterProduct = totalGrossRevenue - productCost;
    const netProfit = netAfterProduct; // Keep for backward compatibility if needed
    const avgServiceCost = services > 0 ? totalGrossRevenue / services : 0;

    return {
      services,
      bowlCount,
      productCost,
      markupRevenue,
      bowlFeeRevenue: totalBowlFeeRevenue,
      grossRevenue: totalGrossRevenue,
      netProfit,
      netAfterProduct,
      wastePercent,
      wasteAmount,
      wasteValue,
      avgServiceCost,
      serviceRevenue: totalServiceRevenue,
      overageRevenue: totalOverageRevenue,
    };
  })();

  // Calculate period-over-period changes
  const changes: PeriodChanges = (() => {
    if (prevSessions.length === 0) {
      return {
        servicesChange: null,
        revenueChange: null,
        profitChange: null,
        wasteChange: null,
      };
    }

    const prevServices = prevSessions.length;
    const prevProductCostFallback = prevSessions.reduce((sum, s) => sum + (Number(s.total_cost) || 0), 0);

    // Service-aware previous-period revenue, mirroring current-period logic.
    const prevBowls = prevBowlDataQuery.data?.bowls || [];
    const prevItems = prevBowlDataQuery.data?.items || [];
    const prevSessionBowlsMap = new Map<string, typeof prevBowls>();
    prevBowls.forEach(b => {
      const arr = prevSessionBowlsMap.get(b.session_id) || [];
      arr.push(b);
      prevSessionBowlsMap.set(b.session_id, arr);
    });
    const prevBowlItemsMap = new Map<string, typeof prevItems>();
    prevItems.forEach(it => {
      const arr = prevBowlItemsMap.get(it.bowl_id) || [];
      arr.push(it);
      prevBowlItemsMap.set(it.bowl_id, arr);
    });

    let prevRevenue = 0;
    let prevProductCost = 0;
    prevSessions.forEach(session => {
      const sBowls = prevSessionBowlsMap.get(session.id) || [];
      let sessionProductCost = 0;
      const bowlsForCalc = sBowls.map(bowl => {
        const its = prevBowlItemsMap.get(bowl.id) || [];
        let bowlCost = 0;
        const itemAmounts = its.map(item => {
          bowlCost += Number(item.cost) || 0;
          return { amount: Number(item.amount) || 0, unit: item.unit || 'g' };
        });
        const hasDevItemPrev = its.some((it: any) => it.item_type === 'developer');
        if (!hasDevItemPrev && bowl.developer_product_id && bowl.developer_amount) {
          const dev = bowl.developer as { cost_per_unit: number; size_unit: string | null } | null;
          if (dev) {
            const devSizeUnit = dev.size_unit || 'ml';
            const devUnit = bowl.developer_unit || 'g';
            const devAmount = Number(bowl.developer_amount) || 0;
            const converted = convertAmountBetweenUnits(devAmount, devUnit, devSizeUnit);
            bowlCost += converted * (Number(dev.cost_per_unit) || 0);
          }
        }

        sessionProductCost += bowlCost;
        return {
          developer_amount: bowl.developer_amount ? Number(bowl.developer_amount) : null,
          developer_unit: bowl.developer_unit,
          items: itemAmounts,
        };
      });
      // V2 engine — same math as salon reports (single source of truth).
      const rev = calculateSessionRevenueV2(
        session.service_id,
        sBowls.length,
        buildEngineItems(sBowls as any, sBowls.flatMap((b: any) => prevBowlItemsMap.get(b.id) || []) as any),
        serviceMap as any,
        settings,
      );
      prevRevenue += rev.grossRevenue;
      prevProductCost += sessionProductCost;
    });

    // Fallback when prev bowls aren't loaded yet — use the non-service approximation
    if (prevBowls.length === 0 && prevSessions.length > 0) {
      prevProductCost = prevProductCostFallback;
      prevRevenue = prevProductCost * settings.backbar_multiplier + prevServices * settings.bowl_fee;
    }
    const prevProfit = prevRevenue - prevProductCost;

    const prevMixed = prevSessions.reduce((sum, s) => sum + (Number(s.total_amount_mixed) || 0), 0);
    const prevUsed = prevSessions.reduce((sum, s) => sum + (Number(s.total_amount_used) || 0), 0);
    const prevWaste = prevMixed > 0 ? ((prevMixed - prevUsed) / prevMixed) * 100 : 0;

    return {
      servicesChange: calculatePercentageChange(summary.services, prevServices),
      revenueChange: calculatePercentageChange(summary.grossRevenue, prevRevenue),
      profitChange: calculatePercentageChange(summary.netProfit, prevProfit),
      wasteChange: summary.wastePercent - prevWaste,
    };
  })();

  // Calculate product usage by category
  const products: CategoryUsage[] = (() => {
    const bowlItems = bowlData.items || [];
    const bowls = bowlData.bowls || [];

    // FIX: Build per-bowl totalProductAmountG in grams for accurate proportional waste allocation
    const bowlWasteMap = new Map<string, { wasteRatio: number; totalG: number; mixed: number; used: number }>();
    bowls.forEach(bowl => {
      const mixed = Number(bowl.amount_mixed) || 0;
      const used = Number(bowl.amount_used) || 0;
      bowlWasteMap.set(bowl.id, {
        wasteRatio: mixed > 0 ? ((mixed - used) / mixed) : 0,
        totalG: 0,
        mixed,
        used,
      });
    });

    // Sum product amounts per bowl in grams
    bowlItems.forEach(item => {
      const bw = bowlWasteMap.get(item.bowl_id);
      if (bw) {
        bw.totalG += convertAmountBetweenUnits(Number(item.amount) || 0, item.unit || 'g', 'g');
      }
    });
    const bowlHasDevItemForWaste = new Set(
      bowlItems.filter((it: any) => it.item_type === 'developer').map((it: any) => it.bowl_id)
    );
    bowls.forEach(bowl => {
      const bw = bowlWasteMap.get(bowl.id);
      if (bw && bowl.developer_amount && !bowlHasDevItemForWaste.has(bowl.id)) {
        bw.totalG += convertAmountBetweenUnits(Number(bowl.developer_amount) || 0, bowl.developer_unit || 'g', 'g');
      }
    });


    const categoryMap = new Map<string, {
      products: Map<string, {
        name: string;
        brand: string;
        shade: string | null;
        amountUsedDisplay: number; // original unit for display
        amountUsedG: number;       // grams for totals/proportion math
        cost: number;
        unit: string;
        wasteAmountG: number;      // proportional waste in grams
      }>;
      totalCost: number;
      unit: string;
    }>();

    // Process bowl items
    bowlItems.forEach(item => {
      const product = item.products as { id: string; name: string; brand: string; type: string; cost_per_unit: number; shade: string | null } | null;
      if (!product) return;

      const category = product.type || 'Other';
      const bw = bowlWasteMap.get(item.bowl_id);
      const amountDisplay = Number(item.amount) || 0;
      const amountG = convertAmountBetweenUnits(amountDisplay, item.unit || 'g', 'g');

      // FIX: proportion based on grams, not raw amounts
      const bowlWasteG = bw ? Math.max(0, bw.mixed - bw.used) : 0;
      const wasteAmountG = (bw && bw.totalG > 0)
        ? bowlWasteG * (amountG / bw.totalG)
        : 0;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { products: new Map(), totalCost: 0, unit: item.unit || 'g' });
      }

      const cat = categoryMap.get(category)!;
      cat.totalCost += Number(item.cost) || 0;

      if (!cat.products.has(product.id)) {
        cat.products.set(product.id, {
          name: product.name,
          brand: product.brand,
          shade: product.shade,
          amountUsedDisplay: 0,
          amountUsedG: 0,
          cost: 0,
          unit: item.unit || 'g',
          wasteAmountG: 0,
        });
      }

      const prod = cat.products.get(product.id)!;
      prod.amountUsedDisplay += amountDisplay;
      prod.amountUsedG += amountG;
      prod.cost += Number(item.cost) || 0;
      prod.wasteAmountG += wasteAmountG;
    });

    // Process developers from legacy bowls.developer_* slot only — for new sessions,
    // developer rows already come through as bowl_items above (avoids double-count).
    const bowlHasDevItemUsage = new Set(
      bowlItems.filter((it: any) => it.item_type === 'developer').map((it: any) => it.bowl_id)
    );
    bowls.forEach(bowl => {
      if (!bowl.developer_product_id || !bowl.developer_amount) return;
      if (bowlHasDevItemUsage.has(bowl.id)) return;


      const developer = bowl.developer as { id: string; name: string; brand: string; type: string; cost_per_unit: number; size_unit: string | null; shade: string | null } | null;
      if (!developer) return;

      const category = 'Developer';
      const amountDisplay = Number(bowl.developer_amount) || 0;
      const devUnit = bowl.developer_unit || 'g';
      const amountG = convertAmountBetweenUnits(amountDisplay, devUnit, 'g');
      const devSizeUnit = developer.size_unit || 'ml';
      const convertedAmount = convertAmountBetweenUnits(amountDisplay, devUnit, devSizeUnit);
      const cost = convertedAmount * (Number(developer.cost_per_unit) || 0);

      const bw = bowlWasteMap.get(bowl.id);
      // FIX: proportion based on grams
      const bowlWasteG = bw ? Math.max(0, bw.mixed - bw.used) : 0;
      const wasteAmountG = (bw && bw.totalG > 0)
        ? bowlWasteG * (amountG / bw.totalG)
        : 0;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { products: new Map(), totalCost: 0, unit: devUnit });
      }

      const cat = categoryMap.get(category)!;
      cat.totalCost += cost;

      if (!cat.products.has(developer.id)) {
        cat.products.set(developer.id, {
          name: developer.name,
          brand: developer.brand,
          shade: developer.shade,
          amountUsedDisplay: 0,
          amountUsedG: 0,
          cost: 0,
          unit: devUnit,
          wasteAmountG: 0,
        });
      }

      const prod = cat.products.get(developer.id)!;
      prod.amountUsedDisplay += amountDisplay;
      prod.amountUsedG += amountG;
      prod.cost += cost;
      prod.wasteAmountG += wasteAmountG;
    });

    // Convert to array with calculated metrics
    return Array.from(categoryMap.entries()).map(([category, data]) => {
      const items: ProductUsageItem[] = Array.from(data.products.entries()).map(([id, prod]) => {
        const revenue = prod.cost * settings.backbar_multiplier;
        const profit = revenue - prod.cost;
        // FIX: waste percent uses gram-accurate proportions
        const totalG = prod.amountUsedG + prod.wasteAmountG;
        const wastePercent = totalG > 0 ? (prod.wasteAmountG / totalG) * 100 : 0;

        return {
          id,
          name: prod.name,
          brand: prod.brand,
          shade: prod.shade,
          amountUsed: prod.amountUsedDisplay,
          unit: prod.unit,
          cost: prod.cost,
          revenue,
          profit,
          wastePercent,
        };
      }).sort((a, b) => b.cost - a.cost);

      // FIX: totalAmountUsed summed correctly — convert each product's grams total back to its display unit
      // For a category, use the first product's unit as the display unit (they're consistent within a category)
      const firstUnit = items[0]?.unit || 'g';
      const totalAmountUsedG = Array.from(data.products.values()).reduce((sum, p) => sum + p.amountUsedG, 0);
      const totalAmountUsed = convertAmountBetweenUnits(totalAmountUsedG, 'g', firstUnit);
      const totalRevenue = data.totalCost * settings.backbar_multiplier;
      const totalProfit = totalRevenue - data.totalCost;

      // Category waste: mixed-weighted in grams (matches salon-wide Reports KPI)
      const totalWasteG = Array.from(data.products.values()).reduce((sum, p) => sum + p.wasteAmountG, 0);
      const totalMixedG = totalAmountUsedG + totalWasteG;
      const avgWaste = totalMixedG > 0 ? (totalWasteG / totalMixedG) * 100 : 0;
      const wasteAmount = convertAmountBetweenUnits(totalWasteG, 'g', firstUnit);
      const wasteValue = totalMixedG > 0 ? (totalWasteG / totalMixedG) * data.totalCost : 0;

      return {
        category,
        totalAmountUsed,
        totalCost: data.totalCost,
        totalRevenue,
        totalProfit,
        unit: firstUnit,
        wastePercent: avgWaste,
        wasteAmount,
        wasteValue,
        items,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  })();

  // Calculate waste by category
  const wasteByCategory: WasteByCategory[] = products.map(cat => ({
    category: cat.category,
    wasteAmount: cat.wasteAmount,
    wastePercent: cat.wastePercent,
    wasteValue: cat.wasteValue,
  }));

  // Calculate commission if applicable
  const commission: CommissionData | null = (() => {
    if (!staff?.receives_commission) return null;

    // BUG 7 FIX: For service sessions, labor = serviceRevenue (not gross - full productCharge)
    // For non-service sessions, labor = gross - (productCost * multiplier)
    const laborCharge = summary.serviceRevenue > 0
      ? summary.serviceRevenue
      : summary.grossRevenue - (summary.productCost * settings.backbar_multiplier);
    const commissionBase = settings.commission_basis === 'labor_only' ? laborCharge : summary.netAfterProduct;

    return {
      enabled: true,
      rate: staff.commission_percent,
      baseRevenue: commissionBase,
      earned: Math.max(0, commissionBase * (staff.commission_percent / 100)),
      basis: settings.commission_basis === 'labor_only' ? 'labor_only' : 'net_profit',
    };
  })();

  // Build service groups with client details
  const serviceGroups: ServiceGroup[] = (() => {
    if (sessions.length === 0) return [];

    const groupMap = new Map<string, ServiceGroup>();

    sessions.forEach(session => {
      const serviceId = session.service_id || null;
      const key = serviceId || '__none__';
      const serviceName = serviceId && serviceMap.has(serviceId)
        ? serviceMap.get(serviceId)!.name
        : 'No Service Linked';

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          serviceId,
          serviceName,
          sessionCount: 0,
          totalRevenue: 0,
          sessions: [],
        });
      }

      const group = groupMap.get(key)!;
      group.sessionCount += 1;

      // Get client info
      const client = session.clients as { id: string; name: string } | null;
      const clientName = client?.name || 'Unknown Client';
      const clientId = client?.id || session.client_id;

      // Calculate per-session revenue
      const sBowls = sessionBowlsMap.get(session.id) || [];
      let sessionProductCost = 0;
      const sessionProducts: ServiceClientSession['products'] = [];

      const bowlsForCalc = sBowls.map(bowl => {
        const items = bowlItemsMap.get(bowl.id) || [];
        let bowlCost = 0;
        const itemAmounts = items.map(item => {
          bowlCost += Number(item.cost) || 0;
          const product = item.products as { name: string; brand: string; shade: string | null } | null;
          if (product) {
            sessionProducts.push({
              name: product.name,
              brand: product.brand,
              shade: product.shade,
              amount: Number(item.amount) || 0,
              unit: item.unit || 'g',
            });
          }
          return { amount: Number(item.amount) || 0, unit: item.unit || 'g' };
        });

        const hasDevItemSg = items.some((it: any) => it.item_type === 'developer');
        if (!hasDevItemSg && bowl.developer_product_id && bowl.developer_amount) {
          const developer = bowl.developer as { cost_per_unit: number; size_unit: string | null; name: string; brand: string; shade: string | null } | null;
          if (developer) {
            const devSizeUnit = developer.size_unit || 'ml';
            const devUnit = bowl.developer_unit || 'g';
            const devAmount = Number(bowl.developer_amount) || 0;
            const devAmountConverted = convertAmountBetweenUnits(devAmount, devUnit, devSizeUnit);
            bowlCost += devAmountConverted * (Number(developer.cost_per_unit) || 0);
            sessionProducts.push({
              name: developer.name,
              brand: developer.brand,
              shade: developer.shade,
              amount: devAmount,
              unit: devUnit,
            });
          }
        }

        sessionProductCost += bowlCost;

        return {
          developer_amount: bowl.developer_amount ? Number(bowl.developer_amount) : null,
          developer_unit: bowl.developer_unit,
          items: itemAmounts,
        };
      });

      // V2 engine — the SAME math as salon reports (single source of truth).
      // The old local formula counted developer items as color usage and
      // ignored multi-component service allotments.
      const rev = calculateSessionRevenueV2(
        session.service_id,
        sBowls.length,
        buildEngineItems(sBowls as any, sBowls.flatMap((b: any) => bowlItemsMap.get(b.id) || []) as any),
        serviceMap as any,
        settings,
      );

      group.totalRevenue += rev.grossRevenue;

      // Waste
      const mixed = Number(session.total_amount_mixed) || 0;
      const used = Number(session.total_amount_used) || 0;
      const wastePercent = mixed > 0 ? ((mixed - used) / mixed) * 100 : 0;

      group.sessions.push({
        sessionId: session.id,
        clientId,
        clientName,
        sessionDate: session.session_date,
        grossRevenue: rev.grossRevenue,
        productCost: sessionProductCost,
        wastePercent,
        products: sessionProducts,
      });
    });

    // Sort groups: named services first, "No Service Linked" last
    return Array.from(groupMap.values()).sort((a, b) => {
      if (!a.serviceId && b.serviceId) return 1;
      if (a.serviceId && !b.serviceId) return -1;
      return b.totalRevenue - a.totalRevenue;
    });
  })();

  return {
    staff,
    summary,
    changes,
    products,
    wasteByCategory,
    commission,
    serviceGroups,
    isLoading,
    error: error as Error | null,
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import {
  calculatePeriodTotals,
  buildEngineItems,
  calculateSessionRevenueV2,
  bucketForProductType,
  type ServiceMenuItem,
  type EngineBowlInput,
  type EngineItemInput,
} from "@/lib/reports/revenueEngine";
import { fetchAllRows, fetchAllInChunks } from "@/lib/reports/fetchAllRows";


import { convertAmountBetweenUnits } from "@/lib/units";

interface DateRange {
  from: Date;
  to: Date;
}

export interface StylistReportData {
  id: string;
  name: string;
  initials: string;
  services: number;
  productCost: number;
  markupRevenue: number;
  bowlFeeRevenue: number;
  grossRevenue: number;
  netProfit: number;
  bowlCount: number;
  waste: number;
  totalMixedG: number;
  totalUsedG: number;
  avgServiceCost: number;
  netMargin: number;
  trend: number | null;
  trendDirection: "up" | "down" | "neutral";
  commissionRate: number;
  commissionEarned: number;
  receivesCommission: boolean;
  laborCharge: number;
  productMarkup: number;
  salonKeeps: number;
}

export interface ProductReportData {
  id: string;
  name: string;
  amountUsed: number;
  amountMixed: number;
  unit: string;
  cost: number;
  waste: number;
  amountUsedG: number;
  amountMixedG: number;
  wasteAmountG: number;
}

export interface CategoryReportData {
  id: string;
  category: string;
  totalAmountUsed: number;
  totalAmountMixed: number;
  unit: string;
  totalCost: number;
  waste: number;
  totalMixedG: number;
  totalUsedG: number;
  products: ProductReportData[];
}

export interface ReportStats {
  totalRevenue: number;
  wastePercent: number;
  avgServiceCost: number;
  netMargin: number;
  revenueChange: number | null;
  wasteChange: number | null;
  avgCostChange: number | null;
  marginChange: number | null;
  sessionCount: number;
  sessionCountChange: number | null;
  bowlCount: number;
  totalProductCost: number;
  totalCommissionPaid: number;
  profitAfterCommission: number;
  commissionByStaff: Array<{ name: string; rate: number; amount: number }>;
  serviceRevenue: number;
  overageRevenue: number;
  bowlFeeRevenue: number;
  markupRevenue: number;
  laborCharge: number;
  productMarkup: number;
  salonKeeps: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

async function fetchSessionStats(fromDate: string, toDate: string) {
  const sessions = await fetchAllRows<{ id: string; total_cost: number | null; total_amount_mixed: number | null; total_amount_used: number | null; service_id: string | null }>(
    (from, to) => supabase
      .from('color_sessions')
      .select('id, total_cost, total_amount_mixed, total_amount_used, service_id')
      .gte('session_date', fromDate)
      .lte('session_date', toDate)
      .gt('total_amount_mixed', 0)
      .range(from, to)
  );

  const totalProductCost = sessions.reduce((sum, s) => sum + (Number(s.total_cost) || 0), 0);
  const totalMixed = sessions.reduce((sum, s) => sum + (Number(s.total_amount_mixed) || 0), 0);
  const totalUsed = sessions.reduce((sum, s) => sum + (Number(s.total_amount_used) || 0), 0);
  const wasteAmount = totalMixed - totalUsed;
  const wastePercent = totalMixed > 0 ? (wasteAmount / totalMixed) * 100 : 0;
  const avgServiceCost = sessions.length > 0 ? totalProductCost / sessions.length : 0;
  const sessionCount = sessions.length;

  return { totalProductCost, wastePercent, avgServiceCost, sessionCount };
}

export function useReportsData(dateRange: DateRange | null) {
  const fromDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : null;
  const toDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : null;

  // Calculate previous period dates
  const previousPeriod = dateRange ? getPreviousPeriod(dateRange) : null;
  const prevFromDate = previousPeriod ? format(previousPeriod.from, 'yyyy-MM-dd') : null;
  const prevToDate = previousPeriod ? format(previousPeriod.to, 'yyyy-MM-dd') : null;

  // Fetch salon settings for markup and bowl fee
  const settingsQuery = useQuery({
    queryKey: ['salon-settings-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_settings')
        .select('markup_percent, bowl_fee, backbar_multiplier, waste_factor_percent, commission_basis')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || { markup_percent: 35, bowl_fee: 2.50, backbar_multiplier: 4, waste_factor_percent: 5, commission_basis: 'labor_only' };
    },
  });

  // Fetch service menu (with multi-component allotments) for overage calculations
  const serviceMenuQuery = useQuery({
    queryKey: ['report-service-menu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_menu')
        .select('id, name, price, color_amount, color_unit, developer_amount, developer_unit, components:service_menu_components(product_type, product_amount, product_unit, developer_amount, developer_unit)' as any)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as any[];
    },
  });


  // Fetch color sessions with related data
  const sessionsQuery = useQuery({
    queryKey: ['report-sessions', fromDate, toDate],
    queryFn: async () => {
      return await fetchAllRows<any>((from, to) => {
        let query = supabase
          .from('color_sessions')
          .select(`
            id,
            session_date,
            total_cost,
            total_amount_mixed,
            total_amount_used,
            stylist_id,
            service_id,
            staff:stylist_id (
              id,
              name
            )
          `);

        if (fromDate && toDate) {
          query = query.gte('session_date', fromDate).lte('session_date', toDate);
        }
        // Exclude empty/abandoned sessions so Color Services + Avg per Service stay honest
        query = query.gt('total_amount_mixed', 0).range(from, to);
        return query;
      });
    },
    enabled: true,
  });

  // Fetch previous period stats for comparison
  const previousStatsQuery = useQuery({
    queryKey: ['report-sessions-previous', prevFromDate, prevToDate],
    queryFn: async () => {
      if (!prevFromDate || !prevToDate) return null;
      return fetchSessionStats(prevFromDate, prevToDate);
    },
    enabled: !!prevFromDate && !!prevToDate,
  });

  // Previous-period sessions + bowls + items, for service-aware prev revenue calc
  const previousBowlDataQuery = useQuery({
    queryKey: ['report-bowl-data-previous', prevFromDate, prevToDate],
    queryFn: async () => {
      if (!prevFromDate || !prevToDate) return { sessions: [], bowls: [], items: [] };
      const sessions = await fetchAllRows<any>((from, to) =>
        supabase
          .from('color_sessions')
          .select('id, service_id, total_amount_mixed, total_amount_used')
          .gte('session_date', prevFromDate)
          .lte('session_date', prevToDate)
          .gt('total_amount_mixed', 0)
          .range(from, to)
      );
      if (sessions.length === 0) return { sessions: [], bowls: [], items: [] };
      const sessionIds = sessions.map(s => s.id);
      const bowls = await fetchAllInChunks<any>(sessionIds, (chunk, from, to) =>
        supabase
          .from('session_bowls')
          .select(`id, session_id, amount_mixed, amount_used, developer_product_id, developer_amount, developer_unit, developer:developer_product_id (id, name, brand, type, cost_per_unit, size_unit)`)
          .in('session_id', chunk)
          .range(from, to)
      );
      if (bowls.length === 0) return { sessions, bowls: [], items: [] };
      const items = await fetchAllInChunks<any>(bowls.map(b => b.id), (chunk, from, to) =>
        supabase
          .from('bowl_items')
          .select('id, amount, cost, unit, bowl_id, product_id, item_type')

          .in('bowl_id', chunk)
          .range(from, to)
      );
      return { sessions, bowls, items };
    },
    enabled: !!prevFromDate && !!prevToDate,
  });

  // Fetch bowls with developer info AND bowl items for the date range
  const bowlDataQuery = useQuery({
    queryKey: ['report-bowl-data', fromDate, toDate],
    queryFn: async () => {
      const sessions = await fetchAllRows<any>((from, to) => {
        let q = supabase
          .from('color_sessions')
          .select('id, total_amount_mixed, total_amount_used');
        if (fromDate && toDate) {
          q = q.gte('session_date', fromDate).lte('session_date', toDate);
        }
        return q.gt('total_amount_mixed', 0).range(from, to);
      });

      if (sessions.length === 0) {
        return { items: [], bowls: [], bowlCount: 0, sessions: [] };
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
              size_unit
            )
          `)
          .in('session_id', chunk)
          .range(from, to)
      );

      if (bowls.length === 0) {
        return { items: [], bowls: [], bowlCount: 0, sessions };
      }

      const bowlIds = bowls.map(b => b.id);
      const bowlCount = bowls.length;

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
              cost_per_unit
            )
          `)
          .in('bowl_id', chunk)
          .range(from, to)
      );

      return { items, bowls, bowlCount, sessions };
    },
    enabled: true,
  });

  // Fetch all staff for stylist reports
  const staffQuery = useQuery({
    queryKey: ['report-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, is_active, receives_commission, commission_percent')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats with comparison — routed through shared engine so developer cost
  // is not double-counted (bowl_items already contain developer rows post-March 2026)
  // and multi-component service allotments are respected.
  const stats: ReportStats = (() => {
    const sessions = sessionsQuery.data || [];
    const prevStats = previousStatsQuery.data;
    const bowlData = bowlDataQuery.data ?? { items: [], bowls: [], bowlCount: 0, sessions: [] };
    const bowlItems = bowlData.items ?? [];
    const bowls = bowlData.bowls ?? [];
    const settings = settingsQuery.data ?? { markup_percent: 35, bowl_fee: 2.50, backbar_multiplier: 4, waste_factor_percent: 5, commission_basis: 'labor_only' };
    const serviceMenuItems = serviceMenuQuery.data || [];

    const svcMap = new Map<string, ServiceMenuItem>();
    serviceMenuItems.forEach((s: any) => svcMap.set(s.id, {
      id: s.id,
      name: s.name,
      price: Number(s.price) || 0,
      color_amount: Number(s.color_amount) || 0,
      color_unit: s.color_unit || 'g',
      developer_amount: Number(s.developer_amount) || 0,
      developer_unit: s.developer_unit || 'g',
      components: (s.components || []).map((c: any) => ({
        product_type: c.product_type,
        product_amount: Number(c.product_amount) || 0,
        product_unit: c.product_unit || 'g',
        developer_amount: Number(c.developer_amount) || 0,
        developer_unit: c.developer_unit || 'g',
      })),
    }));

    const engineBowls: EngineBowlInput[] = bowls.map((b: any) => ({
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
    const engineItemInputs: EngineItemInput[] = bowlItems.map((it: any) => ({
      bowl_id: it.bowl_id,
      product_id: it.product_id,
      amount: it.amount,
      unit: it.unit,
      cost: it.cost,
      item_type: it.item_type,
      products: it.products ? { type: it.products.type } : null,
    }));

    const period = calculatePeriodTotals({
      sessions: sessions as any,
      bowls: engineBowls,
      items: engineItemInputs,
      serviceMap: svcMap,
      settings,
    });

    const totalRevenue = period.totalRevenue;
    const totalServiceRevenue = period.serviceRevenue;
    const totalOverageRevenue = period.overageRevenue;
    const totalBowlFeeRevenue = period.bowlFeeRevenue;
    const totalProductCost = period.totalProductCost;
    const bowlCount = bowlData.bowlCount ?? period.bowlCount;
    const markupRevenue = period.markupRevenue;

    // Waste from stored session totals (unchanged)
    const totalMixed = sessions.reduce((sum, s) => sum + (Number(s.total_amount_mixed) || 0), 0);
    const totalUsed = sessions.reduce((sum, s) => sum + (Number(s.total_amount_used) || 0), 0);
    const wastePercent = totalMixed > 0 ? ((totalMixed - totalUsed) / totalMixed) * 100 : 0;

    const sessionCount = sessions.length;
    const avgServiceCost = sessionCount > 0 ? totalRevenue / sessionCount : 0;
    const netMargin = totalRevenue > 0 ? ((totalRevenue - totalProductCost) / totalRevenue) * 100 : 0;

    // Previous-period revenue via same engine
    const prevData = previousBowlDataQuery.data ?? { sessions: [], bowls: [], items: [] };
    const prevTotals = (prevData.sessions && prevData.sessions.length > 0)
      ? calculatePeriodTotals({
          sessions: prevData.sessions as any,
          bowls: prevData.bowls as any,
          items: prevData.items as any,
          serviceMap: svcMap,
          settings,
        })
      : null;
    const prevRevenue = prevTotals?.totalRevenue ?? 0;
    const revenueChange = prevTotals ? calculatePercentageChange(totalRevenue, prevRevenue) : null;
    const wasteChange = prevStats ? wastePercent - prevStats.wastePercent : null;
    const avgCostChange = prevStats ? calculatePercentageChange(avgServiceCost, prevStats.avgServiceCost) : null;
    const sessionCountChange = prevStats ? calculatePercentageChange(sessionCount, prevStats.sessionCount) : null;

    // Stash per-session revenue so stylist aggregation can reuse it (avoids drift).
    (globalThis as any).__reportsPerSession = period.perSession;

    return {
      totalRevenue,
      wastePercent,
      avgServiceCost,
      netMargin,
      revenueChange,
      wasteChange,
      avgCostChange,
      marginChange: null,
      sessionCount,
      sessionCountChange,
      bowlCount,
      totalProductCost,
      totalCommissionPaid: 0,
      profitAfterCommission: 0,
      commissionByStaff: [] as Array<{ name: string; rate: number; amount: number }>,
      serviceRevenue: totalServiceRevenue,
      overageRevenue: totalOverageRevenue,
      bowlFeeRevenue: totalBowlFeeRevenue,
      markupRevenue,
      laborCharge: totalServiceRevenue,
      productMarkup: markupRevenue,
      salonKeeps: totalRevenue - totalProductCost,
    };

  })();

  // Stylist reports — same engine as salon stats, per-session revenue attributed to stylist
  const stylistReports: StylistReportData[] = (() => {
    const sessions = sessionsQuery.data || [];
    const staff = staffQuery.data || [];
    const bowlData = bowlDataQuery.data ?? { items: [], bowls: [], bowlCount: 0, sessions: [] };
    const bowlItems = bowlData.items ?? [];
    const bowls = bowlData.bowls ?? [];
    const settings = settingsQuery.data ?? { markup_percent: 35, bowl_fee: 2.50, backbar_multiplier: 4, waste_factor_percent: 5, commission_basis: 'labor_only' };
    const serviceMenuItems = serviceMenuQuery.data || [];

    const svcMap = new Map<string, ServiceMenuItem>();
    serviceMenuItems.forEach((s: any) => svcMap.set(s.id, {
      id: s.id,
      name: s.name,
      price: Number(s.price) || 0,
      color_amount: Number(s.color_amount) || 0,
      color_unit: s.color_unit || 'g',
      developer_amount: Number(s.developer_amount) || 0,
      developer_unit: s.developer_unit || 'g',
      components: (s.components || []).map((c: any) => ({
        product_type: c.product_type,
        product_amount: Number(c.product_amount) || 0,
        product_unit: c.product_unit || 'g',
        developer_amount: Number(c.developer_amount) || 0,
        developer_unit: c.developer_unit || 'g',
      })),
    }));

    const engineBowls: EngineBowlInput[] = bowls.map((b: any) => ({
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
    const engineItemInputs: EngineItemInput[] = bowlItems.map((it: any) => ({
      bowl_id: it.bowl_id,
      product_id: it.product_id,
      amount: it.amount,
      unit: it.unit,
      cost: it.cost,
      item_type: it.item_type,
      products: it.products ? { type: it.products.type } : null,
    }));

    const period = calculatePeriodTotals({
      sessions: sessions as any,
      bowls: engineBowls,
      items: engineItemInputs,
      serviceMap: svcMap,
      settings,
    });

    const stylistMap = new Map<string, {
      name: string;
      services: number;
      productCost: number;
      grossRevenue: number;
      serviceRevenue: number;
      totalMixed: number;
      totalUsed: number;
      bowlCount: number;
    }>();

    staff.forEach(s => {
      stylistMap.set(s.id, {
        name: s.name,
        services: 0,
        productCost: 0,
        grossRevenue: 0,
        serviceRevenue: 0,
        totalMixed: 0,
        totalUsed: 0,
        bowlCount: 0,
      });
    });

    sessions.forEach((session) => {
      if (!session.stylist_id) return;
      const rev = period.perSession.get(session.id);
      if (!rev) return;
      const existing = stylistMap.get(session.stylist_id) ?? {
        name: (session.staff as any)?.name || 'Unknown',
        services: 0, productCost: 0, grossRevenue: 0, serviceRevenue: 0,
        totalMixed: 0, totalUsed: 0, bowlCount: 0,
      };
      existing.services += 1;
      existing.productCost += rev.productCost;
      existing.grossRevenue += rev.grossRevenue;
      existing.serviceRevenue += rev.serviceRevenue;
      existing.totalMixed += Number(session.total_amount_mixed) || 0;
      existing.totalUsed += Number(session.total_amount_used) || 0;
      existing.bowlCount += rev.bowlCount;
      stylistMap.set(session.stylist_id, existing);
    });

    return Array.from(stylistMap.entries())
      .filter(([_, data]) => data.services > 0)
      .map(([id, data]) => {
        const waste = data.totalMixed > 0
          ? ((data.totalMixed - data.totalUsed) / data.totalMixed) * 100
          : 0;

        const grossRevenue = data.grossRevenue;
        const bowlFeeRevenue = data.bowlCount * settings.bowl_fee;
        const serviceRevenue = data.serviceRevenue || 0;
        const markupRevenue = grossRevenue - serviceRevenue - data.productCost - bowlFeeRevenue;
        const netProfit = grossRevenue - data.productCost;
        const laborCharge = serviceRevenue > 0
          ? serviceRevenue
          : grossRevenue - (data.productCost * settings.backbar_multiplier);

        const avgServiceCost = data.services > 0 ? grossRevenue / data.services : 0;
        const netMargin = grossRevenue > 0 ? ((grossRevenue - data.productCost) / grossRevenue) * 100 : 0;

        const staffRecord = staff.find(s => s.id === id);
        const receivesCommission = staffRecord?.receives_commission ?? false;
        const commissionRate = receivesCommission ? (staffRecord?.commission_percent ?? 0) : 0;
        const commissionBase = settings.commission_basis === 'labor_only' ? laborCharge : netProfit;
        const commissionEarned = receivesCommission ? commissionBase * (commissionRate / 100) : 0;

        return {
          id,
          name: data.name,
          initials: getInitials(data.name),
          services: data.services,
          productCost: data.productCost,
          markupRevenue,
          bowlFeeRevenue,
          grossRevenue,
          netProfit,
          bowlCount: data.bowlCount,
          waste,
          totalMixedG: data.totalMixed,
          totalUsedG: data.totalUsed,
          avgServiceCost,
          netMargin,
          trend: null,
          trendDirection: "neutral" as const,
          commissionRate,
          commissionEarned,
          receivesCommission,
          laborCharge,
          productMarkup: markupRevenue,
          salonKeeps: grossRevenue - data.productCost - commissionEarned,
        };
      })
      .sort((a, b) => b.services - a.services);
  })();


  // Calculate product/category reports with actual waste allocation
  const categoryReports: CategoryReportData[] = (() => {
    const bowlData = bowlDataQuery.data ?? { items: [], bowls: [], bowlCount: 0, sessions: [] };
    const items = bowlData.items ?? [];
    const bowls = bowlData.bowls ?? [];
    const displayUnit = settingsQuery.data ? 'g' : 'g'; // normalize to grams internally, convert for display

    // Create a map of bowl_id to bowl data for waste calculation
    // FIX: totalProductAmountG normalizes all amounts to grams for accurate proportional waste allocation
    const bowlMap = new Map<string, {
      amountMixed: number;
      amountUsed: number;
      totalProductAmountG: number; // always in grams for proportion math
    }>();

    // First pass: initialize bowls
    bowls.forEach(bowl => {
      bowlMap.set(bowl.id, {
        amountMixed: Number(bowl.amount_mixed) || 0,
        amountUsed: Number(bowl.amount_used) || 0,
        totalProductAmountG: 0,
      });
    });

    // Sum up product amounts per bowl — normalized to grams
    items.forEach(item => {
      const bowl = bowlMap.get(item.bowl_id);
      if (bowl) {
        bowl.totalProductAmountG += convertAmountBetweenUnits(Number(item.amount) || 0, item.unit || 'g', 'g');
      }
    });

    // Add developer amounts from the legacy bowls.developer_* slot — but only
    // for bowls that don't already have developer bowl_items (else double count).
    const bowlsWithDevItemForWaste = new Set(
      items.filter((it: any) => it.item_type === 'developer').map((it: any) => it.bowl_id)
    );
    bowls.forEach(bowl => {
      const bd = bowlMap.get(bowl.id);
      if (bd && bowl.developer_amount && !bowlsWithDevItemForWaste.has(bowl.id)) {
        bd.totalProductAmountG += convertAmountBetweenUnits(Number(bowl.developer_amount) || 0, bowl.developer_unit || 'g', 'g');
      }
    });

    
    const categoryMap = new Map<string, {
      products: Map<string, {
        name: string;
        amountUsedG: number; // always grams for proportion/total math
        amountUsedDisplay: number; // in original unit for display
        cost: number;
        unit: string;
        wasteAmountG: number; // grams
      }>;
    }>();

    const productTypes = ['Color', 'Developer', 'Lightener', 'Treatment'];
    productTypes.forEach(type => {
      categoryMap.set(type, { products: new Map() });
    });

    // Process bowl items (non-developer products)
    items.forEach(item => {
      const product = item.products as { id: string; name: string; brand: string; type: string; cost_per_unit: number } | null;
      if (!product) return;

      const category = categoryMap.get(product.type);
      if (!category) return;

      const amountDisplay = Number(item.amount) || 0;
      const amountG = convertAmountBetweenUnits(amountDisplay, item.unit || 'g', 'g');

      // Calculate proportional waste for this product — all in grams
      const bowl = bowlMap.get(item.bowl_id);
      let productWasteAmountG = 0;
      if (bowl && bowl.totalProductAmountG > 0) {
        const bowlWasteG = Math.max(0, bowl.amountMixed - bowl.amountUsed);
        const productProportion = amountG / bowl.totalProductAmountG;
        productWasteAmountG = bowlWasteG * productProportion;
      }

      const existingProduct = category.products.get(product.id);
      if (existingProduct) {
        existingProduct.amountUsedG += amountG;
        existingProduct.amountUsedDisplay += amountDisplay;
        existingProduct.cost += Number(item.cost) || 0;
        existingProduct.wasteAmountG += productWasteAmountG;
      } else {
        category.products.set(product.id, {
          name: `${product.brand} ${product.name}`,
          amountUsedG: amountG,
          amountUsedDisplay: amountDisplay,
          cost: Number(item.cost) || 0,
          unit: item.unit || 'g',
          wasteAmountG: productWasteAmountG,
        });
      }
    });

    // Bowls with developer bowl_items already accounted for above — skip the legacy slot for those.
    const bowlsWithDevItem = new Set(
      items.filter((it: any) => it.item_type === 'developer').map((it: any) => it.bowl_id)
    );

    // Process developer products from legacy bowls.developer_* slot (older sessions only)
    bowls.forEach(bowl => {
      if (!bowl.developer_product_id || !bowl.developer_amount) return;
      if (bowlsWithDevItem.has(bowl.id)) return;

      const developer = bowl.developer as { id: string; name: string; brand: string; type: string; cost_per_unit: number; size_unit: string | null } | null;
      if (!developer) return;

      const category = categoryMap.get('Developer');
      if (!category) return;

      const amountDisplay = Number(bowl.developer_amount) || 0;
      const devUnit = bowl.developer_unit || 'g';
      const amountG = convertAmountBetweenUnits(amountDisplay, devUnit, 'g');
      const devSizeUnit = developer.size_unit || 'ml';
      const convertedAmount = convertAmountBetweenUnits(amountDisplay, devUnit, devSizeUnit);
      const cost = convertedAmount * (Number(developer.cost_per_unit) || 0);

      const bd = bowlMap.get(bowl.id);
      let developerWasteAmountG = 0;
      if (bd && bd.totalProductAmountG > 0) {
        const bowlWasteG = Math.max(0, bd.amountMixed - bd.amountUsed);
        const developerProportion = amountG / bd.totalProductAmountG;
        developerWasteAmountG = bowlWasteG * developerProportion;
      }

      const existingProduct = category.products.get(developer.id);
      if (existingProduct) {
        existingProduct.amountUsedG += amountG;
        existingProduct.amountUsedDisplay += amountDisplay;
        existingProduct.cost += cost;
        existingProduct.wasteAmountG += developerWasteAmountG;
      } else {
        category.products.set(developer.id, {
          name: `${developer.brand} ${developer.name}`,
          amountUsedG: amountG,
          amountUsedDisplay: amountDisplay,
          cost: cost,
          unit: bowl.developer_unit || 'g',
          wasteAmountG: developerWasteAmountG,
        });
      }
    });


    return productTypes.map(type => {
      const category = categoryMap.get(type)!;
      const products = Array.from(category.products.entries()).map(([id, p]) => {
        // Waste = mixed - used, all in grams; %% relative to mixed
        const amountMixedG = p.amountUsedG + p.wasteAmountG;
        const wastePercent = amountMixedG > 0 ? (p.wasteAmountG / amountMixedG) * 100 : 0;
        const amountMixedDisplay = convertAmountBetweenUnits(amountMixedG, 'g', p.unit);

        return {
          id,
          name: p.name,
          amountUsed: p.amountUsedDisplay, // display in original unit
          amountMixed: amountMixedDisplay,
          unit: p.unit,
          cost: p.cost,
          waste: wastePercent,
          amountUsedG: p.amountUsedG,
          amountMixedG,
          wasteAmountG: p.wasteAmountG,
        };
      });

      // Category totals — all in grams, then convert for display
      const firstUnit = products[0]?.unit || 'g';
      const totalAmountUsedG = products.reduce((sum, p) => sum + p.amountUsedG, 0);
      const totalAmountMixedG = products.reduce((sum, p) => sum + p.amountMixedG, 0);
      const totalAmountUsed = convertAmountBetweenUnits(totalAmountUsedG, 'g', firstUnit);
      const totalAmountMixed = convertAmountBetweenUnits(totalAmountMixedG, 'g', firstUnit);
      const totalCost = products.reduce((sum, p) => sum + p.cost, 0);

      // Category waste: weighted by amount MIXED (matches overall KPI)
      const weightedWaste = totalAmountMixedG > 0
        ? ((totalAmountMixedG - totalAmountUsedG) / totalAmountMixedG) * 100
        : 0;

      return {
        id: type.toLowerCase(),
        category: type,
        totalAmountUsed,
        totalAmountMixed,
        unit: firstUnit,
        totalCost,
        waste: weightedWaste,
        totalMixedG: totalAmountMixedG,
        totalUsedG: totalAmountUsedG,
        products: products.sort((a, b) => b.cost - a.cost),
      };
    }).filter(c => c.products.length > 0);
  })();

  // Compute commission totals from stylist reports and enrich stats
  const totalCommissionPaid = stylistReports.reduce((sum, s) => sum + s.commissionEarned, 0);
  const netProfit = stats.totalRevenue - stats.totalProductCost; // markup + bowl fees
  const profitAfterCommission = netProfit - totalCommissionPaid;
  const commissionByStaff = stylistReports
    .filter(s => s.receivesCommission && s.commissionEarned > 0)
    .map(s => ({ name: s.name, rate: s.commissionRate, amount: s.commissionEarned }));

  const enrichedStats: ReportStats = {
    ...stats,
    totalCommissionPaid,
    profitAfterCommission,
    commissionByStaff,
    salonKeeps: stats.totalRevenue - stats.totalProductCost - totalCommissionPaid,
  };

  // Dev-only reconciliation invariants — surface drift immediately
  if (import.meta.env.DEV) {
    const stylistGross = stylistReports.reduce((s, r) => s + r.grossRevenue, 0);
    const stylistCost = stylistReports.reduce((s, r) => s + r.productCost, 0);
    const sum = enrichedStats.serviceRevenue + enrichedStats.overageRevenue + enrichedStats.bowlFeeRevenue + enrichedStats.markupRevenue + enrichedStats.totalProductCost;
    if (enrichedStats.totalRevenue > 0 && Math.abs(sum - enrichedStats.totalRevenue) > 0.5) {
      // serviceRev + overage + bowlFee + markup + productCost should == totalRevenue + productCost
      // (markup absorbs the product COGS in non-service path). Only warn on large drift.
    }
    if (stylistGross > 0 && Math.abs(stylistGross - enrichedStats.totalRevenue) > 1) {
      // eslint-disable-next-line no-console
      console.warn('[reports] stylist gross sum diverges from salon totalRevenue', { stylistGross, salon: enrichedStats.totalRevenue });
    }
    if (stylistCost > 0 && Math.abs(stylistCost - enrichedStats.totalProductCost) > 0.5) {
      // eslint-disable-next-line no-console
      console.warn('[reports] stylist productCost sum diverges from salon totalProductCost', { stylistCost, salon: enrichedStats.totalProductCost });
    }
    const stylistKeeps = stylistReports.reduce((s, r) => s + r.salonKeeps, 0);
    const stylistCommission = stylistReports.reduce((s, r) => s + r.commissionEarned, 0);
    if (stylistKeeps > 0 && Math.abs(stylistKeeps - enrichedStats.salonKeeps) > 1) {
      // eslint-disable-next-line no-console
      console.warn('[reports] stylist salonKeeps sum diverges from salon salonKeeps', { stylistKeeps, salon: enrichedStats.salonKeeps });
    }
    if (Math.abs(stylistCommission - enrichedStats.totalCommissionPaid) > 0.01) {
      // eslint-disable-next-line no-console
      console.warn('[reports] stylist commission sum diverges from totalCommissionPaid', { stylistCommission, salon: enrichedStats.totalCommissionPaid });
    }
  }

  return {
    stats: enrichedStats,
    stylistReports,
    categoryReports,
    isLoading: sessionsQuery.isLoading || bowlDataQuery.isLoading || staffQuery.isLoading || settingsQuery.isLoading || serviceMenuQuery.isLoading || previousBowlDataQuery.isLoading,
    error: sessionsQuery.error || bowlDataQuery.error || staffQuery.error || settingsQuery.error || serviceMenuQuery.error || previousBowlDataQuery.error,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FormulaRecord, FormulaComponent, BowlRecord } from "./useClients";
import { convertToGrams } from "@/lib/unitConversion";
import { convertAmountBetweenUnits } from "@/lib/units";

export function useClientDetail(clientId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["clientDetail", clientId],
    queryFn: async (): Promise<FormulaRecord[]> => {
      if (!clientId) return [];

      // Fetch sessions for this specific client
      const { data: sessions, error: sessionsError } = await supabase
        .from("color_sessions")
        .select(`
          id,
          session_date,
          created_at,
          stylist_id,
          notes,
          total_amount_mixed,
          total_amount_used,
          service_id
        `)
        .eq("client_id", clientId)
        .order("session_date", { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions?.length) return [];

      // Get staff for stylist names
      const stylistIds = [...new Set(sessions.map(s => s.stylist_id).filter(Boolean))];
      const { data: staffDirectory } = await supabase
        .rpc("list_tenant_staff_directory");
      const staffData = (staffDirectory || []).filter(
        (s: any) => stylistIds.includes(s.id)
      );

      const staffMap = new Map(staffData?.map((s: any) => [s.id, s.name]) || []);

      // Fetch service names for sessions that have a service_id
      const serviceIds = [...new Set(sessions.map(s => s.service_id).filter(Boolean))] as string[];
      let serviceMap = new Map<string, string>();
      if (serviceIds.length > 0) {
        const { data: serviceData } = await supabase
          .from("service_menu")
          .select("id, name")
          .in("id", serviceIds);
        serviceMap = new Map(serviceData?.map(s => [s.id, s.name]) || []);
      }

      // Get bowls for these sessions
      const sessionIds = sessions.map(s => s.id);
      const { data: bowls } = await supabase
        .from("session_bowls")
        .select(`
          id,
          session_id,
          developer_product_id,
          developer_amount,
          developer_unit,
          amount_mixed,
          amount_used,
          name
        `)
        .in("session_id", sessionIds);

      // Get bowl items
      const bowlIds = bowls?.map(b => b.id) || [];
      const { data: bowlItems } = await supabase
        .from("bowl_items")
        .select(`
          id,
          bowl_id,
          product_id,
          amount,
          unit
        `)
        .in("bowl_id", bowlIds);

      // Get products
      const productIds = [
        ...new Set([
          ...(bowlItems?.map(bi => bi.product_id) || []),
          ...(bowls?.map(b => b.developer_product_id).filter(Boolean) || [])
        ])
      ];
      
      const { data: products } = await supabase
        .from("products")
        .select("id, name, shade, type, brand, line")
        .in("id", productIds);

      const productMap = new Map(products?.map(p => [p.id, p]) || []);
      const bowlMap = new Map<string, typeof bowls>();
      bowls?.forEach(b => {
        const existing = bowlMap.get(b.session_id) || [];
        bowlMap.set(b.session_id, [...existing, b]);
      });

      // Build formula history
      return sessions.map(session => {
        const sessionBowls = bowlMap.get(session.id) || [];
        
        // Flat lists for backward compatibility
        const components: FormulaComponent[] = [];
        let developerInfo: { productId: string; name: string; amount: number; unit?: string } | undefined;
        
        // Bowl-grouped data for structured display
        const bowlRecords: BowlRecord[] = [];
        
        sessionBowls.forEach((bowl: any) => {
          const items = bowlItems?.filter(bi => bi.bowl_id === bowl.id) || [];
          const bowlComponents: FormulaComponent[] = [];
          let bowlDeveloper: BowlRecord['developer'] | undefined;

          items.forEach(item => {
            const product = productMap.get(item.product_id);
            if (product) {
              const lineOrBrand = product.line || product.brand || '';
              const shadeOrName = product.shade || product.name;
              const displayName = lineOrBrand ? `${lineOrBrand} ${shadeOrName}` : shadeOrName;
              if (product.type === 'Developer') {
                const devEntry = { 
                  productId: product.id,
                  name: displayName, 
                  amount: Number(item.amount),
                  unit: item.unit || undefined
                };
                if (!developerInfo) developerInfo = devEntry;
                bowlDeveloper = devEntry;
              } else {
                const comp = {
                  productId: product.id,
                  productName: displayName,
                  amount: Number(item.amount),
                  line: product.line || undefined,
                  unit: item.unit || undefined
                };
                components.push(comp);
                bowlComponents.push(comp);
              }
            }
          });
          
          if (!bowlDeveloper && bowl.developer_product_id) {
            const devProduct = productMap.get(bowl.developer_product_id);
            if (devProduct) {
              const devLineOrBrand = devProduct.line || devProduct.brand || '';
              const devShadeOrName = devProduct.shade || devProduct.name;
              const displayName = devLineOrBrand ? `${devLineOrBrand} ${devShadeOrName}` : devShadeOrName;
              const devEntry = {
                productId: devProduct.id,
                name: displayName,
                amount: Number(bowl.developer_amount) || 0,
                unit: bowl.developer_unit || undefined,
              };
              if (!developerInfo) developerInfo = devEntry;
              bowlDeveloper = devEntry;
            }
          }

          if (!bowlDeveloper && bowl.developer_amount) {
            const devEntry = {
              productId: '',
              name: 'Developer',
              amount: Number(bowl.developer_amount),
              unit: bowl.developer_unit || undefined,
            };
            if (!developerInfo) developerInfo = devEntry;
            bowlDeveloper = devEntry;
          }

          bowlRecords.push({
            bowlId: bowl.id,
            name: bowl.name || `Bowl ${bowlRecords.length + 1}`,
            components: bowlComponents,
            developer: bowlDeveloper,
            amountMixed: Number(bowl.amount_mixed) || undefined,
            amountUsed: Number(bowl.amount_used) || undefined,
          });
        });

        const formulaParts = components.map(c => `${c.productName} (${c.amount}${c.unit || 'g'})`);
        if (developerInfo) {
          formulaParts.push(`${developerInfo.name} (${developerInfo.amount}${developerInfo.unit || 'g'})`);
        }

        const serviceName = session.service_id ? serviceMap.get(session.service_id) : undefined;

        return {
          id: session.id,
          date: new Date(session.session_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          sessionDate: session.session_date,
          createdAt: session.created_at,
          stylist: session.stylist_id ? (staffMap.get(session.stylist_id) || 'Unknown') : 'Unknown',
          stylistId: session.stylist_id || undefined,
          formula: formulaParts.join(' + ') || 'No formula recorded',
          notes: session.notes || undefined,
          amountMixed: Number(session.total_amount_mixed) || undefined,
          amountUsed: Number(session.total_amount_used) || undefined,
          unit: (components[0]?.unit || developerInfo?.unit || 'g') as 'g' | 'oz',
          components: components.length > 0 ? components : undefined,
          developer: developerInfo,
          serviceId: session.service_id || undefined,
          bowls: bowlRecords.length > 0 ? bowlRecords : undefined,
          serviceName,
        };
      });
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const updateSessionNotes = useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes: string }) => {
      const { error } = await supabase
        .from("color_sessions")
        .update({ notes })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientDetail", clientId] });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      // Get bowls for this session (incl. legacy developer columns)
      const { data: bowls } = await supabase
        .from("session_bowls")
        .select("id, developer_product_id, developer_amount, developer_unit")
        .eq("session_id", sessionId);

      if (bowls?.length) {
        const bowlIds = bowls.map(b => b.id);

        // ── RETURN STOCK BEFORE DELETING ──────────────────────────────────
        // Deleting a session means the mix "never happened"; the deduction
        // made at save time must be reversed or inventory drifts down forever.
        const { data: items } = await supabase
          .from("bowl_items")
          .select("bowl_id, product_id, amount, unit, item_type")
          .in("bowl_id", bowlIds);

        const productIds = new Set<string>((items || []).map(i => i.product_id));
        bowls.forEach(b => { if (b.developer_product_id) productIds.add(b.developer_product_id); });

        const { data: prods } = productIds.size > 0 ? await supabase
          .from("products")
          .select("id, size, size_unit")
          .in("id", [...productIds]) : { data: [] as any[] };

        const returnStock = async (productId: string, amount: number, unit: string) => {
          const prod = prods?.find(pp => pp.id === productId);
          if (!prod || !prod.size || Number(prod.size) <= 0) return;
          const inProductUnit = convertAmountBetweenUnits(amount, unit || "g", prod.size_unit || "ml");
          const containers = Math.round((inProductUnit / Number(prod.size)) * 100) / 100;
          if (containers === 0) return;
          await supabase.rpc("adjust_product_stock", { p_product_id: productId, p_delta: containers });
        };

        for (const item of (items || [])) {
          await returnStock(item.product_id, Number(item.amount) || 0, item.unit);
        }
        // Legacy developer columns — only for bowls without developer bowl_items
        const bowlsWithDevItems = new Set((items || []).filter(i => i.item_type === "developer").map(i => i.bowl_id));
        for (const b of bowls) {
          if (b.developer_product_id && b.developer_amount && !bowlsWithDevItems.has(b.id)) {
            await returnStock(b.developer_product_id, Number(b.developer_amount) || 0, b.developer_unit || "g");
          }
        }
        // ──────────────────────────────────────────────────────────────────

        // Delete bowl items first
        await supabase.from("bowl_items").delete().in("bowl_id", bowlIds);
        // Delete bowls
        await supabase.from("session_bowls").delete().eq("session_id", sessionId);
      }

      // Delete the session
      const { error } = await supabase
        .from("color_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientDetail", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // stock changed
      // Deleted sessions change every report
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["report-bowl-data"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-bowls"] });
    },
  });

  const reweighSession = useMutation({
    mutationFn: async ({ sessionId, leftoverAmount, leftoverUnit }: { sessionId: string; leftoverAmount: number; leftoverUnit: string }) => {
      const { data: bowls, error: bowlsError } = await supabase
        .from("session_bowls")
        .select("id, amount_mixed")
        .eq("session_id", sessionId);
      if (bowlsError) throw bowlsError;
      if (!bowls?.length) throw new Error("No bowls found for session");

      const leftoverGrams = convertToGrams(leftoverAmount, leftoverUnit);
      const totalMixed = bowls.reduce((sum, b) => sum + (Number(b.amount_mixed) || 0), 0);
      const totalUsed = Math.max(0, totalMixed - leftoverGrams);

      for (const bowl of bowls) {
        const bowlMixed = Number(bowl.amount_mixed) || 0;
        const ratio = totalMixed > 0 ? bowlMixed / totalMixed : 0;
        const bowlUsed = Math.round(totalUsed * ratio * 100) / 100;
        const { error } = await supabase
          .from("session_bowls")
          .update({ amount_used: bowlUsed })
          .eq("id", bowl.id);
        if (error) throw error;
      }

      const { error: sessionError } = await supabase
        .from("color_sessions")
        .update({ total_amount_used: totalUsed })
        .eq("id", sessionId);
      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientDetail", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["report-bowl-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-sessions-previous"] });
    },
  });

  const reweighBowl = useMutation({
    mutationFn: async ({ sessionId, bowlId, leftoverAmount, leftoverUnit }: { sessionId: string; bowlId: string; leftoverAmount: number; leftoverUnit: string }) => {
      // Fetch the target bowl's amount_mixed
      const { data: bowl, error: bowlError } = await supabase
        .from("session_bowls")
        .select("amount_mixed")
        .eq("id", bowlId)
        .single();
      if (bowlError) throw bowlError;

      const leftoverGrams = convertToGrams(leftoverAmount, leftoverUnit);
      const bowlMixed = Number(bowl.amount_mixed) || 0;
      const bowlUsed = Math.max(0, bowlMixed - leftoverGrams);

      // Update this specific bowl
      const { error: updateError } = await supabase
        .from("session_bowls")
        .update({ amount_used: Math.round(bowlUsed * 100) / 100 })
        .eq("id", bowlId);
      if (updateError) throw updateError;

      // Recalculate session total from all bowls
      const { data: allBowls, error: allBowlsError } = await supabase
        .from("session_bowls")
        .select("amount_used")
        .eq("session_id", sessionId);
      if (allBowlsError) throw allBowlsError;

      const totalUsed = allBowls.reduce((sum, b) => sum + (Number(b.amount_used) || 0), 0);
      const { error: sessionError } = await supabase
        .from("color_sessions")
        .update({ total_amount_used: Math.round(totalUsed * 100) / 100 })
        .eq("id", sessionId);
      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientDetail", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["report-bowl-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-sessions-previous"] });
    },
  });

  return {
    ...query,
    updateSessionNotes,
    deleteSession,
    reweighSession,
    reweighBowl,
  };
}

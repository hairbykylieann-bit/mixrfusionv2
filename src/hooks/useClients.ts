import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useEffectiveStaff } from "./useEffectiveStaff";
import { useTenant } from "@/contexts/TenantContext";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export interface FormulaComponent {
  productId: string;
  productName: string;
  amount: number;
  line?: string;
  unit?: string;
}

export interface BowlRecord {
  bowlId: string;
  name: string;
  components: FormulaComponent[];
  developer?: { productId: string; name: string; amount: number; unit?: string };
  amountMixed?: number;
  amountUsed?: number;
}

export interface FormulaRecord {
  id: string;
  date: string;
  sessionDate?: string;
  createdAt?: string;
  stylist: string;
  stylistId?: string;
  formula: string;
  notes?: string;
  amountUsed?: number;
  amountMixed?: number;
  unit?: 'g' | 'oz';
  components?: FormulaComponent[];
  developer?: {
    productId: string;
    name: string;
    amount: number;
    unit?: string;
  };
  serviceId?: string;
  bowls?: BowlRecord[];
  serviceName?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  clientSince?: string;
  lastVisit: string;
  totalVisits: number;
  lastFormula: string;
  formulaHistory: FormulaRecord[];
  preferences?: string;
  workedWithCurrentStaff?: boolean;
  lastVisitAt?: string;
}

export function useClients() {
  const queryClient = useQueryClient();
  const { effectiveStaff } = useEffectiveStaff();
  const { tenantId } = useTenant();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients", effectiveStaff?.id],
    queryFn: async (): Promise<Client[]> => {
      // Get all clients - basic info only (formula history loaded on-demand)
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (clientsError) throw clientsError;

      // Get session counts and last visit dates efficiently
      const { data: sessionStats, error: statsError } = await supabase
        .from("color_sessions")
        .select("client_id, session_date, stylist_id");

      if (statsError) throw statsError;

      // Determine which clients the current staff has worked with
      const clientsWorkedWith = new Set<string>();
      const sessionCountByClient = new Map<string, number>();
      const lastVisitByClient = new Map<string, string>();

      if (effectiveStaff?.id) {
        sessionStats?.forEach(session => {
          // Track session counts
          const count = sessionCountByClient.get(session.client_id) || 0;
          sessionCountByClient.set(session.client_id, count + 1);

          // Track last visit
          const existing = lastVisitByClient.get(session.client_id);
          if (!existing || new Date(session.session_date) > new Date(existing)) {
            lastVisitByClient.set(session.client_id, session.session_date);
          }

          // Track if current staff worked with client
          if (session.stylist_id === effectiveStaff.id) {
            clientsWorkedWith.add(session.client_id);
          }
        });

        // Also check relationships table
        const { data: relationships } = await supabase
          .from("client_staff_relationships")
          .select("client_id")
          .eq("staff_id", effectiveStaff.id);

        relationships?.forEach(rel => {
          clientsWorkedWith.add(rel.client_id);
        });
      } else {
        // Still need session stats even without current staff
        sessionStats?.forEach(session => {
          const count = sessionCountByClient.get(session.client_id) || 0;
          sessionCountByClient.set(session.client_id, count + 1);

          const existing = lastVisitByClient.get(session.client_id);
          if (!existing || new Date(session.session_date) > new Date(existing)) {
            lastVisitByClient.set(session.client_id, session.session_date);
          }
        });
      }

      // Build client objects (without formula history - loaded on-demand)
      const allClients = (clientsData || []).map((client) => {
        const totalVisits = sessionCountByClient.get(client.id) || 0;
        const lastVisitDate = lastVisitByClient.get(client.id);
        const workedWithCurrentStaff = clientsWorkedWith.has(client.id);
        
        return {
          id: client.id,
          name: client.name,
          email: client.email || undefined,
          phone: client.phone || undefined,
          clientSince: client.client_since 
            ? new Date(client.client_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : undefined,
          lastVisit: lastVisitDate 
            ? new Date(lastVisitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No visits yet',
          totalVisits,
          lastFormula: 'View history', // Placeholder - loaded on-demand
          formulaHistory: [], // Empty - loaded on-demand via useClientDetail
          preferences: client.preferences || undefined,
          workedWithCurrentStaff,
          lastVisitAt: lastVisitDate || undefined,
        };
      });

      // Filter clients based on permissions
      if (effectiveStaff && !effectiveStaff.permissions.can_view_all_clients) {
        return allClients.filter(client => client.workedWithCurrentStaff);
      }

      return allClients;
    },
    enabled: effectiveStaff !== undefined,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  const createClient = useMutation({
    mutationFn: async (newClient: ClientInsert) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...newClient, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ClientUpdate }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const createManyClients = useMutation({
    mutationFn: async (clients: ClientInsert[]) => {
      const clientsWithTenant = clients.map(c => ({ ...c, tenant_id: tenantId }));
      const { data, error } = await supabase
        .from("clients")
        .insert(clientsWithTenant)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return {
    clients: clients || [],
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    createManyClients,
    currentStaff: effectiveStaff,
  };
}

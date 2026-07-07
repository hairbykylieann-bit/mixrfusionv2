import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

export interface CurrentStaffPermissions {
  can_create_bowls: boolean;
  can_view_basic_client_info: boolean;
  can_view_all_clients: boolean;
  can_manage_clients: boolean;
  can_manage_own_clients: boolean;
  can_manage_products: boolean;
  can_view_product_costs: boolean;
  can_view_reports: boolean;
  can_view_own_reports: boolean;
  can_delete_sessions: boolean;
  can_manage_staff: boolean;
  can_manage_settings: boolean;
  can_edit_formulas: boolean;
}

export interface CurrentStaffMarkup {
  has_custom_markup: boolean;
  custom_markup_percent: number;
}

export interface CurrentStaffBowlFee {
  has_custom_bowl_fee: boolean;
  custom_bowl_fee: number;
}

export interface CurrentStaff {
  id: string;
  name: string;
  role: string;
  permissions: CurrentStaffPermissions;
  markup: CurrentStaffMarkup;
  bowlFee: CurrentStaffBowlFee;
}

// Helper to determine if a role should see costs based on salon settings
const shouldSeeCosts = (
  role: string,
  individualPermission: boolean,
  salonSetting: boolean
): boolean => {
  if (role === 'owner' || role === 'admin' || role === 'manager') {
    return true;
  }
  if (role === 'stylist' || role === 'assistant') {
    return salonSetting || individualPermission;
  }
  return individualPermission;
};

export function useCurrentStaff() {
  const { user } = useAuth();

  const { data: currentStaff, isLoading, error } = useQuery({
    queryKey: ["currentStaff", user?.id],
    queryFn: async (): Promise<CurrentStaff | null> => {
      if (!user?.id) return null;

      const { data: salonSettings } = await supabase
        .from("salon_settings")
        .select("stylists_see_product_costs, stylists_see_all_clients")
        .limit(1)
        .maybeSingle();

      const stylistsSeeProductCosts = salonSettings?.stylists_see_product_costs ?? false;
      const stylistsSeeAllClients = salonSettings?.stylists_see_all_clients ?? false;

      const { data: selfRows, error: userError } = await supabase
        .rpc("get_current_staff_self");
      const staffByUser = (selfRows && selfRows.length > 0 && selfRows[0].is_active)
        ? selfRows[0]
        : null;

      if (staffByUser) {
        const canViewCosts = shouldSeeCosts(
          staffByUser.role,
          staffByUser.can_view_product_costs,
          stylistsSeeProductCosts
        );

        let canViewAllClients = staffByUser.can_view_all_clients;
        if (staffByUser.role === 'stylist' || staffByUser.role === 'assistant') {
          canViewAllClients = stylistsSeeAllClients || staffByUser.can_view_all_clients;
        }

        return {
          id: staffByUser.id,
          name: staffByUser.name,
          role: staffByUser.role,
          permissions: {
            can_create_bowls: staffByUser.can_create_bowls,
            can_view_basic_client_info: staffByUser.can_view_basic_client_info,
            can_view_all_clients: canViewAllClients,
            can_manage_clients: staffByUser.can_manage_clients,
            can_manage_own_clients: staffByUser.can_manage_own_clients,
            can_manage_products: staffByUser.can_manage_products,
            can_view_product_costs: canViewCosts,
            can_view_reports: staffByUser.can_view_reports,
            can_view_own_reports: (staffByUser as any).can_view_own_reports ?? true,
            can_delete_sessions: (staffByUser as any).can_delete_sessions ?? ['owner','admin','manager'].includes(staffByUser.role),
            can_manage_staff: staffByUser.can_manage_staff,
            can_manage_settings: staffByUser.can_manage_settings,
            can_edit_formulas: staffByUser.can_edit_formulas,
          },
          markup: {
            has_custom_markup: false,
            custom_markup_percent: 0,
          },
          bowlFee: {
            has_custom_bowl_fee: false,
            custom_bowl_fee: 0,
          },
        };
      }

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (userRole?.role === "owner" || userRole?.role === "admin") {
        return {
          id: user.id,
          name: user.email || "Admin",
          role: userRole.role,
          permissions: {
            can_create_bowls: true,
            can_view_basic_client_info: true,
            can_view_all_clients: true,
            can_manage_clients: true,
            can_manage_own_clients: true,
            can_manage_products: true,
            can_view_product_costs: true,
            can_view_reports: true,
            can_view_own_reports: true,
            can_delete_sessions: true,
            can_manage_staff: true,
            can_manage_settings: true,
            can_edit_formulas: true,
          },
          markup: {
            has_custom_markup: false,
            custom_markup_percent: 0,
          },
          bowlFee: {
            has_custom_bowl_fee: false,
            custom_bowl_fee: 0,
          },
        };
      }

      return {
        id: user.id,
        name: user.email || "User",
        role: "stylist",
        permissions: {
          can_create_bowls: true,
          can_view_basic_client_info: true,
          can_view_all_clients: stylistsSeeAllClients,
          can_manage_clients: false,
          can_manage_own_clients: false,
          can_manage_products: false,
          can_view_product_costs: stylistsSeeProductCosts,
          can_view_reports: false,
          can_manage_staff: false,
          can_manage_settings: false,
          can_edit_formulas: false,
        },
        markup: {
          has_custom_markup: false,
          custom_markup_percent: 0,
        },
        bowlFee: {
          has_custom_bowl_fee: false,
          custom_bowl_fee: 0,
        },
      };
    },
    enabled: !!user?.id,
  });

  const canManageClient = (clientWorkedWith: boolean): boolean => {
    if (!currentStaff) return false;
    if (currentStaff.permissions.can_manage_clients) return true;
    if (currentStaff.permissions.can_manage_own_clients && clientWorkedWith) return true;
    return false;
  };

  return {
    currentStaff,
    isLoading,
    error,
    canManageClient,
  };
}

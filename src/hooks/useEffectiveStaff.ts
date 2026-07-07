import { useKioskSafe } from "@/contexts/KioskContext";
import { useCurrentStaff, CurrentStaff, CurrentStaffPermissions } from "./useCurrentStaff";

export interface EffectiveStaffMarkup {
  has_custom_markup: boolean;
  custom_markup_percent: number;
}

export interface EffectiveStaffBowlFee {
  has_custom_bowl_fee: boolean;
  custom_bowl_fee: number;
}

export interface EffectiveStaff {
  id: string;
  name: string;
  role: string;
  permissions: CurrentStaffPermissions;
  markup: EffectiveStaffMarkup;
  bowlFee: EffectiveStaffBowlFee;
}

export function useEffectiveStaff() {
  const kioskContext = useKioskSafe();
  const { currentStaff, isLoading, error, canManageClient } = useCurrentStaff();

  if (kioskContext?.isKioskMode && kioskContext.activeStaff) {
    const kioskStaff = kioskContext.activeStaff;

    const effectiveStaff: EffectiveStaff = {
      id: kioskStaff.id,
      name: kioskStaff.name,
      role: kioskStaff.role,
      permissions: {
        can_create_bowls: kioskStaff.can_create_bowls,
        can_view_basic_client_info: kioskStaff.can_view_basic_client_info,
        can_view_all_clients: kioskStaff.can_view_all_clients,
        can_manage_clients: kioskStaff.can_manage_clients,
        can_manage_own_clients: kioskStaff.can_manage_own_clients,
        can_manage_products: kioskStaff.can_manage_products,
        can_view_product_costs: kioskStaff.can_view_product_costs,
        can_view_reports: kioskStaff.can_view_reports,
        can_view_own_reports: (kioskStaff as any).can_view_own_reports ?? true,
        can_delete_sessions: (kioskStaff as any).can_delete_sessions ?? false,
        can_manage_staff: kioskStaff.can_manage_staff,
        can_manage_settings: kioskStaff.can_manage_settings,
        can_edit_formulas: kioskStaff.can_edit_formulas ?? false,
      },
      markup: {
        has_custom_markup: kioskStaff.has_custom_markup,
        custom_markup_percent: kioskStaff.custom_markup_percent,
      },
      bowlFee: {
        has_custom_bowl_fee: kioskStaff.has_custom_bowl_fee ?? false,
        custom_bowl_fee: Number(kioskStaff.custom_bowl_fee) || 0,
      },
    };

    const kioskCanManageClient = (clientWorkedWith: boolean): boolean => {
      if (effectiveStaff.permissions.can_manage_clients) return true;
      if (effectiveStaff.permissions.can_manage_own_clients && clientWorkedWith) return true;
      return false;
    };

    return {
      effectiveStaff,
      isLoading: false,
      error: null,
      isKioskMode: true,
      canManageClient: kioskCanManageClient,
    };
  }

  return {
    effectiveStaff: currentStaff ? {
      id: currentStaff.id,
      name: currentStaff.name,
      role: currentStaff.role,
      permissions: currentStaff.permissions,
      markup: {
        has_custom_markup: currentStaff.markup.has_custom_markup,
        custom_markup_percent: currentStaff.markup.custom_markup_percent,
      },
      bowlFee: {
        has_custom_bowl_fee: currentStaff.bowlFee?.has_custom_bowl_fee ?? false,
        custom_bowl_fee: currentStaff.bowlFee?.custom_bowl_fee ?? 0,
      },
    } : null,
    isLoading,
    error,
    isKioskMode: false,
    canManageClient,
  };
}

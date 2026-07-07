import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useTenantData } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KIOSK_MODE_KEY = 'mixr_kiosk_mode_enabled';

interface KioskStaff {
  id: string;
  name: string;
  role: string;
  can_create_bowls: boolean;
  can_view_basic_client_info: boolean;
  can_view_all_clients: boolean;
  can_manage_clients: boolean;
  can_manage_own_clients: boolean;
  can_manage_products: boolean;
  can_view_product_costs: boolean;
  can_view_reports: boolean;
  can_manage_staff: boolean;
  can_manage_settings: boolean;
  has_custom_markup: boolean;
  custom_markup_percent: number;
  has_custom_bowl_fee: boolean;
  custom_bowl_fee: number;
  can_edit_formulas: boolean;
}

interface KioskContextValue {
  isKioskMode: boolean;
  enableKioskMode: (enabled: boolean) => void;
  isLocked: boolean;
  activeStaff: KioskStaff | null;
  lastActivityTime: Date;
  lock: () => void;
  logout: () => void;
  unlock: (staff: KioskStaff) => void;
  verifyPin: (pin: string, staffId?: string) => Promise<KioskStaff | null>;
  resetActivity: () => void;
  availableStaff: { id: string; name: string; initials: string; has_pin: boolean }[];
  isLoadingStaff: boolean;
}

const KioskContext = createContext<KioskContextValue | undefined>(undefined);

export function KioskProvider({ children }: { children: ReactNode }) {
  const { settings } = useSalonSettings();
  const { tenant } = useTenantData();
  
  // Device-specific kiosk mode from localStorage
  const [isKioskMode, setIsKioskMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(KIOSK_MODE_KEY) === 'true';
  });
  
  const [isLocked, setIsLocked] = useState(true);
  const [activeStaff, setActiveStaff] = useState<KioskStaff | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState(new Date());
  const [availableStaff, setAvailableStaff] = useState<{ id: string; name: string; initials: string }[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // PIN timeout still comes from database (salon-wide setting)
  const pinTimeoutMinutes = settings?.pin_timeout_minutes ?? 15;
  
  // Enable/disable kiosk mode on THIS device only
  const enableKioskMode = useCallback((enabled: boolean) => {
    localStorage.setItem(KIOSK_MODE_KEY, enabled.toString());
    setIsKioskMode(enabled);
    if (enabled) {
      setIsLocked(true); // Start locked when enabling
    }
  }, []);

  // Fetch available staff with PINs
  useEffect(() => {
    if (!isKioskMode || !tenant?.id) return;

    const fetchStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const { data, error } = await supabase
          .rpc("list_tenant_staff_directory");

        if (error) throw error;

        const filtered = (data || []).filter(
          (s: any) => s.is_active && s.tenant_id === tenant.id
        );

        const staffWithInitials = filtered.map((s: any) => ({
          id: s.id,
          name: s.name,
          has_pin: s.has_pin ?? true, // pre-migration directories don't report it
          initials: s.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase(),
        }));

        setAvailableStaff(staffWithInitials);
      } catch (error) {
        console.error("Failed to fetch kiosk staff:", error);
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaff();
  }, [isKioskMode, tenant?.id]);

  // Auto-logout after timeout (simplified from auto-lock)
  useEffect(() => {
    if (!isKioskMode || isLocked || !activeStaff) return;

    const checkTimeout = () => {
      const now = new Date();
      const diff = (now.getTime() - lastActivityTime.getTime()) / 1000 / 60;
      if (diff >= pinTimeoutMinutes) {
        logout();
        toast.info("Session ended due to inactivity");
      }
    };

    const interval = setInterval(checkTimeout, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isKioskMode, isLocked, activeStaff, lastActivityTime, pinTimeoutMinutes]);

  // Activity tracking
  useEffect(() => {
    if (!isKioskMode || isLocked) return;

    const handleActivity = () => {
      setLastActivityTime(new Date());
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [isKioskMode, isLocked]);

  const lock = useCallback(() => {
    setIsLocked(true);
    // Keep activeStaff so they can quickly re-enter PIN
  }, []);

  const logout = useCallback(() => {
    setIsLocked(true);
    setActiveStaff(null);
  }, []);

  const unlock = useCallback((staff: KioskStaff) => {
    setActiveStaff(staff);
    setIsLocked(false);
    setLastActivityTime(new Date());
  }, []);

  const verifyPin = useCallback(async (pin: string, staffId?: string): Promise<KioskStaff | null> => {
    if (!tenant?.id) {
      toast.error("No salon context available");
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-pin", {
        body: { pin, tenant_id: tenant.id, staff_id: staffId ?? null },
      });

      if (error) {
        toast.error("Failed to verify PIN");
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      if (data?.success && data?.staff) {
        const staff: KioskStaff = {
          id: data.staff.id,
          name: data.staff.name,
          role: data.staff.role,
          can_create_bowls: data.staff.can_create_bowls,
          can_view_basic_client_info: data.staff.can_view_basic_client_info,
          can_view_all_clients: data.staff.can_view_all_clients,
          can_manage_clients: data.staff.can_manage_clients,
          can_manage_own_clients: data.staff.can_manage_own_clients ?? false,
          can_manage_products: data.staff.can_manage_products,
          can_view_product_costs: data.staff.can_view_product_costs ?? false,
          can_view_reports: data.staff.can_view_reports,
          can_manage_staff: data.staff.can_manage_staff,
          can_manage_settings: data.staff.can_manage_settings,
          has_custom_markup: data.staff.has_custom_markup ?? false,
          custom_markup_percent: data.staff.custom_markup_percent ?? 0,
          has_custom_bowl_fee: data.staff.has_custom_bowl_fee ?? false,
          custom_bowl_fee: data.staff.custom_bowl_fee ?? 0,
          can_edit_formulas: data.staff.can_edit_formulas ?? false,
        };
        unlock(staff);
        return staff;
      }

      return null;
    } catch (error) {
      console.error("PIN verification error:", error);
      toast.error("Failed to verify PIN");
      return null;
    }
  }, [tenant?.id, unlock]);

  const resetActivity = useCallback(() => {
    setLastActivityTime(new Date());
  }, []);

  return (
    <KioskContext.Provider
      value={{
        isKioskMode,
        enableKioskMode,
        isLocked,
        activeStaff,
        lastActivityTime,
        lock,
        logout,
        unlock,
        verifyPin,
        resetActivity,
        availableStaff,
        isLoadingStaff,
      }}
    >
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const context = useContext(KioskContext);
  if (context === undefined) {
    throw new Error("useKiosk must be used within a KioskProvider");
  }
  return context;
}

// Safe version that returns null if outside provider (for components that might render before provider)
export function useKioskSafe() {
  const context = useContext(KioskContext);
  return context ?? null;
}

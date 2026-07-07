import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SalonSettings {
  id: string;
  markup_percent: number;
  bowl_fee: number;
  waste_factor_percent: number;
  rounding_amount: number;
  require_client_email: boolean;
  require_client_phone: boolean;
  salon_name: string | null;
  salon_logo_url: string | null;
  setup_completed_at: string | null;
  kiosk_mode_enabled: boolean;
  pin_timeout_minutes: number;
  stylists_see_all_clients: boolean;
  stylists_see_product_costs: boolean;
  notify_low_stock: boolean;
  notify_weekly_reports: boolean;
  notify_waste_warnings: boolean;
  backbar_multiplier: number;
  retail_markup_percent: number;
  preferred_display_unit: string;
}

export function useSalonSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['salon-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SalonSettings | null;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<SalonSettings, 'id'>>) => {
      const settings = settingsQuery.data;
      if (!settings) throw new Error('No settings found');

      const { data, error } = await supabase
        .from('salon_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-settings'] });
      // Reports cache settings under their own key (markup, bowl fee, waste factor)
      queryClient.invalidateQueries({ queryKey: ['salon-settings-reports'] });
      queryClient.invalidateQueries({ queryKey: ['staff-report-settings'] });
      // Salon-wide visibility toggles (stylists see costs/clients) live here too
      queryClient.invalidateQueries({ queryKey: ['currentStaff'] });
      toast.success('Settings updated');
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings. You may not have permission.');
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}

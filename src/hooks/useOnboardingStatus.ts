import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOnboardingStatus() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      if (!user) return { needsOnboarding: false };

      const { data, error } = await supabase.rpc("check_onboarding_needed");

      if (error) {
        console.error("Error checking onboarding status:", error);
        return { needsOnboarding: false };
      }

      return { needsOnboarding: !!data };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  return {
    needsOnboarding: data?.needsOnboarding ?? false,
    isLoading,
  };
}

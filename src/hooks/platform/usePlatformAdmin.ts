import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePlatformAdmin() {
  const { user } = useAuth();

  const { data: isPlatformAdmin, isLoading } = useQuery({
    queryKey: ["platform-admin-check", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking platform admin status:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
  });

  return {
    isPlatformAdmin: isPlatformAdmin || false,
    isLoading,
    user,
  };
}

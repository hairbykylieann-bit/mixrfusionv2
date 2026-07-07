import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteResponse {
  success: boolean;
  invite_url: string;
  short_code: string;
  expires_at: string;
  email_sent: boolean;
  is_resend: boolean;
}

interface InviteInfo {
  valid: boolean;
  staff_name?: string;
  email?: string;
  salon_name?: string;
  expires_at?: string;
  error?: string;
  error_code?: string;
}

interface AcceptResponse {
  success: boolean;
  salon_name?: string;
  message?: string;
  error?: string;
  expected_email?: string;
}

export function useStaffInvitation() {
  const queryClient = useQueryClient();

  // Create or get existing invitation
  const createInvite = useMutation({
    mutationFn: async ({ staffId, sendEmail = false }: { staffId: string; sendEmail?: boolean }): Promise<InviteResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-staff-invite", {
        body: { staff_id: staffId, send_email: sendEmail },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create invitation");
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to create invitation");
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
      
      if (data.email_sent) {
        toast.success("Invitation email sent!");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Get invitation info (for join page)
  const getInviteInfo = async (shortCode: string): Promise<InviteInfo> => {
    const response = await supabase.functions.invoke("get-invite-info", {
      body: { short_code: shortCode },
    });

    if (response.error) {
      return { valid: false, error: "Failed to fetch invitation details" };
    }

    return response.data;
  };

  // Accept invitation
  const acceptInvite = useMutation({
    mutationFn: async (shortCode: string): Promise<AcceptResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("accept-staff-invite", {
        body: { short_code: shortCode },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to accept invitation");
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to accept invitation");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["current-staff"] });
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
    },
  });

  // Check if Resend is configured (for showing email option)
  const useResendAvailable = () => {
    return useQuery({
      queryKey: ["resend-available"],
      queryFn: async () => {
        // This is a simple check - the edge function will handle the actual check
        // For now, we'll assume it's available since we configured the secret
        return true;
      },
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
    });
  };

  // Get pending invitation for a staff member
  const usePendingInvitation = (staffId: string | undefined) => {
    return useQuery({
      queryKey: ["staff-invitation", staffId],
      queryFn: async () => {
        if (!staffId) return null;

        const { data, error } = await supabase
          .from("staff_invitations")
          .select("id, short_code, expires_at, email_sent, status, created_at")
          .eq("staff_id", staffId)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching invitation:", error);
          return null;
        }

        return data;
      },
      enabled: !!staffId,
    });
  };

  // Revoke invitation
  const revokeInvite = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("staff_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
      toast.success("Invitation revoked");
    },
    onError: () => {
      toast.error("Failed to revoke invitation");
    },
  });

  return {
    createInvite,
    getInviteInfo,
    acceptInvite,
    useResendAvailable,
    usePendingInvitation,
    revokeInvite,
  };
}

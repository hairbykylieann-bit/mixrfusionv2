import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { short_code } = await req.json();

    if (!short_code) {
      return new Response(
        JSON.stringify({ valid: false, error: "short_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("staff_invitations")
      .select(`
        id,
        email,
        status,
        expires_at,
        staff_id,
        tenant_id
      `)
      .eq("short_code", short_code)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid invitation link",
          error_code: "INVALID_TOKEN"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "This invitation has expired. Please ask your manager for a new link.",
          error_code: "EXPIRED"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted
    if (invitation.status === "accepted") {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "This invitation has already been used.",
          error_code: "ALREADY_ACCEPTED"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if revoked
    if (invitation.status === "revoked") {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "This invitation has been revoked. Please contact your manager.",
          error_code: "REVOKED"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get staff name
    const { data: staff } = await supabase
      .from("staff")
      .select("name")
      .eq("id", invitation.staff_id)
      .single();

    // Get salon name
    const { data: salonSettings } = await supabase
      .from("salon_settings")
      .select("salon_name")
      .eq("tenant_id", invitation.tenant_id)
      .single();

    return new Response(
      JSON.stringify({
        valid: true,
        staff_name: staff?.name || "Team Member",
        email: invitation.email,
        salon_name: salonSettings?.salon_name || "Your Salon",
        expires_at: invitation.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

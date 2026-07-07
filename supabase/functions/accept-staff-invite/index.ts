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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { short_code } = await req.json();

    if (!short_code) {
      return new Response(
        JSON.stringify({ success: false, error: "short_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("short_code", short_code)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid invitation link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate invitation status
    if (invitation.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: invitation.status === "accepted" 
            ? "This invitation has already been used" 
            : "This invitation is no longer valid" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("staff_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: false, error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email match (case-insensitive)
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Please sign in with ${invitation.email} to accept this invitation`,
          expected_email: invitation.email
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the staff record to check it's still valid
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, role, user_id, tenant_id")
      .eq("id", invitation.staff_id)
      .single();

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ success: false, error: "Staff record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (staff.user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "This staff profile is already linked to an account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link staff to user
    const { error: updateStaffError } = await supabase
      .from("staff")
      .update({ 
        user_id: user.id,
        invitation_status: "accepted"
      })
      .eq("id", staff.id);

    if (updateStaffError) {
      console.error("Update staff error:", updateStaffError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to link account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation status
    await supabase
      .from("staff_invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    // Add user to tenant_users if not already
    const { data: existingTenantUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", staff.tenant_id)
      .single();

    if (!existingTenantUser) {
      await supabase
        .from("tenant_users")
        .insert({
          user_id: user.id,
          tenant_id: staff.tenant_id,
          role: staff.role
        });
    }

    // Ensure user has the appropriate role in user_roles
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingRole) {
      await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: staff.role
        });
    }

    // Get salon info for response
    const { data: salonSettings } = await supabase
      .from("salon_settings")
      .select("salon_name")
      .eq("tenant_id", staff.tenant_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        salon_name: salonSettings?.salon_name || "Your Salon",
        message: "Your account has been linked successfully!"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

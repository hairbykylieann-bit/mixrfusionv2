import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header and verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user client to get user info
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing onboarding for user:", user.id);

    // Parse request body
    const { salonName, logoUrl, ownerName, phone, pin } = await req.json();

    // Validate required fields
    if (!salonName || !ownerName || !phone || !pin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: salonName, ownerName, phone, and pin are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be exactly 4 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Check if an owner already exists
    const { data: existingOwner, error: ownerCheckError } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("role", "owner")
      .limit(1);

    if (ownerCheckError) {
      console.error("Error checking existing owner:", ownerCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to verify owner status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingOwner && existingOwner.length > 0) {
      console.warn("Attempted to create owner when one already exists");
      return new Response(
        JSON.stringify({ error: "An owner has already been configured for this salon" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the PIN (use sync versions - async uses Workers which aren't available in Edge Functions)
    const salt = bcrypt.genSaltSync(10);
    const pinHash = bcrypt.hashSync(pin, salt);

    console.log("Creating owner staff record...");

    // Create the owner staff record with all permissions
    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        user_id: user.id,
        name: ownerName,
        email: user.email,
        phone: phone,
        role: "owner",
        pin_hash: pinHash,
        is_active: true,
        can_create_bowls: true,
        can_manage_clients: true,
        can_manage_products: true,
        can_manage_settings: true,
        can_manage_staff: true,
        can_view_all_clients: true,
        can_view_basic_client_info: true,
        can_view_reports: true,
      })
      .select()
      .single();

    if (staffError) {
      console.error("Error creating staff record:", staffError);
      return new Response(
        JSON.stringify({ error: "Failed to create owner record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Staff record created:", staffRecord.id);

    // Update user_roles: change from stylist to owner
    const { error: roleUpdateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "owner" })
      .eq("user_id", user.id);

    if (roleUpdateError) {
      console.error("Error updating user role:", roleUpdateError);
      // Don't fail the whole operation, the staff record is more important
    }

    // Update salon_settings
    const { data: existingSettings } = await supabaseAdmin
      .from("salon_settings")
      .select("id")
      .limit(1);

    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      const { error: settingsError } = await supabaseAdmin
        .from("salon_settings")
        .update({
          salon_name: salonName,
          salon_logo_url: logoUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSettings[0].id);

      if (settingsError) {
        console.error("Error updating salon settings:", settingsError);
      }
    } else {
      // Create new settings
      const { error: settingsError } = await supabaseAdmin
        .from("salon_settings")
        .insert({
          salon_name: salonName,
          salon_logo_url: logoUrl || null,
        });

      if (settingsError) {
        console.error("Error creating salon settings:", settingsError);
      }
    }

    // Update the user's profile with their name and phone
    const nameParts = ownerName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || null;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    console.log("Onboarding completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Onboarding completed successfully",
        staffId: staffRecord.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

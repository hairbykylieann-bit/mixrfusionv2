import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body to determine which type of user to create
    let userType = "tenant"; // default
    try {
      const body = await req.json();
      if (body.type === "admin") {
        userType = "admin";
      }
    } catch {
      // No body or invalid JSON, use default
    }

    if (userType === "admin") {
      // Create platform admin user
      const adminEmail = "admin@mixr.app";
      const adminPassword = "admin1234";

      // Check if admin user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

      if (existingAdmin) {
        // Make sure they're in platform_admins table
        await supabase
          .from("platform_admins")
          .upsert({ user_id: existingAdmin.id }, { onConflict: "user_id" });

        return new Response(
          JSON.stringify({ message: "Admin user already exists", email: adminEmail }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create admin user
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (createError) {
        throw createError;
      }

      // Add to platform_admins table
      const { error: adminError } = await supabase
        .from("platform_admins")
        .insert({ user_id: newAdmin.user.id });

      if (adminError) {
        throw adminError;
      }

      console.log("Platform admin created:", adminEmail);

      return new Response(
        JSON.stringify({ 
          message: "Platform admin created successfully",
          email: adminEmail,
          password: adminPassword
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Create demo tenant user
    const demoEmail = "demo@mixr.app";
    const demoPassword = "demo1234";

    // Check if demo user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingDemo = existingUsers?.users?.find(u => u.email === demoEmail);

    if (existingDemo) {
      return new Response(
        JSON.stringify({ message: "Demo user already exists", email: demoEmail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create demo user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
    });

    if (createError) {
      throw createError;
    }

    // Create a demo tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: "Demo Salon",
        status: "active",
        primary_contact_email: demoEmail,
        owner_user_id: newUser.user.id,
      })
      .select()
      .single();

    if (tenantError) {
      throw tenantError;
    }

    // Link user to tenant
    const { error: tuError } = await supabase
      .from("tenant_users")
      .insert({
        tenant_id: tenant.id,
        user_id: newUser.user.id,
        role: "owner",
      });

    if (tuError) {
      throw tuError;
    }

    // Create owner staff record
    const { error: staffError } = await supabase
      .from("staff")
      .insert({
        tenant_id: tenant.id,
        user_id: newUser.user.id,
        name: "Demo Owner",
        email: demoEmail,
        role: "owner",
        is_active: true,
        can_create_bowls: true,
        can_view_basic_client_info: true,
        can_view_all_clients: true,
        can_manage_clients: true,
        can_manage_own_clients: true,
        can_manage_products: true,
        can_view_product_costs: true,
        can_view_reports: true,
        can_manage_staff: true,
        can_manage_settings: true,
      });

    if (staffError) {
      throw staffError;
    }

    // Create salon settings
    const { error: settingsError } = await supabase
      .from("salon_settings")
      .insert({
        tenant_id: tenant.id,
        salon_name: "Demo Salon",
      });

    if (settingsError) {
      throw settingsError;
    }

    console.log("Demo tenant user created:", demoEmail);

    return new Response(
      JSON.stringify({ 
        message: "Demo user created successfully",
        email: demoEmail,
        password: demoPassword
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ErrorLogPayload {
  error_message: string;
  error_stack?: string;
  component_stack?: string;
  url?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS for inserting
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: ErrorLogPayload = await req.json();

    // Validate required fields
    if (!payload.error_message) {
      return new Response(
        JSON.stringify({ error: "error_message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Skip logging for health check pings - return success without inserting
    const metadata = payload.metadata as Record<string, unknown> | undefined;
    if (
      payload.error_message === "health-check-ping" ||
      metadata?.type === "health_check" ||
      metadata?.skip_log === true
    ) {
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try to get user info from auth header (optional)
    let userId: string | null = null;
    let tenantId: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
      } = await userClient.auth.getUser();

      if (user) {
        userId = user.id;

        // Try to get tenant_id
        const { data: tenantUser } = await userClient
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (tenantUser) {
          tenantId = tenantUser.tenant_id;
        }
      }
    }

    // Insert error log
    const { error: insertError } = await supabase.from("error_logs").insert({
      error_message: payload.error_message,
      error_stack: payload.error_stack || null,
      component_stack: payload.component_stack || null,
      user_id: userId,
      tenant_id: tenantId,
      url: payload.url || null,
      user_agent: payload.user_agent || null,
      metadata: payload.metadata || {},
    });

    if (insertError) {
      console.error("Failed to insert error log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error in log-error function:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

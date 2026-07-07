import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan_id, return_url } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: "plan_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Billing is not configured yet (missing Stripe key)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Only the salon OWNER can start a subscription
    const { data: tenant } = await admin
      .from("tenants").select("id, name").eq("owner_user_id", user.id).maybeSingle();
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Only the salon owner can manage billing" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan } = await admin
      .from("plans").select("id, name, stripe_price_id, is_active").eq("id", plan_id).single();
    if (!plan?.is_active || !plan.stripe_price_id) {
      return new Response(JSON.stringify({ error: "This plan isn't available for online checkout yet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Reuse the Stripe customer if this salon already has one
    const { data: existingSub } = await admin
      .from("subscriptions").select("stripe_customer_id").eq("tenant_id", tenant.id).maybeSingle();
    let customerId = existingSub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: tenant.name ?? undefined,
        metadata: { tenant_id: tenant.id },
      });
      customerId = customer.id;
    }

    const origin = return_url || req.headers.get("origin") || "";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=canceled`,
      metadata: { tenant_id: tenant.id, plan_id: plan.id },
      subscription_data: { metadata: { tenant_id: tenant.id, plan_id: plan.id } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Couldn't start checkout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

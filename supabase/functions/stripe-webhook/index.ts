import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

// Stripe → app source of truth. Deploy with --no-verify-jwt (Stripe can't sign
// Supabase JWTs); authenticity comes from the webhook signature instead.

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Billing not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature!, webhookSecret, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const mapStatus = (s: string): string =>
    s === "active" || s === "trialing" ? "active"
    : s === "past_due" || s === "unpaid" || s === "incomplete" ? "past_due"
    : "canceled";

  const upsertFromSubscription = async (sub: Stripe.Subscription) => {
    const tenantId = sub.metadata?.tenant_id;
    if (!tenantId) { console.error("subscription missing tenant_id metadata", sub.id); return; }

    // Resolve plan from metadata, falling back to price lookup
    let planId = sub.metadata?.plan_id ?? null;
    const priceId = sub.items.data[0]?.price?.id;
    if (!planId && priceId) {
      const { data: plan } = await admin.from("plans").select("id").eq("stripe_price_id", priceId).maybeSingle();
      planId = plan?.id ?? null;
    }
    if (!planId) { console.error("could not resolve plan for subscription", sub.id); return; }

    await admin.from("subscriptions").upsert({
      tenant_id: tenantId,
      plan_id: planId,
      status: mapStatus(sub.status),
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });
    console.log(`subscription ${sub.id} → tenant ${tenantId}: ${mapStatus(sub.status)}`);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await admin.from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }
});

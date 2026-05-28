/**
 * stripe-subscription-webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Must be registered at: https://dashboard.stripe.com/webhooks
 * Endpoint URL: https://<project>.supabase.co/functions/v1/stripe-subscription-webhook
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY      – sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET  – whsec_… (from Stripe Dashboard → Webhooks → signing secret)
 *
 * Events to enable in the Stripe Dashboard:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  // Stripe requires the raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2025-08-27.basil",
  });

  // Verify event signature — reject anything that doesn't come from Stripe
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  // Use service-role client so we bypass RLS
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {

      // ── Checkout completed → create/activate subscription OR add seats ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // One-time seat purchase
        if (session.mode === "payment" && session.metadata?.planType === "seats") {
          const userId = session.metadata.userId;
          const seats  = parseInt(session.metadata.seats ?? "0", 10);
          if (userId && seats > 0) {
            const { error } = await supabase.rpc("teacher_add_seats", {
              p_teacher_id: userId,
              p_seats: seats,
            });
            if (error) console.error("[stripe-webhook] teacher_add_seats error:", error);
            else console.log(`[stripe-webhook] Added ${seats} seats for teacher ${userId}`);
          }
          break;
        }

        if (session.mode !== "subscription") break;

        const userId    = session.metadata?.userId;
        const planType  = session.metadata?.planType ?? "student";
        const stripeSubId  = session.subscription as string;
        const stripeCustId = session.customer as string;

        if (!userId || !stripeSubId) {
          console.error("[stripe-webhook] checkout.session.completed missing userId or subscriptionId");
          break;
        }

        // Retrieve full subscription object for trial/period dates
        const sub = await stripe.subscriptions.retrieve(stripeSubId);

        const rpc = planType === "teacher"
          ? "record_stripe_teacher_subscription"
          : "record_stripe_subscription";

        // RPC expects Unix timestamps as bigint, not ISO strings
        const trialEndUnix = sub.trial_end ?? null;
        const periodEndUnix = (sub as any).current_period_end ?? null;

        const { error } = await supabase.rpc(rpc, {
          p_user_id:        userId,
          p_customer_id:    stripeCustId,
          p_subscription_id: stripeSubId,
          p_trial_end:      trialEndUnix,
          p_period_end:     periodEndUnix,
        });

        if (error) console.error(`[stripe-webhook] ${rpc} error:`, error);
        else console.log(`[stripe-webhook] ${rpc} OK for user ${userId} (${sub.status})`);
        break;
      }

      // ── Subscription updated (trial → active, plan change, etc.) ────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status:               sub.status,
            trial_end:            sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            current_period_end:   new Date(
              (sub as any).current_period_end * 1000
            ).toISOString(),
            updated_at:           new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("[stripe-webhook] subscription.updated error:", error);
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("[stripe-webhook] subscription.deleted error:", error);
        break;
      }

      // ── Payment succeeded → ensure status is active ──────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);

        if (error) console.error("[stripe-webhook] payment_succeeded error:", error);
        break;
      }

      // ── Payment failed → mark past_due ───────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);

        if (error) console.error("[stripe-webhook] payment_failed error:", error);
        break;
      }

      default:
        // Unhandled event — return 200 so Stripe doesn't retry
        console.log("[stripe-webhook] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[stripe-webhook] Handler error:", err.message);
    // Return 500 so Stripe retries the event
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

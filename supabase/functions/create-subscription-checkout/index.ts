/**
 * create-subscription-checkout
 *
 * Creates a Stripe Checkout Session in `subscription` mode with a 7-day free trial.
 * Card details are always collected upfront. After checkout the user is redirected
 * to /dashboard?checkout=success and the stripe-subscription-webhook records the
 * subscription in our database.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   STRIPE_SECRET_KEY         – sk_live_… or sk_test_…
 *   STRIPE_STUDENT_PRICE_ID   – price_… (monthly recurring price for the student plan)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      throw new Error("userId and email are required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // Student monthly plan — $17/mo (price_1TcBF2B8UWyR18ZVVnNultKl)
    // Override via STRIPE_STUDENT_PRICE_ID secret for live-mode swap
    const priceId =
      Deno.env.get("STRIPE_STUDENT_PRICE_ID") ?? "price_1TcBF2B8UWyR18ZVVnNultKl";

    const origin = req.headers.get("origin") ?? "https://musicableapp.com";

    // Reuse existing Stripe customer if one already exists for this email
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      // Customer linkage
      ...(customerId ? { customer: customerId } : { customer_email: email }),

      mode: "subscription",

      // Always collect card details even during the free trial
      payment_method_collection: "always",

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {
        trial_period_days: 7,
        // Embed userId so the webhook can map Stripe → Supabase
        metadata: { userId, planType: "student" },
      },

      // Passed to checkout.session.completed webhook
      metadata: { userId, planType: "student" },

      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/signup`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-subscription-checkout]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

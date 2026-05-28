/**
 * create-teacher-checkout
 *
 * Creates a Stripe Checkout Session for the teacher monthly plan ($20/mo).
 * Includes a 7-day trial. On success the webhook assigns the teacher role
 * and provisions 10 default student seats.
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY         – sk_live_… or sk_test_…
 *   STRIPE_TEACHER_PRICE_ID   – price_… (monthly recurring price for the teacher plan)
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
    if (!userId || !email) throw new Error("userId and email are required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // Teacher monthly plan — $20/mo (price_1TcBGVB8UWyR18ZVXt2CZABa)
    // Override via STRIPE_TEACHER_PRICE_ID secret for live-mode swap
    const priceId =
      Deno.env.get("STRIPE_TEACHER_PRICE_ID") ?? "price_1TcBGVB8UWyR18ZVXt2CZABa";

    const origin = req.headers.get("origin") ?? "https://musicableapp.com";

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId, planType: "teacher" },
      },
      metadata: { userId, planType: "teacher" },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/teacher-signup`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-teacher-checkout]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

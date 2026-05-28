/**
 * create-seat-checkout
 * Creates a one-time Stripe Checkout Session for extra teacher seat purchases ($1/seat).
 * On payment success, the stripe-subscription-webhook handles seat provisioning via
 * the teacher_add_seats RPC. The session metadata carries userId and seats count.
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY       – sk_live_… or sk_test_…
 *   STRIPE_SEAT_PRICE_ID    – price_… (one-time $1 price for a single seat)
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
    const { userId, email, seats } = await req.json();
    if (!userId || !email || !seats || seats < 1) {
      throw new Error("userId, email, and seats (≥1) are required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const priceId = Deno.env.get("STRIPE_SEAT_PRICE_ID");
    if (!priceId) throw new Error("STRIPE_SEAT_PRICE_ID is not configured");

    const origin = req.headers.get("origin") ?? "https://musicableapp.com";

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      mode: "payment",
      line_items: [{ price: priceId, quantity: seats }],
      metadata: { userId, seats: String(seats), planType: "seats" },
      success_url: `${origin}/dashboard?seats_added=${seats}`,
      cancel_url:  `${origin}/dashboard`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-seat-checkout]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

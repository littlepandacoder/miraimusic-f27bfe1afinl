/**
 * create-teacher-checkout
 *
 * Creates a Stripe Checkout Session for the teacher monthly plan.
 * No free trial — charged $8 on first month via FIRST_MONTH coupon,
 * then $20/month ongoing. On success the webhook assigns the teacher
 * role and provisions 10 default student seats.
 *
 * Stripe products:
 *   Student monthly  — prod_UbPBeGKGZAMFr1  price_1TcBF2B8UWyR18ZVVnNultKl  $17/mo
 *   Teacher monthly  — prod_UbPBeoV4GEqB2l  price_1TcBGVB8UWyR18ZVXt2CZABa  $20/mo
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY          – sk_live_… or sk_test_…
 *   STRIPE_TEACHER_PRICE_ID    – override price ID for live-mode swap (optional)
 *   STRIPE_FIRST_MONTH_COUPON  – coupon ID for $8 first month (default: FIRST_MONTH)
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

    // Teacher monthly plan — prod_UbPBeoV4GEqB2l — $20/mo
    const priceId =
      Deno.env.get("STRIPE_TEACHER_PRICE_ID") ?? "price_1TcBGVB8UWyR18ZVXt2CZABa";

    // $8 first month — create coupon 'FIRST_MONTH' in Stripe Dashboard:
    //   Amount off: $12  |  Duration: once  (for teacher plan: $20 - $12 = $8)
    //   Or reuse the same FIRST_MONTH coupon if it's set as a fixed % discount
    const firstMonthCoupon =
      Deno.env.get("STRIPE_TEACHER_FIRST_MONTH_COUPON") ??
      Deno.env.get("STRIPE_FIRST_MONTH_COUPON") ??
      "FIRST_MONTH";

    const origin = req.headers.get("origin") ?? "https://musicableapp.com";

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ coupon: firstMonthCoupon }],
      subscription_data: {
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

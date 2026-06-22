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
    const { userId, email, promoCode } = await req.json();

    if (!userId || !email) {
      throw new Error("userId and email are required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[create-subscription-checkout] STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe is not configured. Please contact support.");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
    });

    const priceId =
      Deno.env.get("STRIPE_STUDENT_PRICE_ID") ?? "price_1TcBF2B8UWyR18ZVVnNultKl";

    const origin = req.headers.get("origin") ?? "https://musicable.app";

    // Reuse existing Stripe customer if one exists for this email
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    // Build base session params
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId, planType: "student" },
      },
      metadata: { userId, planType: "student" },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/signup`,
    };

    let session: Stripe.Checkout.Session | undefined = undefined;
    let promoApplied = false;

    // A customer-typed code is a Promotion Code, not a raw Coupon ID — look it up first.
    if (promoCode) {
      const promos = await stripe.promotionCodes.list({
        code: String(promoCode).trim(),
        active: true,
        limit: 1,
      });
      const promo = promos.data[0];
      if (promo) {
        session = await stripe.checkout.sessions.create({
          ...sessionParams,
          discounts: [{ promotion_code: promo.id }],
        });
        promoApplied = true;
        console.log("[checkout] created with promotion code:", promoCode);
      }
    }

    // No promo code given, or it didn't resolve — full price, no discount.
    if (!session) {
      session = await stripe.checkout.sessions.create(sessionParams);
    }

    return new Response(JSON.stringify({ url: session.url, promoApplied }), {
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

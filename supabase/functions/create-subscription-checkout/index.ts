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
    const { userId, email, password, promoCode, billingPeriod, planType = "student" } = await req.json();

    if (!userId || !email) {
      throw new Error("userId and email are required");
    }

    // For new accounts (userId = email), password is required
    if (userId === email && !password) {
      throw new Error("password is required for new accounts");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[create-subscription-checkout] STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe is not configured. Please contact support.");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-01-27",
    });

    let priceId: string;
    let actualPlanType = planType;

    // Determine price based on plan type
    if (planType === "premium") {
      priceId = Deno.env.get("STRIPE_PREMIUM_PRICE_ID") ?? "price_1TnRLjB8UWyR18ZVFWzFrHdY";
    } else {
      const isYearly = billingPeriod === "yearly";
      priceId = isYearly
        ? Deno.env.get("STRIPE_STUDENT_YEARLY_PRICE_ID") ?? "price_1Tl8QbB8UWyR18ZVc5ghssYc"
        : Deno.env.get("STRIPE_STUDENT_PRICE_ID") ?? "price_1TcBF2B8UWyR18ZVVnNultKl";
    }

    const origin = req.headers.get("origin") ?? "https://musicable.app";

    // Check if customer exists and has an active subscription
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    const existingCustomer = existingCustomers.data[0];

    // Warn if they already have an active subscription (but still create new one with trial)
    if (existingCustomer) {
      const subs = await stripe.subscriptions.list({ customer: existingCustomer.id, status: "active", limit: 1 });
      if (subs.data.length > 0) {
        console.log(`[checkout] Customer ${email} already has active subscription, but creating new trial subscription anyway`);
      }
    }

    // Build base session params
    const billingPeriodStr = planType === "premium" ? "monthly" : (billingPeriod === "yearly" ? "yearly" : "monthly");
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer_email: email,
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [
        { price: priceId, quantity: 1 },
      ],
      subscription_data: {
        trial_period_days: 1,
        metadata: { userId, planType: actualPlanType, billingPeriod: billingPeriodStr, ...(password ? { password } : {}) },
        description: "1 day free trial - first charge after 24 hours",
      },
      metadata: { userId, planType: actualPlanType, billingPeriod: billingPeriodStr, ...(password ? { password } : {}) },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/signup`,
    };

    let session: Stripe.Checkout.Session | undefined = undefined;
    let promoApplied = false;

    console.log("[checkout] Trial setup - trial_period_days: 1, subscription_data:", JSON.stringify(sessionParams.subscription_data));

    // A customer-typed code is a Promotion Code, not a raw Coupon ID — look it up first.
    if (promoCode) {
      const promos = await stripe.promotionCodes.list({
        code: String(promoCode).trim(),
        active: true,
        limit: 1,
      });
      const promo = promos.data[0];
      if (promo) {
        console.log("[checkout] Using promo code:", promoCode, "- Coupon:", promo.coupon?.id);
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
      console.log("[checkout] Session created - subscription ID:", session.subscription, "- trial_period_days should be applied");
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

/**
 * check-subscription-details
 *
 * Checks Stripe subscription details to determine if user is on trial or regular plan
 * The first invoice at $8 (with FIRST_MONTH coupon) indicates trial plan
 * Subsequent invoices at $17 indicate regular plan
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
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      throw new Error("subscriptionId is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-06-20",
    });

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Check if subscription has discounts (trial coupon applied)
    const hasTrialDiscount = subscription.discount?.coupon?.id === "FIRST_MONTH" ||
                              (subscription.discounts && subscription.discounts.length > 0);

    // If there's a trial discount and we're still in the first billing cycle, it's a trial plan
    const isTrialPlan = hasTrialDiscount && subscription.current_period_start === subscription.created;

    return new Response(JSON.stringify({
      isTrialPlan,
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      hasDiscount: !!subscription.discount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[check-subscription-details]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

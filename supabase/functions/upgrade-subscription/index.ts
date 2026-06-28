import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
    });

    // Get the Pro price ID
    const proPriceId = Deno.env.get("STRIPE_PREMIUM_PRICE_ID") ?? "price_1TnRLjB8UWyR18ZVFWzFrHdY";

    // Get user's current subscription from Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subData, error: subError } = await supabaseAdmin
      .from("user_subscriptions")
      .select("subscription_id, plan_id")
      .eq("user_id", userId)
      .single();

    if (subError || !subData?.subscription_id) {
      throw new Error("No active subscription found");
    }

    // Check if already on Pro plan
    if (subData.plan_id === "premium" || subData.plan_id === "pro") {
      return new Response(
        JSON.stringify({ error: "Already on Pro plan" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get current subscription to get the current line item
    const subscription = await stripe.subscriptions.retrieve(subData.subscription_id);

    if (!subscription || subscription.items.data.length === 0) {
      throw new Error("Subscription not found or has no items");
    }

    // Update subscription: replace old price with Pro price
    // This will prorate the charge immediately
    const updatedSubscription = await stripe.subscriptions.update(
      subData.subscription_id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: proPriceId,
          },
        ],
        proration_behavior: "always_invoice", // Create invoice immediately for the difference
      }
    );

    // Update plan_id in Supabase
    const { error: updateError } = await supabaseAdmin
      .from("user_subscriptions")
      .update({ plan_id: "premium" })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update Supabase:", updateError);
      // Continue anyway - Stripe was updated successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: updatedSubscription.id,
        newPrice: proPriceId,
        message: "Upgraded to Pro plan successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("[upgrade-subscription]", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

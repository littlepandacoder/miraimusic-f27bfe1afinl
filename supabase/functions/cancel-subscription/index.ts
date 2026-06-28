/**
 * cancel-subscription
 *
 * Cancels a Stripe subscription on behalf of the authenticated user
 * Supports both immediate cancellation and end-of-period cancellation
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { subscriptionId, reason, cancelAtPeriodEnd } = await req.json();

    if (!subscriptionId) {
      throw new Error("subscriptionId is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-06-20",
    });

    // Cancel the subscription
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: cancelAtPeriodEnd || false,
        metadata: {
          cancelled_by_user: "true",
          cancellation_reason: reason || "User requested cancellation",
          cancelled_at: new Date().toISOString(),
        },
      }
    );

    // Update the subscription status in our database
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        cancelled_at: !cancelAtPeriodEnd ? new Date().toISOString() : null,
        cancellation_reason: reason || "User requested cancellation",
        cancel_at_period_end: cancelAtPeriodEnd || false,
        status: !cancelAtPeriodEnd ? "cancelled" : "active",
      })
      .eq("subscription_id", subscriptionId)
      .eq("user_id", user.id);

    if (updateError) {
      console.warn("[cancel-subscription] Error updating database:", updateError);
      // Don't throw - Stripe was already updated
    }

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: canceledSubscription.id,
      status: canceledSubscription.status,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      canceledAt: canceledSubscription.canceled_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[cancel-subscription]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

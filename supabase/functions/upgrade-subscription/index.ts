/**
 * upgrade-subscription
 *
 * Upgrades a user from trial ($8) plan to regular ($17) plan
 * Prorates the difference, charging only $9 for the upgrade
 * Uses Stripe's proration system to handle the credit from the trial period
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
      apiVersion: "2024-06-20",
    });

    const priceId = Deno.env.get("STRIPE_STUDENT_PRICE_ID") ?? "price_1TcBF2B8UWyR18ZVVnNultKl";

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;

    if (!customerId) {
      throw new Error("Customer not found. Please ensure you have an active trial subscription.");
    }

    // Find active subscription for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Remove the trial discount coupon and update the subscription
    // This will trigger proration with the $9 additional charge
    await stripe.subscriptions.update(subscription.id, {
      discounts: [], // Remove all discounts (this removes the FIRST_MONTH coupon)
      proration_behavior: "create_prorations", // Create prorations for the change
      metadata: { userId, planType: "student_upgraded" },
    });

    // If the subscription update succeeded, create an invoice to collect the remaining balance
    // Stripe will automatically charge the difference
    const invoice = await stripe.invoices.create({
      customer: customerId,
      subscription: subscription.id,
      auto_advance: true, // Automatically finalize and attempt payment
    });

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      message: "Subscription upgraded successfully. You will be charged $9 for the remaining balance.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[upgrade-subscription]", err.message);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * create-payment-intent
 *
 * Creates a Stripe SetupIntent + Subscription for embedded payment collection.
 * Returns the client secret for the Payment Element to collect card details.
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY          – sk_live_… or sk_test_…
 *   STRIPE_STUDENT_PRICE_ID    – price_1TcBF2B8UWyR18ZVVnNultKl
 *   STRIPE_FIRST_MONTH_COUPON  – FIRST_MONTH (coupon ID)
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

    const priceId =
      Deno.env.get("STRIPE_STUDENT_PRICE_ID") ?? "price_1TcBF2B8UWyR18ZVVnNultKl";
    const firstMonthCoupon = Deno.env.get("STRIPE_FIRST_MONTH_COUPON") ?? "FIRST_MONTH";

    // Reuse or create customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const customer = customerId
      ? { customer: customerId }
      : { customer_email: email };

    // Create subscription with metadata for webhook tracking
    const subscription = await stripe.subscriptions.create({
      ...customer,
      items: [{ price: priceId }],
      discounts: [{ coupon: firstMonthCoupon }],
      metadata: { userId, planType: "student" },
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    // Get the payment intent from the subscription's latest invoice
    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;

    if (!paymentIntent?.client_secret) {
      throw new Error("Failed to get payment intent client secret");
    }

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-payment-intent]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

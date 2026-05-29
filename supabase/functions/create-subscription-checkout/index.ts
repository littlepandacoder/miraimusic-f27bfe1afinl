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

    // Try to apply the FIRST_MONTH coupon — skip if it doesn't exist
    const couponId = Deno.env.get("STRIPE_FIRST_MONTH_COUPON") ?? "FIRST_MONTH";
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        ...sessionParams,
        discounts: [{ coupon: couponId }],
      });
      console.log("[checkout] created with coupon:", couponId);
    } catch (couponErr: any) {
      if (couponErr?.message?.includes("No such coupon")) {
        console.log("[checkout] coupon not found, creating session without discount");
        session = await stripe.checkout.sessions.create(sessionParams);
      } else {
        throw couponErr;
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
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

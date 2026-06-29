import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  if (!STRIPE_API_KEY) {
    console.error("[billing-portal] Missing STRIPE_API_KEY");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    console.log(`[billing-portal] Creating portal session for user: ${userId}`);

    // Get user's Stripe customer ID from Supabase
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error(`[billing-portal] Supabase error:`, subError);
      return res.status(400).json({ error: "Failed to fetch subscription" });
    }

    if (!subscription?.stripe_customer_id) {
      console.error(`[billing-portal] No Stripe customer ID for user: ${userId}`);
      return res.status(400).json({ error: "No active subscription found" });
    }

    // Create Stripe billing portal session
    const portalResponse = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: subscription.stripe_customer_id,
          return_url: `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://www.musicable.app'}/dashboard/student/settings`,
        }).toString(),
      }
    );

    if (!portalResponse.ok) {
      const errorData = await portalResponse.json();
      console.error(`[billing-portal] Stripe error:`, errorData);
      return res.status(400).json({
        error: errorData.error?.message || "Failed to create billing portal session",
      });
    }

    const portalSession = await portalResponse.json();
    console.log(`[billing-portal] Portal session created successfully`);

    return res.status(200).json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error(`[billing-portal] Error:`, error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STRIPE_API_KEY = process.env.STRIPE_API_KEY!;
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  if (!STRIPE_API_KEY || !STRIPE_PREMIUM_PRICE_ID) {
    return res.status(500).json({ error: "Missing Stripe configuration" });
  }

  try {
    console.log(`[upgrade-subscription] Processing upgrade for user: ${userId}`);

    // 1. Get user's active Stripe subscription from Supabase
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("subscription_id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subError) {
      console.error(`[upgrade-subscription] Supabase error:`, subError);
      return res.status(400).json({ error: "Failed to fetch subscription" });
    }

    if (!subscription?.subscription_id) {
      console.error(`[upgrade-subscription] No active subscription found for user: ${userId}`);
      return res.status(400).json({ error: "No active subscription found" });
    }

    console.log(`[upgrade-subscription] Found subscription: ${subscription.subscription_id}`);

    // 2. Fetch subscription details to get the subscription item ID
    const getSubResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription.subscription_id}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${STRIPE_API_KEY}`,
        },
      }
    );

    if (!getSubResponse.ok) {
      const errorData = await getSubResponse.json();
      console.error(`[upgrade-subscription] Failed to fetch subscription:`, errorData);
      return res.status(400).json({
        error: errorData.error?.message || "Failed to fetch subscription details",
      });
    }

    const stripeSubscription = await getSubResponse.json();
    const subscriptionItemId = stripeSubscription.items?.data?.[0]?.id;

    if (!subscriptionItemId) {
      console.error(`[upgrade-subscription] No subscription item found`);
      return res.status(400).json({ error: "Invalid subscription structure" });
    }

    console.log(`[upgrade-subscription] Found item ID: ${subscriptionItemId}`);

    // 3. Update Stripe subscription to new price
    // Stripe will automatically handle proration and charge the difference
    const updateResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription.subscription_id}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "items[0][id]": subscriptionItemId,
          "items[0][price]": STRIPE_PREMIUM_PRICE_ID,
          "proration_behavior": "create_prorations", // Charge difference immediately
        }).toString(),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error(`[upgrade-subscription] Stripe update error:`, errorData);
      return res.status(400).json({
        error: errorData.error?.message || "Failed to upgrade subscription",
      });
    }

    const updatedSubscription = await updateResponse.json();
    console.log(`[upgrade-subscription] Successfully upgraded subscription`);

    return res.status(200).json({
      success: true,
      message: "Subscription upgraded to Pro plan",
      subscriptionId: updatedSubscription.id,
    });
  } catch (error: any) {
    console.error(`[upgrade-subscription] Error:`, error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

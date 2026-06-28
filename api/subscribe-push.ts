import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, RateLimitPresets } from "./middleware/rateLimiter";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiter: 30 requests per minute per IP
const rateLimiter = createRateLimiter(RateLimitPresets.normal);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply rate limiting
  if (!rateLimiter(req, res)) {
    return;
  }

  if (req.method !== "POST") return res.status(405).end();

  const { subscription, userId } = req.body ?? {};
  if (!subscription?.endpoint || !subscription?.keys || !userId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:jkwong.official@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel sets Authorization: Bearer <CRON_SECRET> on cron invocations
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key");

  if (error || !subs?.length) {
    return res.status(200).json({ sent: 0, error: error?.message });
  }

  const payload = JSON.stringify({
    title: "🎹 Time to practise!",
    body: "Your daily piano session is waiting. Keep the streak going!",
    icon: "/logo.png",
    badge: "/logo.png",
    url: "/login",
  });

  let sent = 0;
  const expired: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // 410 Gone / 404 = subscription no longer valid
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.id);
        }
      }
    })
  );

  // Prune dead subscriptions
  if (expired.length) {
    await supabase.from("push_subscriptions").delete().in("id", expired);
  }

  return res.status(200).json({ sent, expired: expired.length });
}

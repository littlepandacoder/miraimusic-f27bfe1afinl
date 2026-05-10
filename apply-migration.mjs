/**
 * apply-migration.mjs
 * Runs the PayPal subscription fix migration against your Supabase project.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node apply-migration.mjs
 *
 * Get the service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

const SUPABASE_URL = "https://tychkyunjfbkksyxknhn.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  console.error("    Run:  SUPABASE_SERVICE_ROLE_KEY=your-key node apply-migration.mjs");
  process.exit(1);
}

const SQL = `
-- Fix 1: unique constraint so upsert ON CONFLICT (user_id) works
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT IF NOT EXISTS user_subscriptions_user_id_key UNIQUE (user_id);

-- Fix 2: SECURITY DEFINER function — records subscription + assigns student role,
--        bypasses RLS so it works right after signUp (before email confirmation)
CREATE OR REPLACE FUNCTION public.record_paypal_subscription(
  p_user_id  uuid,
  p_sub_id   text,
  p_plan_id  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, subscription_id, plan_id, status)
  VALUES (p_user_id, p_sub_id, p_plan_id, 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET subscription_id = EXCLUDED.subscription_id,
        plan_id         = EXCLUDED.plan_id,
        status          = 'active',
        updated_at      = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_paypal_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_paypal_subscription TO anon;
`;

async function run() {
  console.log("⏳  Applying migration to Supabase...");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql: SQL }),
  }).catch(() => null);

  // exec_sql RPC may not exist — fall back to pg-meta endpoint
  if (!res || !res.ok) {
    console.log("⏳  Trying pg-meta SQL endpoint...");
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: SQL }),
    });

    const body2 = await res2.text();
    if (!res2.ok) {
      console.error("❌  pg-meta failed:", body2);
      console.log("\n👉  Please run the SQL manually in Supabase Dashboard → SQL Editor.");
      console.log("    Copy the SQL from: supabase/migrations/20260510_fix_paypal_subscription_flow.sql");
      process.exit(1);
    }
    console.log("✅  Migration applied via pg-meta.");
    return;
  }

  const body = await res.text();
  console.log("✅  Migration applied!", body || "(no output)");
}

run().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});

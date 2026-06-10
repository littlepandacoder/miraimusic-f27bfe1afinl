import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://pay.musicable.app";

/** Auto-generate a referral code from name + 4 random digits */
export function generateCode(name: string): string {
  const prefix = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${prefix}${suffix}`;
}

/** Full referral URL */
export function buildReferralLink(code: string): string {
  return `${BASE_URL}/signup?ref=${code}`;
}

/** Fetch the affiliate record for the currently logged-in user */
export async function getMyAffiliate() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await (supabase as any)
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) { console.error("getMyAffiliate:", error); return null; }
  return data;
}

/** Fetch click rows for the affiliate */
export async function getMyClicks(code: string) {
  const { data, error } = await (supabase as any)
    .from("affiliate_clicks")
    .select("*")
    .eq("code", code)
    .order("clicked_at", { ascending: false })
    .limit(200);

  if (error) { console.error("getMyClicks:", error); return []; }
  return data ?? [];
}

/** Fetch conversion rows for the affiliate */
export async function getMyConversions(code: string) {
  const { data, error } = await (supabase as any)
    .from("affiliate_conversions")
    .select("*")
    .eq("code", code)
    .order("converted_at", { ascending: false });

  if (error) { console.error("getMyConversions:", error); return []; }
  return data ?? [];
}

/** Log a click when a visitor arrives via ?ref=CODE */
export async function logClick(code: string): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from("affiliate_clicks")
    .insert({ code, user_agent: navigator.userAgent.slice(0, 200) })
    .select("id")
    .maybeSingle();

  if (error) { console.warn("logClick:", error); return null; }

  // Persist click_id so we can link conversion later
  try { localStorage.setItem("musicable_aff_click_id", data?.id ?? ""); } catch {}
  return data?.id ?? null;
}

/** Record a conversion after successful signup (calls the Postgres function) */
export async function recordConversion(
  userId: string,
  userEmail: string,
  planAmount = 8
): Promise<void> {
  const code    = localStorage.getItem("musicable_ref_code");
  const clickId = localStorage.getItem("musicable_aff_click_id");
  if (!code) return;

  const { error } = await (supabase as any).rpc("record_affiliate_conversion", {
    p_code:         code,
    p_click_id:     clickId || null,
    p_user_id:      userId,
    p_user_email:   userEmail,
    p_plan_amount:  planAmount,
  });

  if (error) { console.warn("recordConversion:", error); return; }

  // Clear tracking values after successful conversion
  localStorage.removeItem("musicable_ref_code");
  localStorage.removeItem("musicable_aff_click_id");
}

/** Register a new affiliate (call after Supabase sign-up) */
export async function registerAffiliate(
  userId: string,
  name: string,
  email: string,
  code: string,
  payoutEmail?: string
) {
  // Insert affiliate record
  const { data, error } = await (supabase as any)
    .from("affiliates")
    .insert({ user_id: userId, name, email, code, payout_email: payoutEmail ?? email })
    .select()
    .maybeSingle();

  if (error) throw error;

  // Assign affiliate role to the user
  try {
    await (supabase as any)
      .from("user_roles")
      .insert({ user_id: userId, role: "affiliate" });
  } catch (roleError) {
    console.warn("Failed to assign affiliate role:", roleError);
  }

  return data;
}

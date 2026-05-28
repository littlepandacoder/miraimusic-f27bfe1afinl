/**
 * Stripe client-side config.
 * The publishable key is safe to expose — it can only create checkout sessions.
 * The SECRET key lives only in Supabase Edge Function secrets (never here).
 */
export const STRIPE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";

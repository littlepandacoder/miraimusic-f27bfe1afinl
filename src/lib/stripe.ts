/**
 * Stripe client-side helpers.
 *
 * Subscriptions use server-side Checkout Sessions (created by edge functions),
 * so no Stripe.js is loaded on the frontend — we just redirect to session.url.
 *
 * Required env vars (Vite):
 *   VITE_STRIPE_PUBLISHABLE_KEY  – pk_live_… or pk_test_…  (optional, for future elements)
 */
export const STRIPE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";

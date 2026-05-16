/**
 * PayPal configuration utility.
 *
 * Controls sandbox vs live mode via VITE_PAYPAL_MODE env var.
 * Set to "sandbox" during development/testing; "live" for production.
 *
 * Required env vars:
 *   VITE_PAYPAL_MODE              - "sandbox" | "live"
 *   VITE_PAYPAL_CLIENT_ID_SANDBOX - Sandbox client ID from developer.paypal.com
 *   VITE_PAYPAL_CLIENT_ID_LIVE    - Live client ID
 *   VITE_PAYPAL_PLAN_ID_SANDBOX   - Sandbox subscription plan ID
 *   VITE_PAYPAL_PLAN_ID_LIVE      - Live subscription plan ID
 */

export const PAYPAL_MODE: "sandbox" | "live" =
  (import.meta.env.VITE_PAYPAL_MODE as "sandbox" | "live") || "live";

export const IS_SANDBOX = PAYPAL_MODE === "sandbox";

// Client IDs — live credentials must come from env vars only (never hardcode)
const CLIENT_ID_SANDBOX = import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX || "";
const CLIENT_ID_LIVE    = import.meta.env.VITE_PAYPAL_CLIENT_ID_LIVE    || "";

// Student plan IDs
const PLAN_ID_SANDBOX = import.meta.env.VITE_PAYPAL_PLAN_ID_SANDBOX || "";
const PLAN_ID_LIVE    = import.meta.env.VITE_PAYPAL_PLAN_ID_LIVE    || "";

// Guard: crash loudly in production if live credentials are missing
if (!import.meta.env.DEV && PAYPAL_MODE === "live") {
  if (!CLIENT_ID_LIVE) throw new Error("[paypal] VITE_PAYPAL_CLIENT_ID_LIVE is required in production");
  if (!PLAN_ID_LIVE)   throw new Error("[paypal] VITE_PAYPAL_PLAN_ID_LIVE is required in production");
}

// Teacher plan IDs ($20/month, 10 student seats — create at developer.paypal.com)
const TEACHER_PLAN_ID_SANDBOX = import.meta.env.VITE_PAYPAL_TEACHER_PLAN_ID_SANDBOX || "";
const TEACHER_PLAN_ID_LIVE    = import.meta.env.VITE_PAYPAL_TEACHER_PLAN_ID_LIVE    || "";

export const PAYPAL_CLIENT_ID      = IS_SANDBOX ? CLIENT_ID_SANDBOX : CLIENT_ID_LIVE;
export const PAYPAL_PLAN_ID        = IS_SANDBOX ? PLAN_ID_SANDBOX   : PLAN_ID_LIVE;
export const PAYPAL_TEACHER_PLAN_ID = IS_SANDBOX ? TEACHER_PLAN_ID_SANDBOX : TEACHER_PLAN_ID_LIVE;

// Subscription SDK (vault + subscription intent)
export const PAYPAL_SDK_URL = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
// Orders SDK (for one-time per-seat purchases)
export const PAYPAL_ORDERS_SDK_URL = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;

// Warn in dev if sandbox creds are missing
if (import.meta.env.DEV) {
  if (IS_SANDBOX && !CLIENT_ID_SANDBOX) {
    console.warn(
      "[paypal] VITE_PAYPAL_MODE=sandbox but VITE_PAYPAL_CLIENT_ID_SANDBOX is not set. " +
        "Get your sandbox client ID from developer.paypal.com and add it to .env.local."
    );
  }
  if (IS_SANDBOX && !PLAN_ID_SANDBOX) {
    console.warn(
      "[paypal] VITE_PAYPAL_MODE=sandbox but VITE_PAYPAL_PLAN_ID_SANDBOX is not set. " +
        "Create a sandbox subscription plan at developer.paypal.com and add the plan ID to .env.local."
    );
  }
  console.debug(
    `[paypal] mode=${PAYPAL_MODE} clientId=${PAYPAL_CLIENT_ID ? PAYPAL_CLIENT_ID.slice(0, 8) + "..." : "(missing)"} planId=${PAYPAL_PLAN_ID || "(missing)"}`
  );
}

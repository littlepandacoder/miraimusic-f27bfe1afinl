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

// Client IDs
const CLIENT_ID_SANDBOX =
  import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX ||
  "AfnMfp3KJ3SSN2jJUuaRmqwFw5y1zcEprZeaJMD9tpxsx8sops-apbq0cYyoRNjyJbyS3W8Gham915X8";
const CLIENT_ID_LIVE =
  import.meta.env.VITE_PAYPAL_CLIENT_ID_LIVE ||
  "AZUMX5DxfcX4D8ehTfPRz939Ap79dAuOobQojsbeSv6LKTfkCcS_xoxLGHUv0SZum7OfOA1wKI6BGerr";

// Plan IDs
const PLAN_ID_SANDBOX =
  import.meta.env.VITE_PAYPAL_PLAN_ID_SANDBOX ||
  "P-4L07924847135773VNIAMVRA";
const PLAN_ID_LIVE =
  import.meta.env.VITE_PAYPAL_PLAN_ID_LIVE ||
  "P-204241322W266371XNIAXACQ";

export const PAYPAL_CLIENT_ID = IS_SANDBOX ? CLIENT_ID_SANDBOX : CLIENT_ID_LIVE;
export const PAYPAL_PLAN_ID = IS_SANDBOX ? PLAN_ID_SANDBOX : PLAN_ID_LIVE;

export const PAYPAL_SDK_URL = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;

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

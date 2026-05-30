/**
 * stripe-subscription-webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Must be registered at: https://dashboard.stripe.com/webhooks
 * Endpoint URL: https://<project>.supabase.co/functions/v1/stripe-subscription-webhook
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY      – sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET  – whsec_… (from Stripe Dashboard → Webhooks → signing secret)
 *   SMTP_PASSWORD          – Spaceship mail password for hello@musicable.app
 *
 * Events to enable in the Stripe Dashboard:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";

// ── Welcome email ────────────────────────────────────────────────────────────

const SMTP_HOST = "mail.spacemail.com";
const SMTP_PORT = 465;
const SMTP_USER = "hello@musicable.app";

function welcomeHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welcome to Musicable</title>
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;padding:0 20px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-1px;">MUSICABLE</span>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%);border-radius:16px;padding:40px;text-align:center;">
              <p style="font-size:40px;margin:0 0 12px;">🎹</p>
              <h1 style="margin:0 0 12px;font-size:30px;font-weight:900;color:#ffffff;line-height:1.2;">
                Welcome to Musicable!
              </h1>
              <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.85);line-height:1.5;">
                Your subscription is active. Your piano journey starts now.
              </p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;"></td></tr>

          <!-- What's included -->
          <tr>
            <td style="background:#111827;border-radius:12px;padding:28px;">
              <h2 style="margin:0 0 20px;font-size:16px;font-weight:700;color:#ffffff;">What's included in your plan</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:20px;">🎵</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">900+ Piano Lessons</strong> — beginner to advanced, classical to contemporary
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:20px;">🤖</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">AI-Powered Feedback</strong> — real-time analysis on your playing
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:20px;">📊</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">Progress Tracking</strong> — see exactly where you are and what's next
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size:20px;">📱</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">Mobile App</strong> — practice anywhere, anytime
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;"></td></tr>

          <!-- CTA -->
          <tr>
            <td style="text-align:center;">
              <a href="https://pay.musicable.app/dashboard"
                 style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
                Go to My Dashboard →
              </a>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:40px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1f2937;padding-top:24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">
                Questions? Reply to this email or write to us at
                <a href="mailto:hello@musicable.app" style="color:#9ca3af;">hello@musicable.app</a>
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} Musicable. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendWelcomeEmail(toEmail: string): Promise<void> {
  const password = Deno.env.get("SMTP_PASSWORD") ?? "";
  if (!password) {
    console.warn("[stripe-webhook] SMTP_PASSWORD not set — skipping welcome email");
    return;
  }

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: SMTP_USER, password },
    },
  });

  try {
    await client.send({
      from: `Musicable <${SMTP_USER}>`,
      to: toEmail,
      subject: "Welcome to Musicable — your subscription is active 🎹",
      html: welcomeHtml(toEmail),
      content: "auto",
    });
    console.log("[stripe-webhook] Welcome email sent to:", toEmail);
  } finally {
    await client.close();
  }
}

// ── Webhook handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  // Stripe requires the raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2025-08-27.basil",
  });

  // Verify event signature — reject anything that doesn't come from Stripe
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  // Use service-role client so we bypass RLS
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {

      // ── Checkout completed → create/activate subscription OR add seats ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // One-time seat purchase
        if (session.mode === "payment" && session.metadata?.planType === "seats") {
          const userId = session.metadata.userId;
          const seats  = parseInt(session.metadata.seats ?? "0", 10);
          if (userId && seats > 0) {
            const { error } = await supabase.rpc("teacher_add_seats", {
              p_teacher_id: userId,
              p_seats: seats,
            });
            if (error) console.error("[stripe-webhook] teacher_add_seats error:", error);
            else console.log(`[stripe-webhook] Added ${seats} seats for teacher ${userId}`);
          }
          break;
        }

        if (session.mode !== "subscription") break;

        const userId    = session.metadata?.userId;
        const planType  = session.metadata?.planType ?? "student";
        const stripeSubId  = session.subscription as string;
        const stripeCustId = session.customer as string;

        if (!userId || !stripeSubId) {
          console.error("[stripe-webhook] checkout.session.completed missing userId or subscriptionId");
          break;
        }

        // Retrieve full subscription object for trial/period dates
        const sub = await stripe.subscriptions.retrieve(stripeSubId);

        const rpc = planType === "teacher"
          ? "record_stripe_teacher_subscription"
          : "record_stripe_subscription";

        // RPC expects Unix timestamps as bigint, not ISO strings
        const trialEndUnix = sub.trial_end ?? null;
        const periodEndUnix = (sub as any).current_period_end ?? null;

        const { error } = await supabase.rpc(rpc, {
          p_user_id:        userId,
          p_customer_id:    stripeCustId,
          p_subscription_id: stripeSubId,
          p_trial_end:      trialEndUnix,
          p_period_end:     periodEndUnix,
        });

        if (error) console.error(`[stripe-webhook] ${rpc} error:`, error);
        else console.log(`[stripe-webhook] ${rpc} OK for user ${userId} (${sub.status})`);

        // Send welcome email — non-fatal, logged but not thrown
        const userEmail =
          session.customer_details?.email ??
          session.customer_email ??
          null;

        if (userEmail) {
          sendWelcomeEmail(userEmail).catch((e) =>
            console.error("[stripe-webhook] Welcome email error:", e?.message ?? e)
          );
        } else {
          console.warn("[stripe-webhook] Could not determine user email — welcome email skipped");
        }

        break;
      }

      // ── Subscription updated (trial → active, plan change, etc.) ────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status:               sub.status,
            trial_end:            sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            current_period_end:   new Date(
              (sub as any).current_period_end * 1000
            ).toISOString(),
            updated_at:           new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("[stripe-webhook] subscription.updated error:", error);
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("[stripe-webhook] subscription.deleted error:", error);
        break;
      }

      // ── Payment succeeded → ensure status is active ──────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);

        if (error) console.error("[stripe-webhook] payment_succeeded error:", error);
        break;
      }

      // ── Payment failed → mark past_due ───────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);

        if (error) console.error("[stripe-webhook] payment_failed error:", error);
        break;
      }

      default:
        // Unhandled event — return 200 so Stripe doesn't retry
        console.log("[stripe-webhook] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[stripe-webhook] Handler error:", err.message);
    // Return 500 so Stripe retries the event
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

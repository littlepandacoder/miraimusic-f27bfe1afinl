import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.spacemail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "hello@musicable.app",
    pass: process.env.SMTP_PASSWORD || "",
  },
});

function welcomeHtml(name: string): string {
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
                Welcome to Musicable, ${name}!
              </h1>
              <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.85);line-height:1.5;">
                Your account is ready. Your musical journey starts now.
              </p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;"></td></tr>

          <!-- What you can do -->
          <tr>
            <td style="background:#111827;border-radius:12px;padding:28px;">
              <h2 style="margin:0 0 20px;font-size:16px;font-weight:700;color:#ffffff;">Get started with your free trial</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:20px;">🎵</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">Access Premium Content</strong> — explore 900+ piano lessons
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:20px;">🤖</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">Get AI Feedback</strong> — real-time analysis on your playing
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:20px;">📊</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">Track Progress</strong> — see exactly where you are
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size:20px;">🎮</span>
                    <span style="margin-left:12px;font-size:14px;color:#d1d5db;line-height:1.5;">
                      <strong style="color:#ffffff;">Play Games</strong> — piano hero, rhythm quiz, and more
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
              <a href="https://musicable.app/dashboard"
                 style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
                Launch Your Dashboard →
              </a>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;"></td></tr>

          <!-- Tips -->
          <tr>
            <td style="background:#1f2937;border-radius:12px;padding:28px;">
              <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;color:#ffffff;">💡 Pro Tips to Get Started</h3>
              <ul style="margin:0;padding-left:20px;color:#d1d5db;font-size:14px;line-height:1.6;">
                <li style="margin-bottom:8px;">Start with the Foundation Modules — they build essential skills</li>
                <li style="margin-bottom:8px;">Play Piano Hero daily to earn XP and practice songs</li>
                <li style="margin-bottom:8px;">Use Ask Tutor to get real-time feedback on your playing</li>
                <li>Check your progress dashboard to see how far you've come</li>
              </ul>
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, email } = req.body ?? {};

  if (!userId || !email) {
    return res.status(400).json({ error: "Missing userId or email" });
  }

  if (!process.env.SMTP_PASSWORD) {
    console.error("[send-welcome-email] SMTP_PASSWORD not configured");
    return res.status(500).json({ error: "Email service not configured" });
  }

  try {
    console.log(`[send-welcome-email] Sending welcome email to: ${email}`);

    // Get user's display name
    let displayName = email.split("@")[0];
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.full_name) {
        displayName = profile.full_name.split(" ")[0];
      }
    } catch (err) {
      console.log("[send-welcome-email] Could not fetch profile, using email prefix");
    }

    // Send email
    await transporter.sendMail({
      from: `Musicable <${process.env.SMTP_USER || "hello@musicable.app"}>`,
      to: email,
      subject: "Welcome to Musicable — Let's Start Your Musical Journey! 🎹",
      html: welcomeHtml(displayName),
    });

    console.log(`[send-welcome-email] Email sent successfully to: ${email}`);
    return res.status(200).json({ success: true, message: "Welcome email sent" });
  } catch (error: any) {
    console.error(`[send-welcome-email] Error:`, error);
    return res.status(500).json({ error: error.message || "Failed to send email" });
  }
}

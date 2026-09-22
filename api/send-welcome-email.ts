import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER || "hello@musicable.app",
    pass: process.env.SMTP_PASS || "",
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
<body style="margin:0;padding:0;background:#fff8e1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;position:relative;overflow:hidden;">

          <!-- Decorative Pink Blob Top -->
          <tr>
            <td style="height:200px;background:#fff8e1;position:relative;overflow:hidden;">
              <div style="position:absolute;top:-50px;right:-80px;width:300px;height:300px;background:#ff1493;border-radius:60% 40% 30% 70% / 60% 30% 70% 40%;opacity:0.6;"></div>
              <div style="position:relative;z-index:10;padding:40px 30px 0;">
                <h1 style="margin:0;font-size:42px;font-weight:900;color:#000;text-align:left;">Welcome to the band!</h1>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background:#fff8e1;padding:40px 30px;">
              <p style="margin:0 0 20px;font-size:16px;font-weight:500;color:#000;line-height:1.6;">
                You've signed up for unlimited piano lessons straight to your inbox.
              </p>
              <p style="margin:0 0 20px;font-size:16px;font-weight:500;color:#000;line-height:1.6;">
                We are so pleased to have you onboard.
              </p>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">
                Please note you can unsubscribe at anytime by clicking "unsubscribe from this list". It's right there in the footer.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background:#fff8e1;padding:0 30px 30px;">
              <a href="https://musicable.app/dashboard"
                 style="display:inline-block;background:#000;color:#fff8e1;text-decoration:none;padding:18px 50px;border-radius:30px;font-weight:900;font-size:16px;letter-spacing:0.5px;">
                START LEARNING
              </a>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:50px;background:#fff8e1;"></td></tr>

          <!-- Decorative Pink Blob Bottom -->
          <tr>
            <td style="height:150px;background:#fff8e1;position:relative;overflow:hidden;">
              <div style="position:absolute;bottom:-50px;left:-80px;width:280px;height:280px;background:#ff1493;border-radius:70% 30% 66% 34% / 40% 50% 50% 60%;opacity:0.5;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fff8e1;padding:40px 30px;text-align:center;">
              <!-- Social Icons -->
              <div style="margin-bottom:24px;">
                <a href="https://twitter.com/musicableapp" style="display:inline-block;width:40px;height:40px;margin:0 10px;background:#000;border-radius:50%;text-align:center;line-height:40px;text-decoration:none;">
                  <span style="color:#fff8e1;font-weight:900;font-size:20px;">𝕏</span>
                </a>
                <a href="https://instagram.com/musicableapp" style="display:inline-block;width:40px;height:40px;margin:0 10px;background:#000;border-radius:50%;text-align:center;line-height:40px;text-decoration:none;">
                  <span style="color:#fff8e1;font-weight:900;">📷</span>
                </a>
                <a href="https://youtube.com/musicableapp" style="display:inline-block;width:40px;height:40px;margin:0 10px;background:#000;border-radius:50%;text-align:center;line-height:40px;text-decoration:none;">
                  <span style="color:#fff8e1;font-weight:900;font-size:18px;">▶</span>
                </a>
              </div>

              <p style="margin:0 0 12px;font-size:12px;color:#000;">© ${new Date().getFullYear()} Musicable AB</p>

              <p style="margin:0;font-size:11px;color:#666;">
                Want to change how you receive these emails?<br/>
                You can <a href="https://musicable.app/preferences" style="color:#000;font-weight:600;text-decoration:none;">update your preferences</a> or
                <a href="mailto:hello@musicable.app?subject=Unsubscribe" style="color:#000;font-weight:600;text-decoration:none;">unsubscribe from this list</a>
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

  if (!process.env.SMTP_PASS) {
    console.error("[send-welcome-email] SMTP_PASS not configured");
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

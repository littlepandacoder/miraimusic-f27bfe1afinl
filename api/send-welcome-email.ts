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
  <title>Welcome to Musicable!</title>
</head>
<body style="margin:0;padding:0;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);font-family:'Trebuchet MS',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Colorful Header with Piano Keys -->
          <tr>
            <td style="background:linear-gradient(90deg,#ff006e 0%,#fb5607 25%,#ffbe0b 50%,#8338ec 75%,#3a86ff 100%);padding:50px 30px;text-align:center;border-radius:20px 20px 0 0;">
              <div style="font-size:80px;margin-bottom:20px;">🎹✨</div>
              <h1 style="margin:0;font-size:48px;font-weight:900;color:#fff;text-shadow:2px 2px 4px rgba(0,0,0,0.3);letter-spacing:-1px;">
                Hey ${name}!
              </h1>
              <p style="margin:10px 0 0;font-size:20px;color:#fff;font-weight:600;">Welcome to Musicable</p>
            </td>
          </tr>

          <!-- Main Content with Icons -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0f23 0%,#1a1a3e 100%);padding:50px 30px;color:#fff;">

              <!-- Greeting -->
              <p style="margin:0 0 30px;font-size:18px;font-weight:600;color:#ffbe0b;text-align:center;">
                🎊 Your Musical Journey Awaits! 🎊
              </p>

              <!-- Features Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding:15px;background:rgba(255,0,110,0.1);border-radius:15px;margin-bottom:15px;text-align:center;">
                    <div style="font-size:40px;margin-bottom:10px;">🎵</div>
                    <p style="margin:0;font-size:14px;font-weight:600;">900+ Piano Lessons</p>
                    <p style="margin:5px 0 0;font-size:12px;color:#aaa;">From beginner to pro</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:15px;background:rgba(251,86,7,0.1);border-radius:15px;margin-bottom:15px;text-align:center;">
                    <div style="font-size:40px;margin-bottom:10px;">🤖</div>
                    <p style="margin:0;font-size:14px;font-weight:600;">AI-Powered Feedback</p>
                    <p style="margin:5px 0 0;font-size:12px;color:#aaa;">Real-time analysis & tips</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:15px;background:rgba(255,190,11,0.1);border-radius:15px;margin-bottom:15px;text-align:center;">
                    <div style="font-size:40px;margin-bottom:10px;">🎮</div>
                    <p style="margin:0;font-size:14px;font-weight:600;">Gamified Learning</p>
                    <p style="margin:5px 0 0;font-size:12px;color:#aaa;">Piano Hero & Rhythm Quiz</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:15px;background:rgba(131,56,236,0.1);border-radius:15px;text-align:center;">
                    <div style="font-size:40px;margin-bottom:10px;">📊</div>
                    <p style="margin:0;font-size:14px;font-weight:600;">Track Your Progress</p>
                    <p style="margin:5px 0 0;font-size:12px;color:#aaa;">See how far you've come</p>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <p style="margin:30px 0 0;font-size:15px;line-height:1.8;color:#ddd;text-align:center;">
                You're now part of our community of piano lovers. Get ready to unlock your musical potential! 🎹💪
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0f23 0%,#1a1a3e 100%);padding:0 30px 40px;text-align:center;">
              <a href="https://musicable.app/dashboard"
                 style="display:inline-block;background:linear-gradient(90deg,#ff006e,#8338ec);color:#fff;text-decoration:none;padding:18px 60px;border-radius:50px;font-weight:900;font-size:16px;box-shadow:0 8px 20px rgba(255,0,110,0.3);transition:transform 0.2s;cursor:pointer;">
                🚀 START YOUR JOURNEY
              </a>
            </td>
          </tr>

          <!-- Emoji Divider -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0f23 0%,#1a1a3e 100%);padding:20px 30px;text-align:center;font-size:20px;">
              🎹 🎵 🌟 🎸 🎼 🎶 ✨
            </td>
          </tr>

          <!-- Quick Tips -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0f23 0%,#1a1a3e 100%);padding:30px;border-radius:0 0 20px 20px;">
              <h3 style="margin:0 0 20px;font-size:16px;color:#ffbe0b;text-align:center;">💡 Quick Tips to Get Started</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span style="font-size:16px;margin-right:10px;">✓</span>
                    <span style="color:#ddd;font-size:13px;">Start with Foundation Modules for the basics</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span style="font-size:16px;margin-right:10px;">✓</span>
                    <span style="color:#ddd;font-size:13px;">Play Piano Hero daily to earn XP & rewards</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span style="font-size:16px;margin-right:10px;">✓</span>
                    <span style="color:#ddd;font-size:13px;">Use Ask Tutor for personalized feedback</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:16px;margin-right:10px;">✓</span>
                    <span style="color:#ddd;font-size:13px;">Check your dashboard for weekly insights</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer with Social -->
          <tr>
            <td style="background:#000;padding:40px 30px;text-align:center;">
              <!-- Social Icons -->
              <div style="margin-bottom:24px;">
                <a href="https://twitter.com/musicableapp" style="display:inline-block;width:45px;height:45px;margin:0 8px;background:linear-gradient(135deg,#ff006e,#8338ec);border-radius:50%;text-align:center;line-height:45px;text-decoration:none;">
                  <span style="color:#fff;font-weight:900;font-size:20px;">𝕏</span>
                </a>
                <a href="https://instagram.com/musicableapp" style="display:inline-block;width:45px;height:45px;margin:0 8px;background:linear-gradient(135deg,#fb5607,#ffbe0b);border-radius:50%;text-align:center;line-height:45px;text-decoration:none;">
                  <span style="color:#000;font-weight:900;font-size:20px;">📷</span>
                </a>
                <a href="https://youtube.com/musicableapp" style="display:inline-block;width:45px;height:45px;margin:0 8px;background:linear-gradient(135deg,#3a86ff,#8338ec);border-radius:50%;text-align:center;line-height:45px;text-decoration:none;">
                  <span style="color:#fff;font-weight:900;font-size:18px;">▶</span>
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:12px;color:#888;">Made with ❤️ by the Musicable team</p>
              <p style="margin:0 0 16px;font-size:11px;color:#666;">© ${new Date().getFullYear()} Musicable</p>

              <p style="margin:0;font-size:11px;color:#888;">
                <a href="https://musicable.app/preferences" style="color:#ff006e;font-weight:600;text-decoration:none;">Update preferences</a> •
                <a href="mailto:hello@musicable.app?subject=Unsubscribe" style="color:#ff006e;font-weight:600;text-decoration:none;">Unsubscribe</a>
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

async function sendWelcomeEmail(toEmail: string, userId: string): Promise<void> {
  const password = process.env.SMTP_PASS ?? "";
  if (!password) {
    console.warn("[send-welcome-email] SMTP_PASS not configured");
    throw new Error("Email service not configured");
  }

  let displayName = toEmail.split("@")[0];
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

  await transporter.sendMail({
    from: \`Musicable <\${process.env.SMTP_USER || "hello@musicable.app"}>\`,
    to: toEmail,
    subject: "Welcome to Musicable — Your Musical Journey Awaits! 🎹",
    html: welcomeHtml(displayName),
  });

  console.log(\`[send-welcome-email] Email sent successfully to: \${toEmail}\`);
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
    console.log(\`[send-welcome-email] Sending welcome email to: \${email}\`);
    await sendWelcomeEmail(email, userId);
    return res.status(200).json({ success: true, message: "Welcome email sent" });
  } catch (error: any) {
    console.error(\`[send-welcome-email] Error:\`, error);
    return res.status(500).json({ error: error.message || "Failed to send email" });
  }
}

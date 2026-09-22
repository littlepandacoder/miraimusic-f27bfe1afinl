import type { VercelRequest, VercelResponse } from "@vercel/node";
import { promises as dns } from "dns";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Disposable email domains to block
const DISPOSABLE_DOMAINS = [
  "tempmail.com",
  "guerrillamail.com",
  "mailinator.com",
  "10minutemail.com",
  "throwaway.email",
  "maildrop.cc",
  "yopmail.com",
  "temp-mail.org",
  "emailondeck.com",
  "fakeinbox.com",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // 1. Basic format validation
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return res.status(200).json({
      valid: false,
      error: "Invalid email format",
    });
  }

  try {
    const [localPart, domain] = trimmedEmail.split("@");

    // 2. Check for disposable email domains
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return res.status(200).json({
        valid: false,
        error: "Disposable email addresses are not allowed",
      });
    }

    // 3. Check domain length
    if (domain.length > 255) {
      return res.status(200).json({
        valid: false,
        error: "Domain is too long",
      });
    }

    // 4. Check local part length
    if (localPart.length > 64) {
      return res.status(200).json({
        valid: false,
        error: "Email local part is too long",
      });
    }

    // 5. Check for consecutive dots
    if (trimmedEmail.includes("..")) {
      return res.status(200).json({
        valid: false,
        error: "Invalid email format",
      });
    }

    // 6. Verify MX records exist (indicates domain can receive emails)
    try {
      const mxRecords = await dns.resolveMx(domain);

      if (!mxRecords || mxRecords.length === 0) {
        return res.status(200).json({
          valid: false,
          error: "Invalid email domain",
        });
      }

      // Email passed all validations
      return res.status(200).json({
        valid: true,
        error: null,
      });
    } catch (dnsError: any) {
      // DNS lookup failed - likely invalid domain
      console.log(`[validate-email] DNS lookup failed for ${domain}:`, dnsError.code);
      return res.status(200).json({
        valid: false,
        error: "Invalid email domain",
      });
    }
  } catch (error: any) {
    console.error(`[validate-email] Validation error:`, error);
    return res.status(500).json({
      error: "Email validation failed",
    });
  }
}

import { randomBytes } from "crypto";

const RESEND_URL = "https://api.resend.com/emails";

/** Default "from" for bidder confirmation when env vars are unset (verify domain in Resend). */
const DEFAULT_BIDDER_VERIFICATION_FROM = "info@acrebid.com";

export function bidderVerificationFromEmail(): string {
  return (
    process.env.BIDDER_VERIFICATION_FROM_EMAIL?.trim() ||
    process.env.INVOICE_FROM_EMAIL?.trim() ||
    DEFAULT_BIDDER_VERIFICATION_FROM
  );
}

export function isBidderEmailSendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function newVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function verificationExpiryIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export async function sendBidderVerificationEmail(params: {
  to: string;
  firstName: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = bidderVerificationFromEmail();

  if (!isBidderEmailSendConfigured() || !apiKey) {
    return {
      ok: false,
      reason: "Email not configured (set RESEND_API_KEY).",
    };
  }

  const origin = siteOrigin();
  if (!origin) {
    return {
      ok: false,
      reason:
        "Set NEXT_PUBLIC_SITE_URL (or deploy on Vercel) so verification links work in email.",
    };
  }
  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(params.token)}`;

  const name = params.firstName?.trim() || "there";
  const subject = "Confirm your email to bid";
  const textBody = `Hi ${name},

Confirm your email to place bids on our auctions:

${verifyUrl}

If you didn't register, you can ignore this message.

— Going Going Gobbi`;

  const htmlBody = `<p>Hi ${escapeHtml(name)},</p>
<p>Confirm your email to place bids:</p>
<p><a href="${escapeHtml(verifyUrl)}">Verify my email</a></p>
<p style="color:#666;font-size:14px">If you didn't register, you can ignore this message.</p>`;

  const resendRes = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject,
      html: htmlBody,
      text: textBody,
    }),
  });

  if (!resendRes.ok) {
    const details = await resendRes.text();
    return { ok: false, reason: details || "Resend request failed" };
  }

  return { ok: true };
}

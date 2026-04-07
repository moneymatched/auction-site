import { randomBytes } from "crypto";

const RESEND_URL = "https://api.resend.com/emails";

function fromEmail(): string {
  return (
    process.env.BIDDER_VERIFICATION_FROM_EMAIL?.trim() ||
    process.env.INVOICE_FROM_EMAIL?.trim() ||
    "info@acrebid.com"
  );
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

export function newLoginToken(): string {
  return randomBytes(32).toString("hex");
}

export function loginTokenExpiryIso(minutesFromNow = 30): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

export async function sendLoginEmail(params: {
  to: string;
  firstName: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, reason: "Email not configured (set RESEND_API_KEY)." };
  }

  const origin = siteOrigin();
  if (!origin) {
    return { ok: false, reason: "Set NEXT_PUBLIC_SITE_URL so login links work in email." };
  }

  const loginUrl = `${origin}/dashboard?login_token=${encodeURIComponent(params.token)}`;
  const name = params.firstName?.trim() || "there";

  const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Click below to sign in to your Acrebid dashboard. This link expires in 30 minutes.</p>
<p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:10px 20px;background:#1c1917;color:#fff;text-decoration:none;border-radius:2px">Sign in to dashboard</a></p>
<p style="color:#999;font-size:13px">If you didn't request this, you can ignore it safely.</p>`;

  const text = `Hi ${name},\n\nSign in to your Acrebid dashboard:\n\n${loginUrl}\n\nThis link expires in 30 minutes.\n\n— Acrebid`;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: fromEmail(),
      to: [params.to],
      subject: "Sign in to your Acrebid dashboard",
      html,
      text,
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    return { ok: false, reason: details || "Resend request failed" };
  }

  return { ok: true };
}

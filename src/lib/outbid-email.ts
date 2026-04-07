import { SupabaseClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/auction-utils";

const RESEND_URL = "https://api.resend.com/emails";

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

export async function getLeadingBidderEmail(
  supabase: SupabaseClient,
  auctionId: string
): Promise<{ bidder_email: string; bidder_name: string | null } | null> {
  const { data } = await supabase
    .from("bids")
    .select("bidder_email, bidder_name")
    .eq("auction_id", auctionId)
    .order("amount", { ascending: false })
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function sendOneOutbid(params: {
  to: string;
  recipientName: string | null;
  propertyTitle: string;
  auctionUrl: string;
  currentBid: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.NOTIFICATION_FROM_EMAIL ??
    process.env.INVOICE_FROM_EMAIL ??
    "invoice@acrebid.com";

  if (!apiKey) {
    console.warn("[outbid-email] RESEND_API_KEY not set; skipping notification to", params.to);
    return;
  }

  const greeting =
    params.recipientName?.trim() ? `Hi ${params.recipientName.trim()},` : "Hi,";
  const safeGreeting = params.recipientName?.trim()
    ? `Hi ${escapeHtml(params.recipientName.trim())},`
    : "Hi,";
  const bidText = formatCurrency(params.currentBid);
  const subject = `You've been outbid — ${params.propertyTitle}`;

  const textBody = [
    greeting,
    "",
    `Someone placed a higher bid on ${params.propertyTitle}.`,
    `Current high bid: ${bidText}.`,
    "",
    params.auctionUrl ? `View the auction: ${params.auctionUrl}` : "",
    "",
    "If you want to stay in the running, place a new bid from the auction page.",
  ]
    .filter(Boolean)
    .join("\n");

  const safeTitle = escapeHtml(params.propertyTitle);
  const safeUrl = params.auctionUrl ? escapeHtml(params.auctionUrl) : "";
  const htmlBody = `<p>${safeGreeting}</p>
<p>Someone placed a higher bid on <strong>${safeTitle}</strong>.</p>
<p>Current high bid: <strong>${escapeHtml(bidText)}</strong>.</p>
${safeUrl ? `<p><a href="${safeUrl}">View the auction</a></p>` : ""}
<p>If you want to stay in the running, place a new bid from the auction page.</p>`;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject,
      text: textBody,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[outbid-email] Resend error:", res.status, errText);
  }
}

/** Loads bidder_name for the given email from the most recent bid on this auction (for greeting). */
async function getBidderNameForEmail(
  supabase: SupabaseClient,
  auctionId: string,
  email: string
): Promise<string | null> {
  const { data } = await supabase
    .from("bids")
    .select("bidder_name")
    .eq("auction_id", auctionId)
    .eq("bidder_email", email.toLowerCase())
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.bidder_name?.trim() || null;
}

/**
 * Sends outbid emails via Resend. Failures are logged; callers should not treat errors as bid failures.
 */
export async function notifyOutbidRecipients(
  supabase: SupabaseClient,
  auctionId: string,
  recipients: Set<string>,
  currentBid: number
): Promise<void> {
  if (recipients.size === 0) return;

  const { data: row } = await supabase
    .from("auctions")
    .select("property:properties(title)")
    .eq("id", auctionId)
    .maybeSingle();

  const propertyTitle =
    (row?.property as { title?: string } | null)?.title ?? "Auction listing";

  const base = siteOrigin();
  const auctionUrl = base ? `${base}/auctions/${auctionId}` : "";

  for (const to of Array.from(recipients)) {
    const normalized = to.trim().toLowerCase();
    if (!normalized) continue;
    const name = await getBidderNameForEmail(supabase, auctionId, normalized);
    try {
      await sendOneOutbid({
        to: normalized,
        recipientName: name,
        propertyTitle,
        auctionUrl,
        currentBid,
      });
    } catch (e) {
      console.error("[outbid-email] Failed to notify", normalized, e);
    }
  }
}

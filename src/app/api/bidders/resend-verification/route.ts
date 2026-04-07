import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  isBidderEmailSendConfigured,
  newVerificationToken,
  sendBidderVerificationEmail,
  verificationExpiryIso,
} from "@/lib/bidder-verify-email";

const RESEND_COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: bidder, error } = await supabase.from("bidders").select("*").eq("email", email).maybeSingle();

  if (error || !bidder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (bidder.email_verified_at) {
    return NextResponse.json({ error: "This email is already verified." }, { status: 400 });
  }

  const now = Date.now();
  const lastSent = bidder.email_verification_sent_at
    ? new Date(bidder.email_verification_sent_at).getTime()
    : 0;
  if (now - lastSent < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${waitSec}s before requesting another email.` },
      { status: 429 }
    );
  }

  if (!isBidderEmailSendConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email delivery is not configured on this site. Contact the auction administrator.",
      },
      { status: 503 }
    );
  }

  const token = newVerificationToken();
  const expiresAt = verificationExpiryIso(48);
  const sentAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("bidders")
    .update({
      email_verification_token: token,
      email_verification_expires_at: expiresAt,
      email_verification_sent_at: sentAt,
    })
    .eq("id", bidder.id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("[bidders/resend-verification] update error:", updateError);
    return NextResponse.json({ error: "Could not update verification" }, { status: 500 });
  }

  const send = await sendBidderVerificationEmail({
    to: email,
    firstName: bidder.first_name,
    token,
  });

  if (!send.ok) {
    console.error("[bidders/resend-verification] send failed:", send.reason);
    return NextResponse.json(
      { error: "Could not send email. Try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}

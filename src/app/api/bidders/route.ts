import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Bidder } from "@/types";
import {
  isBidderEmailSendConfigured,
  newVerificationToken,
  sendBidderVerificationEmail,
  verificationExpiryIso,
} from "@/lib/bidder-verify-email";

const RESEND_COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();

  let body: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { first_name, last_name, email, phone } = body;

  if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const devAutoVerify =
    process.env.NODE_ENV === "development" && !isBidderEmailSendConfigured();

  const { data: existing, error: existingError } = await supabase
    .from("bidders")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) {
    console.error("[bidders] existing lookup error:", existingError);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }

  if (existing) {
    if (existing.email_verified_at) {
      return NextResponse.json(existing as Bidder);
    }

    const now = Date.now();
    const lastSent = existing.email_verification_sent_at
      ? new Date(existing.email_verification_sent_at).getTime()
      : 0;
    const canResend = now - lastSent >= RESEND_COOLDOWN_MS;

    if (canResend && isBidderEmailSendConfigured()) {
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
        .eq("id", existing.id)
        .select()
        .single();

      if (!updateError && updated) {
        const send = await sendBidderVerificationEmail({
          to: normalizedEmail,
          firstName: existing.first_name,
          token,
        });
        if (!send.ok) {
          console.error("[bidders] resend verification email failed:", send.reason);
        }
        return NextResponse.json(updated as Bidder);
      }
    }

    return NextResponse.json(existing as Bidder);
  }

  const nowIso = new Date().toISOString();

  const insertRow: Record<string, unknown> = {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
  };

  if (devAutoVerify) {
    insertRow.email_verified_at = nowIso;
  } else {
    const token = newVerificationToken();
    insertRow.email_verification_token = token;
    insertRow.email_verification_expires_at = verificationExpiryIso(48);
    insertRow.email_verification_sent_at = nowIso;
  }

  const { data, error } = await supabase.from("bidders").insert(insertRow).select().single();

  if (error) {
    console.error("[bidders] Supabase insert error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message ?? "Registration failed" }, { status: 500 });
  }

  if (!devAutoVerify && isBidderEmailSendConfigured()) {
    const token = data.email_verification_token as string;
    const send = await sendBidderVerificationEmail({
      to: normalizedEmail,
      firstName: first_name.trim(),
      token,
    });
    if (!send.ok) {
      console.error("[bidders] verification email failed:", send.reason);
    }
  }

  return NextResponse.json(data as Bidder, { status: 201 });
}

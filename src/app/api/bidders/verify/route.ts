import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: bidder, error: findError } = await supabase
    .from("bidders")
    .select("id, email_verification_expires_at")
    .eq("email_verification_token", token)
    .maybeSingle();

  if (findError || !bidder) {
    return NextResponse.json(
      { error: "Invalid or expired verification link." },
      { status: 400 }
    );
  }

  if (
    !bidder.email_verification_expires_at ||
    new Date(bidder.email_verification_expires_at) <= new Date()
  ) {
    return NextResponse.json(
      {
        error:
          "This link has expired. Open the auction site and use “Resend verification email”.",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bidders")
    .update({
      email_verified_at: now,
      email_verification_token: null,
      email_verification_expires_at: null,
    })
    .eq("id", bidder.id);

  if (updateError) {
    console.error("[bidders/verify] update error:", updateError);
    return NextResponse.json({ error: "Could not verify email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

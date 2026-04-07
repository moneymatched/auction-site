import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { newLoginToken, loginTokenExpiryIso, sendLoginEmail } from "@/lib/bidder-login-email";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();

  let body: { email: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data: bidder, error } = await supabase
    .from("bidders")
    .select("id, first_name, email_verified_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  // Always return success to avoid email enumeration
  if (!bidder || !bidder.email_verified_at) {
    return NextResponse.json({ sent: true });
  }

  const token = newLoginToken();
  const expiresAt = loginTokenExpiryIso(30);

  await supabase
    .from("bidders")
    .update({ login_token: token, login_token_expires_at: expiresAt })
    .eq("id", bidder.id);

  await sendLoginEmail({ to: email, firstName: bidder.first_name, token });

  return NextResponse.json({ sent: true });
}

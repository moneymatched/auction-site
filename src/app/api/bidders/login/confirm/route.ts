import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Bidder } from "@/types";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: bidder, error } = await supabase
    .from("bidders")
    .select("*")
    .eq("login_token", token)
    .maybeSingle();

  if (error || !bidder) {
    return NextResponse.json({ error: "Invalid or expired login link" }, { status: 401 });
  }

  if (!bidder.login_token_expires_at || new Date(bidder.login_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This login link has expired. Request a new one." }, { status: 401 });
  }

  // Consume token (one-time use)
  await supabase
    .from("bidders")
    .update({ login_token: null, login_token_expires_at: null })
    .eq("id", bidder.id);

  return NextResponse.json(bidder as Bidder);
}

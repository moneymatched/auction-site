import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Bidder } from "@/types";

export async function POST(req: NextRequest) {
  let body: { email: string; password: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: bidder, error } = await supabase
    .from("bidders")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error || !bidder) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!bidder.password_hash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, bidder.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!bidder.email_verified_at) {
    return NextResponse.json(
      { error: "Please verify your email before signing in. Check your inbox for a confirmation link." },
      { status: 403 }
    );
  }

  const { password_hash: _, ...safe } = bidder;
  return NextResponse.json(safe as Bidder);
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

/** Public: returns only verification status for an email (minimal data exposure). */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email query parameter is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("bidders")
    .select("email_verified_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[bidders/lookup] error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ email_verified_at: data.email_verified_at });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Bidder } from "@/types";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("bidders")
    .select("id, first_name, last_name, email, phone, address_street, address_city, address_state, address_zip, created_at, email_verified_at")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!data.email_verified_at) {
    return NextResponse.json({ error: "Not verified" }, { status: 403 });
  }

  return NextResponse.json(data as Bidder);
}

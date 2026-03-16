import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Bidder } from "@/types";

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

  // Check if already registered
  const { data: existing } = await supabase
    .from("bidders")
    .select("*")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return NextResponse.json(existing as Bidder);
  }

  // Register new bidder
  const { data, error } = await supabase
    .from("bidders")
    .insert({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("[bidders] Supabase insert error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message ?? "Registration failed" }, { status: 500 });
  }

  return NextResponse.json(data as Bidder, { status: 201 });
}

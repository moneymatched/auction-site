import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await serverSupabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = {
    property_id: body.property_id,
    status: body.status ?? "upcoming",
    start_time: body.start_time,
    end_time: body.end_time,
    starting_bid: typeof body.starting_bid === "number" ? body.starting_bid : parseFloat(String(body.starting_bid || 0)) || 0,
    reserve_price: body.reserve_price ? parseFloat(String(body.reserve_price)) : null,
    current_bid: 0,
    bid_count: 0,
    min_bid_increment: typeof body.min_bid_increment === "number" ? body.min_bid_increment : parseInt(String(body.min_bid_increment || 100), 10) || 100,
    auto_extend_seconds: typeof body.auto_extend_seconds === "number" ? body.auto_extend_seconds : parseInt(String(body.auto_extend_seconds || 300), 10) || 300,
    auto_extend_threshold: typeof body.auto_extend_threshold === "number" ? body.auto_extend_threshold : parseInt(String(body.auto_extend_threshold || 300), 10) || 300,
    notes: body.notes || null,
  };

  if (!payload.property_id || !payload.start_time || !payload.end_time) {
    return NextResponse.json(
      { error: "property_id, start_time, and end_time are required" },
      { status: 400 }
    );
  }

  if (new Date(payload.end_time as string) <= new Date(payload.start_time as string)) {
    return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
  }

  if (payload.starting_bid <= 0) {
    return NextResponse.json({ error: "starting_bid must be greater than 0" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("auctions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create auction" }, { status: 500 });
  }

  return NextResponse.json(data);
}

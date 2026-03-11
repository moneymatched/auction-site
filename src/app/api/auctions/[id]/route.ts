import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase";

async function requireAuth() {
  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await serverSupabase.auth.getSession();

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing auction id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  if (body.property_id !== undefined) payload.property_id = body.property_id;
  if (body.status !== undefined) payload.status = body.status;
  if (body.start_time !== undefined) payload.start_time = body.start_time;
  if (body.end_time !== undefined) payload.end_time = body.end_time;
  if (body.starting_bid !== undefined) payload.starting_bid = parseFloat(String(body.starting_bid)) || 0;
  if (body.reserve_price !== undefined) payload.reserve_price = body.reserve_price ? parseFloat(String(body.reserve_price)) : null;
  if (body.min_bid_increment !== undefined) payload.min_bid_increment = parseInt(String(body.min_bid_increment), 10) || 100;
  if (body.auto_extend_seconds !== undefined) payload.auto_extend_seconds = parseInt(String(body.auto_extend_seconds), 10) || 300;
  if (body.auto_extend_threshold !== undefined) payload.auto_extend_threshold = parseInt(String(body.auto_extend_threshold), 10) || 300;
  if (body.notes !== undefined) payload.notes = body.notes || null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("auctions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

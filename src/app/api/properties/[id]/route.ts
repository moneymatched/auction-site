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
    return NextResponse.json({ error: "Missing property id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = {
    title: body.title,
    description: body.description ?? "",
    address: body.address ?? "",
    city: body.city ?? "",
    state: body.state ?? "",
    acreage: typeof body.acreage === "number" ? body.acreage : parseFloat(String(body.acreage || 0)) || 0,
    zoning_type: body.zoning_type ?? "Agricultural",
    lat: body.lat ?? null,
    lng: body.lng ?? null,
  };

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing property id" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  // Delete related auctions first so test data can be cleaned up easily.
  // Bid/proxy rows are removed via FK cascade from auctions.
  const { error: auctionDeleteError } = await supabase
    .from("auctions")
    .delete()
    .eq("property_id", id);

  if (auctionDeleteError) {
    return NextResponse.json({ error: "Failed to delete related auctions" }, { status: 500 });
  }

  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

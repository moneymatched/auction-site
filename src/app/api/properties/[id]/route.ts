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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

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
    title: body.title,
    apn: body.apn ?? "",
    description: body.description ?? "",
    terms_and_conditions: body.terms_and_conditions ?? "",
    address: body.address ?? "",
    city: body.city ?? "",
    state: body.state ?? "",
    acreage: typeof body.acreage === "number" ? body.acreage : parseFloat(String(body.acreage || 0)) || 0,
    zoning_type: body.zoning_type ?? "Agricultural",
    buyer_premium: typeof body.buyer_premium === "number" ? body.buyer_premium : parseFloat(String(body.buyer_premium || 0)) || 0,
    doc_fee: typeof body.doc_fee === "number" ? body.doc_fee : parseFloat(String(body.doc_fee || 0)) || 0,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
  };

  if (!payload.title || typeof payload.title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }

  return NextResponse.json(data);
}

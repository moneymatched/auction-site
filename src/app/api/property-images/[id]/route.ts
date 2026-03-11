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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing image id" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: img, error: fetchErr } = await supabase
    .from("property_images")
    .select("storage_path, property_id")
    .eq("id", id)
    .single();

  if (fetchErr || !img) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await supabase.storage.from("property-images").remove([img.storage_path]);
  const { error: deleteErr } = await supabase
    .from("property_images")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    return NextResponse.json(
      { error: `Delete failed: ${deleteErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing image id" }, { status: 400 });
  }

  let body: { is_primary?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.is_primary !== true) {
    return NextResponse.json(
      { error: "Only is_primary=true is supported" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data: img } = await supabase
    .from("property_images")
    .select("property_id")
    .eq("id", id)
    .single();

  if (!img) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await supabase
    .from("property_images")
    .update({ is_primary: false })
    .eq("property_id", img.property_id);

  const { data: updated, error } = await supabase
    .from("property_images")
    .update({ is_primary: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Update failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(updated);
}

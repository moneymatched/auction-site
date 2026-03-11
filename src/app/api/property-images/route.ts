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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const propertyId = formData.get("property_id") as string | null;
  const displayOrder = parseInt(formData.get("display_order") as string ?? "0", 10);
  const isPrimary = formData.get("is_primary") === "true";

  if (!file || !propertyId) {
    return NextResponse.json(
      { error: "Missing file or property_id" },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${propertyId}/${Date.now()}.${ext}`;

  const supabase = createSupabaseServiceClient();

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(path, file, { upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: dbRow, error: dbError } = await supabase
    .from("property_images")
    .insert({
      property_id: propertyId,
      storage_path: path,
      display_order: displayOrder,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (dbError || !dbRow) {
    return NextResponse.json(
      { error: `Database error: ${dbError?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json(dbRow);
}

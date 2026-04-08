import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const ATTACHMENT_BUCKET = "property-images";

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
  { params }: { params: { id: string; attachmentId: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const invoiceId = params.id;
  const attachmentId = params.attachmentId;
  if (!invoiceId || !attachmentId) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase
    .from("invoice_attachments")
    .select("id, storage_path, invoice_id")
    .eq("id", attachmentId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  await supabase.storage.from(ATTACHMENT_BUCKET).remove([row.storage_path]);

  const { error } = await supabase
    .from("invoice_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("invoice_id", invoiceId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

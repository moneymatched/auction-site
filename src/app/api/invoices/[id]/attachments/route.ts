import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient, getStoragePublicUrl } from "@/lib/supabase";

const ATTACHMENT_BUCKET = "property-images";
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

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

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const invoiceId = params.id;
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 15MB" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const safeName = sanitizeFileName(file.name || "attachment");
  const storagePath = `invoices/${invoiceId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("invoice_attachments")
    .insert({
      invoice_id: invoiceId,
      file_name: file.name || safeName,
      storage_path: storagePath,
      content_type: file.type || null,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insertError || !row) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: `Database error: ${insertError?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...row,
    public_url: getStoragePublicUrl(ATTACHMENT_BUCKET, row.storage_path),
  });
}

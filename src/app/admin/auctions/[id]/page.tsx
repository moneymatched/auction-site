import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction, Bid, Invoice, InvoiceAttachment, Property } from "@/types";
import { getStoragePublicUrl } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { notFound } from "next/navigation";
import AdminAuctionRoom from "./AdminAuctionRoom";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  noStore();
  const supabase = createSupabaseServiceClient();

  const [{ data: auction }, { data: bids }, { data: properties }, { data: invoice }] = await Promise.all([
    supabase
      .from("auctions")
      .select("*, property:properties(*, images:property_images(*))")
      .eq("id", id)
      .single(),
    supabase
      .from("bids")
      .select("*")
      .eq("auction_id", id)
      .order("placed_at", { ascending: false }),
    supabase.from("properties").select("id, title").order("title"),
    supabase.from("invoices").select("*").eq("auction_id", id).maybeSingle(),
  ]);

  if (!auction) return null;
  let attachments: InvoiceAttachment[] = [];
  if (invoice?.id) {
    const { data: rows } = await supabase
      .from("invoice_attachments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true });
    attachments = ((rows as InvoiceAttachment[] | null) ?? []).map((row) => ({
      ...row,
      public_url: getStoragePublicUrl("property-images", row.storage_path),
    }));
  }

  return {
    auction: {
      ...(auction as Auction),
      status: getEffectiveAuctionStatus(auction as Auction),
    },
    bids: (bids as Bid[]) ?? [],
    properties: (properties as Property[]) ?? [],
    invoice: (invoice as Invoice | null) ?? null,
    invoiceAttachments: attachments,
  };
}

export default async function AdminAuctionPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) notFound();
  return <AdminAuctionRoom {...data} />;
}

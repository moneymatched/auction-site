import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction, Bid, Invoice, Property } from "@/types";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { notFound } from "next/navigation";
import AdminAuctionRoom from "./AdminAuctionRoom";

async function getData(id: string) {
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
  return {
    auction: {
      ...(auction as Auction),
      status: getEffectiveAuctionStatus(auction as Auction),
    },
    bids: (bids as Bid[]) ?? [],
    properties: (properties as Property[]) ?? [],
    invoice: (invoice as Invoice | null) ?? null,
  };
}

export default async function AdminAuctionPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) notFound();
  return <AdminAuctionRoom {...data} />;
}

import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction, Bid, Property } from "@/types";
import { notFound } from "next/navigation";
import AdminAuctionRoom from "./AdminAuctionRoom";

async function getData(id: string) {
  const supabase = createSupabaseServiceClient();

  const [{ data: auction }, { data: bids }, { data: properties }] = await Promise.all([
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
  ]);

  if (!auction) return null;
  return {
    auction: auction as Auction,
    bids: (bids as Bid[]) ?? [],
    properties: (properties as Property[]) ?? [],
  };
}

export default async function AdminAuctionPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) notFound();
  return <AdminAuctionRoom {...data} />;
}

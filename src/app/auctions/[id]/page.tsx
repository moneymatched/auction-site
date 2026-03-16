import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction, Bid } from "@/types";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { notFound } from "next/navigation";
import AuctionRoom from "./AuctionRoom";

async function getAuction(id: string): Promise<{ auction: Auction; bids: Bid[] } | null> {
  const supabase = createSupabaseServiceClient();

  const { data: auction } = await supabase
    .from("auctions")
    .select(`*, property:properties(*, images:property_images(*))`)
    .eq("id", id)
    .single();

  if (!auction) return null;

  const { data: bids } = await supabase
    .from("bids")
    .select("*")
    .eq("auction_id", id)
    .order("placed_at", { ascending: false })
    .limit(50);

  const normalizedAuction = {
    ...(auction as Auction),
    status: getEffectiveAuctionStatus(auction as Auction),
  };

  return { auction: normalizedAuction, bids: (bids as Bid[]) ?? [] };
}

export default async function AuctionPage({ params }: { params: { id: string } }) {
  const data = await getAuction(params.id);
  if (!data) notFound();
  return <AuctionRoom initialAuction={data.auction} initialBids={data.bids} />;
}

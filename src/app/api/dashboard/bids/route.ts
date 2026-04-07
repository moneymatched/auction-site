import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { Auction } from "@/types";

export type BidStatus = "leading" | "outbid" | "won" | "lost";

export interface DashboardBidItem {
  auction: Auction;
  bidStatus: BidStatus;
  myMaxBid: number;        // their proxy max (or highest manual bid)
  currentBid: number;
  topBidderEmail: string | undefined;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // All bids placed by this bidder
  const { data: myBids } = await supabase
    .from("bids")
    .select("auction_id, amount")
    .eq("bidder_email", email);

  if (!myBids?.length) {
    return NextResponse.json({ items: [] });
  }

  const auctionIds = Array.from(new Set(myBids.map((b) => b.auction_id)));

  // Fetch auctions with full property data
  const { data: auctions } = await supabase
    .from("auctions")
    .select(`*, property:properties(*, images:property_images(*))`)
    .in("id", auctionIds);

  // All bids across these auctions (to find top bidder per auction)
  const { data: allBids } = await supabase
    .from("bids")
    .select("auction_id, bidder_email, amount")
    .in("auction_id", auctionIds);

  // Proxy bid max amounts for this bidder
  const { data: proxyBids } = await supabase
    .from("proxy_bids")
    .select("auction_id, max_amount")
    .eq("bidder_email", email)
    .in("auction_id", auctionIds);

  const items: DashboardBidItem[] = auctionIds.map((auctionId) => {
    const auction = (auctions ?? []).find((a) => a.id === auctionId);
    if (!auction) return null;

    const effectiveStatus = getEffectiveAuctionStatus(auction as Auction);
    const enrichedAuction: Auction = { ...(auction as Auction), status: effectiveStatus };

    // Find top bid for this auction
    const bidsForAuction = (allBids ?? [])
      .filter((b) => b.auction_id === auctionId)
      .sort((a, b) => b.amount - a.amount);
    const topBid = bidsForAuction[0];
    const isLeading = topBid?.bidder_email?.toLowerCase() === email;

    // My max bid: prefer proxy bid, fall back to highest manual bid
    const proxyBid = (proxyBids ?? []).find((p) => p.auction_id === auctionId);
    const myHighestManual = Math.max(
      ...(myBids.filter((b) => b.auction_id === auctionId).map((b) => b.amount))
    );
    const myMaxBid = proxyBid?.max_amount ?? myHighestManual;

    let bidStatus: BidStatus;
    if (effectiveStatus === "ended" || effectiveStatus === "cancelled") {
      bidStatus = isLeading ? "won" : "lost";
    } else {
      bidStatus = isLeading ? "leading" : "outbid";
    }

    return {
      auction: enrichedAuction,
      bidStatus,
      myMaxBid,
      currentBid: auction.current_bid,
      topBidderEmail: topBid?.bidder_email,
    } as DashboardBidItem;
  }).filter(Boolean) as DashboardBidItem[];

  // Sort: live first, then upcoming, then ended
  const order: Record<string, number> = { leading: 0, outbid: 1, won: 2, lost: 3 };
  items.sort((a, b) => (order[a.bidStatus] ?? 9) - (order[b.bidStatus] ?? 9));

  return NextResponse.json({ items });
}

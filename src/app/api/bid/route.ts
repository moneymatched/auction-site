import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();

  let body: {
    auction_id: string;
    amount: number;
    bidder_email: string;
    bidder_name?: string;
    bidder_phone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { auction_id, amount, bidder_email, bidder_name = "", bidder_phone = "" } = body;

  // Validate required fields
  if (!auction_id || !amount || !bidder_email) {
    return NextResponse.json({ error: "Auction, amount, and email are required" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
  }

  // Fetch current auction state
  const { data: auction, error: fetchError } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", auction_id)
    .single();

  if (fetchError || !auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }

  const effectiveStatus = getEffectiveAuctionStatus(auction);
  if (effectiveStatus !== "live") {
    return NextResponse.json({ error: "This auction is not currently active" }, { status: 409 });
  }

  // Check auction hasn't ended
  if (new Date(auction.end_time) <= new Date()) {
    return NextResponse.json({ error: "This auction has ended" }, { status: 409 });
  }

  // Validate bid amount
  const minRequired = auction.current_bid > 0
    ? auction.current_bid + auction.min_bid_increment
    : auction.starting_bid;

  if (amount < minRequired) {
    return NextResponse.json(
      { error: `Minimum bid is $${minRequired.toLocaleString()}` },
      { status: 409 }
    );
  }

  // Determine if this bid should trigger auto-extend
  const secondsRemaining = Math.floor(
    (new Date(auction.end_time).getTime() - Date.now()) / 1000
  );
  const shouldExtend = secondsRemaining > 0 && secondsRemaining <= auction.auto_extend_threshold;
  const newEndTime = shouldExtend
    ? new Date(new Date(auction.end_time).getTime() + auction.auto_extend_seconds * 1000).toISOString()
    : auction.end_time;

  // Update auction with optimistic lock on current_bid to prevent race conditions.
  // If another bid was accepted between our read and now, current_bid will have changed
  // and this update will match 0 rows, returning null from maybeSingle().
  const { data: updatedAuction, error: updateError } = await supabase
    .from("auctions")
    .update({
      current_bid: amount,
      bid_count: auction.bid_count + 1,
      end_time: newEndTime,
    })
    .eq("id", auction_id)
    .eq("current_bid", auction.current_bid)
    .select()
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "Failed to update auction" }, { status: 500 });
  }

  if (!updatedAuction) {
    return NextResponse.json(
      { error: "A higher bid was just placed. Please refresh and try again." },
      { status: 409 }
    );
  }

  // Record the bid now that the auction state is confirmed updated
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { error: bidError } = await supabase.from("bids").insert({
    auction_id,
    bidder_name: bidder_name.trim(),
    bidder_email: bidder_email.trim().toLowerCase(),
    bidder_phone: bidder_phone.trim(),
    amount,
    ip_address: ip,
    was_auto_extended: shouldExtend,
  });

  if (bidError) {
    return NextResponse.json({ error: "Failed to record bid" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    auto_extended: shouldExtend,
    new_end_time: newEndTime,
  });
}

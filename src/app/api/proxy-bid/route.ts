import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { resolveProxyBids } from "@/lib/proxy-bid";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();

  let body: {
    auction_id: string;
    max_amount: number;
    bidder_email: string;
    bidder_name?: string;
    bidder_phone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    auction_id,
    max_amount,
    bidder_email,
    bidder_name = "",
    bidder_phone = "",
  } = body;

  if (!auction_id || !max_amount || !bidder_email) {
    return NextResponse.json(
      { error: "Auction, max amount, and email are required" },
      { status: 400 }
    );
  }
  if (typeof max_amount !== "number" || max_amount <= 0) {
    return NextResponse.json({ error: "Invalid max amount" }, { status: 400 });
  }

  // Fetch auction
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
    return NextResponse.json(
      { error: "This auction is not currently active" },
      { status: 409 }
    );
  }

  const minNeeded =
    auction.current_bid > 0
      ? auction.current_bid + auction.min_bid_increment
      : auction.starting_bid;

  if (max_amount < minNeeded) {
    return NextResponse.json(
      { error: `Max bid must be at least ${minNeeded.toLocaleString()}` },
      { status: 409 }
    );
  }

  const normalizedEmail = bidder_email.trim().toLowerCase();

  // Upsert proxy bid (one per bidder per auction — update if they raise their max)
  const { error: upsertError } = await supabase.from("proxy_bids").upsert(
    {
      auction_id,
      bidder_email: normalizedEmail,
      bidder_name: bidder_name.trim(),
      bidder_phone: bidder_phone.trim(),
      max_amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auction_id,bidder_email" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "Failed to save proxy bid" },
      { status: 500 }
    );
  }

  // Immediately place a bid at the minimum needed on behalf of this bidder
  const secondsRemaining = Math.floor(
    (new Date(auction.end_time).getTime() - Date.now()) / 1000
  );
  const shouldExtend =
    secondsRemaining > 0 && secondsRemaining <= auction.auto_extend_threshold;
  const newEndTime = shouldExtend
    ? new Date(
        new Date(auction.end_time).getTime() +
          auction.auto_extend_seconds * 1000
      ).toISOString()
    : auction.end_time;

  const { data: updatedAuction, error: updateError } = await supabase
    .from("auctions")
    .update({
      current_bid: minNeeded,
      bid_count: auction.bid_count + 1,
      end_time: newEndTime,
    })
    .eq("id", auction_id)
    .eq("current_bid", auction.current_bid)
    .select()
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update auction" },
      { status: 500 }
    );
  }

  if (!updatedAuction) {
    return NextResponse.json(
      { error: "A bid was just placed. Please refresh and try again." },
      { status: 409 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await supabase.from("bids").insert({
    auction_id,
    bidder_name: bidder_name.trim(),
    bidder_email: normalizedEmail,
    bidder_phone: bidder_phone.trim(),
    amount: minNeeded,
    ip_address: ip,
    was_auto_extended: shouldExtend,
    is_proxy: true,
  });

  // Let any competing proxy bids respond
  await resolveProxyBids(supabase, auction_id, normalizedEmail);

  return NextResponse.json({
    success: true,
    auto_extended: shouldExtend,
    new_end_time: newEndTime,
  });
}

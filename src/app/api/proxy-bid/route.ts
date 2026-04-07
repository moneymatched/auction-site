import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { resolveProxyBids } from "@/lib/proxy-bid";
import { formatCurrency } from "@/lib/auction-utils";
import { getLeadingBidderEmail, notifyOutbidRecipients } from "@/lib/outbid-email";
import { requireVerifiedBidderForBid } from "@/lib/require-verified-bidder";

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

  const normalizedEmail = bidder_email.trim().toLowerCase();

  const verifiedCheck = await requireVerifiedBidderForBid(supabase, normalizedEmail);
  if (verifiedCheck) return verifiedCheck;

  const { data: othersForFloor } = await supabase
    .from("proxy_bids")
    .select("max_amount")
    .eq("auction_id", auction_id)
    .neq("bidder_email", normalizedEmail);

  const topOtherMax =
    othersForFloor && othersForFloor.length > 0
      ? Math.max(...othersForFloor.map((p) => p.max_amount))
      : 0;

  const canMatchLeaderCeiling =
    topOtherMax > 0 && max_amount >= topOtherMax;

  if (auction.current_bid > 0 && max_amount < auction.current_bid) {
    return NextResponse.json(
      {
        error: `Max bid must be at least the current bid (${formatCurrency(auction.current_bid)})`,
      },
      { status: 409 }
    );
  }

  if (max_amount < minNeeded && !canMatchLeaderCeiling) {
    return NextResponse.json(
      { error: `Max bid must be at least ${minNeeded.toLocaleString()}` },
      { status: 409 }
    );
  }

  // Reject if the bidder is trying to lower their existing max
  const { data: existingProxy } = await supabase
    .from("proxy_bids")
    .select("max_amount")
    .eq("auction_id", auction_id)
    .eq("bidder_email", normalizedEmail)
    .maybeSingle();

  if (existingProxy && max_amount < existingProxy.max_amount) {
    return NextResponse.json(
      { error: `Your current max bid is ${formatCurrency(existingProxy.max_amount)}. You cannot lower it.` },
      { status: 409 }
    );
  }

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

  // If this bidder is already the current leader, just raising their max —
  // no new bid needed. The proxy will fire automatically if someone outbids them.
  const { data: topBid } = await supabase
    .from("bids")
    .select("bidder_email")
    .eq("auction_id", auction_id)
    .order("amount", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topBid?.bidder_email === normalizedEmail) {
    return NextResponse.json({
      success: true,
      auto_extended: false,
      new_end_time: auction.end_time,
    });
  }

  const prevLead = await getLeadingBidderEmail(supabase, auction_id);
  let tieOutbidRecipient: string | null = null;

  // Fetch all proxies to determine who wins and at what price
  const { data: allProxies } = await supabase
    .from("proxy_bids")
    .select("*")
    .eq("auction_id", auction_id)
    .order("max_amount", { ascending: false });

  // Highest other proxy (same ordering as resolveProxyBids — max_amount desc)
  const competing = allProxies?.find(
    (p) => p.bidder_email !== normalizedEmail
  );

  // Determine who places the first bid and at what amount:
  // - No competition → this bidder bids at minimum
  // - This bidder's max wins → jump straight to equilibrium (skip the minNeeded step)
  // - This bidder's max loses or ties → bid at minimum, then let resolveProxyBids counter
  // - Tie at shared max when current_bid + increment exceeds that max → resolve only (no illegal bid)
  let bidAmount: number;
  let bidEmail: string;
  let bidName: string;
  let bidPhone: string;
  let needsResolution = false;
  let resolveOnly = false;

  if (!competing) {
    bidAmount = minNeeded;
    bidEmail = normalizedEmail;
    bidName = bidder_name.trim();
    bidPhone = bidder_phone.trim();
  } else if (max_amount > competing.max_amount) {
    // This proxy wins — place one bid at the equilibrium price
    bidAmount = Math.min(competing.max_amount + auction.min_bid_increment, max_amount);
    bidEmail = normalizedEmail;
    bidName = bidder_name.trim();
    bidPhone = bidder_phone.trim();
  } else if (max_amount === competing.max_amount) {
    // Tie — incumbent (competing) wins at the shared max directly; no resolveProxyBids needed
    bidAmount = competing.max_amount;
    bidEmail = competing.bidder_email;
    bidName = competing.bidder_name;
    bidPhone = competing.bidder_phone;
  } else if (max_amount >= minNeeded) {
    // This proxy loses — enter at minimum, then resolveProxyBids counters
    bidAmount = minNeeded;
    bidEmail = normalizedEmail;
    bidName = bidder_name.trim();
    bidPhone = bidder_phone.trim();
    needsResolution = true;
  } else {
    // max_amount matches leader ceiling but is below minNeeded — cannot place minNeeded bid
    resolveOnly = true;
    needsResolution = true;
    bidAmount = minNeeded; // unused when resolveOnly; satisfies definite assignment
    bidEmail = normalizedEmail;
    bidName = bidder_name.trim();
    bidPhone = bidder_phone.trim();
  }

  // Auto-extend check
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

  let updatedAuction = auction;

  if (!resolveOnly) {
    const { data: updated, error: updateError } = await supabase
      .from("auctions")
      .update({
        current_bid: bidAmount,
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

    if (!updated) {
      return NextResponse.json(
        { error: "A bid was just placed. Please refresh and try again." },
        { status: 409 }
      );
    }

    updatedAuction = updated;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await supabase.from("bids").insert({
      auction_id,
      bidder_name: bidName,
      bidder_email: bidEmail,
      bidder_phone: bidPhone,
      amount: bidAmount,
      ip_address: ip,
      was_auto_extended: shouldExtend,
      is_proxy: true,
    });

    if (max_amount === competing?.max_amount && bidEmail === competing?.bidder_email) {
      tieOutbidRecipient = normalizedEmail;
    }
  }

  // Only resolve if this proxy lost — let the competing proxy counter
  let resolveOutbid: string[] = [];
  if (needsResolution) {
    resolveOutbid = await resolveProxyBids(supabase, auction_id, normalizedEmail);
  }

  const { data: finalAuction } = await supabase
    .from("auctions")
    .select("end_time, current_bid")
    .eq("id", auction_id)
    .single();

  const endTime = finalAuction?.end_time ?? updatedAuction.end_time;
  const autoExtended =
    Boolean(finalAuction) &&
    new Date(endTime).getTime() !== new Date(auction.end_time).getTime();

  const finalLead = await getLeadingBidderEmail(supabase, auction_id);
  const recipients = new Set<string>();
  const pe = prevLead?.bidder_email?.toLowerCase();
  const fe = finalLead?.bidder_email?.toLowerCase();
  if (pe && fe && pe !== fe) recipients.add(pe);
  for (const e of resolveOutbid) recipients.add(e.toLowerCase());
  if (tieOutbidRecipient) recipients.add(tieOutbidRecipient.toLowerCase());

  const finalBid = finalAuction?.current_bid ?? updatedAuction.current_bid;
  await notifyOutbidRecipients(supabase, auction_id, recipients, finalBid);

  return NextResponse.json({
    success: true,
    auto_extended: autoExtended,
    new_end_time: endTime,
  });
}

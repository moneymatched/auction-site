import { SupabaseClient } from "@supabase/supabase-js";

/**
 * After a bid is placed, resolve proxy bid competition in one pass by jumping
 * directly to the equilibrium price rather than stepping one increment at a time.
 *
 * Rules:
 * - The proxy with the highest max wins.
 * - The winning price is min(loser.max + increment, winner.max).
 * - On a tie, the current top bidder (justBidEmail) wins — no action needed.
 * - If justBidEmail has no proxy (manual bidder), they count as bidding at current_bid.
 *
 * @param justBidEmail - email of the person whose bid just landed
 */
export async function resolveProxyBids(
  supabase: SupabaseClient,
  auctionId: string,
  justBidEmail: string
): Promise<void> {
  const { data: auction } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", auctionId)
    .single();

  if (!auction || new Date(auction.end_time) <= new Date()) return;

  const increment = auction.min_bid_increment;
  const currentBid = auction.current_bid;
  const minNeeded = currentBid + increment;

  // All proxy bids for this auction, highest max first
  const { data: proxies } = await supabase
    .from("proxy_bids")
    .select("*")
    .eq("auction_id", auctionId)
    .order("max_amount", { ascending: false });

  if (!proxies || proxies.length === 0) return;

  const justBidProxy = proxies.find((p) => p.bidder_email === justBidEmail);
  const justBidMax = justBidProxy?.max_amount ?? currentBid;

  // Best competing proxy that can afford the next increment
  const competing = proxies.find(
    (p) => p.bidder_email !== justBidEmail && p.max_amount >= minNeeded
  );

  if (!competing) return;

  let winner: typeof competing;
  let winningAmount: number;

  if (competing.max_amount > justBidMax) {
    // Competing proxy outbids — they win at just above justBid's max
    winner = competing;
    winningAmount = Math.min(justBidMax + increment, competing.max_amount);
  } else if (justBidMax > competing.max_amount) {
    // justBid proxy wins — jump to just above competing's max
    if (!justBidProxy) return; // manual bidder wins, nothing to do
    winner = justBidProxy;
    winningAmount = Math.min(competing.max_amount + increment, justBidProxy.max_amount);
  } else {
    // Tie — current top bidder (justBidEmail) wins, no action needed
    return;
  }

  if (winningAmount <= currentBid) return;

  // Auto-extend check
  const secondsRemaining = Math.floor(
    (new Date(auction.end_time).getTime() - Date.now()) / 1000
  );
  const shouldExtend =
    secondsRemaining > 0 && secondsRemaining <= auction.auto_extend_threshold;
  const newEndTime = shouldExtend
    ? new Date(
        new Date(auction.end_time).getTime() + auction.auto_extend_seconds * 1000
      ).toISOString()
    : auction.end_time;

  // Optimistic-lock update — bail if a concurrent bid snuck in
  const { data: updated } = await supabase
    .from("auctions")
    .update({
      current_bid: winningAmount,
      bid_count: auction.bid_count + 1,
      end_time: newEndTime,
    })
    .eq("id", auctionId)
    .eq("current_bid", currentBid)
    .select()
    .maybeSingle();

  if (!updated) return;

  await supabase.from("bids").insert({
    auction_id: auctionId,
    bidder_name: winner.bidder_name,
    bidder_email: winner.bidder_email,
    bidder_phone: winner.bidder_phone,
    amount: winningAmount,
    was_auto_extended: shouldExtend,
    is_proxy: true,
  });
}

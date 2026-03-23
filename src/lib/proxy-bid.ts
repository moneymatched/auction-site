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

  // All proxy bids for this auction, highest max first
  const { data: proxies } = await supabase
    .from("proxy_bids")
    .select("*")
    .eq("auction_id", auctionId)
    .order("max_amount", { ascending: false });

  if (!proxies || proxies.length === 0) return;

  const justBidProxy = proxies.find((p) => p.bidder_email === justBidEmail);
  const justBidMax = justBidProxy?.max_amount ?? currentBid;

  // Highest other proxy (sorted by max_amount desc). Do not require max >= minNeeded:
  // when both ceilings equal M and current_bid is below M but current_bid + increment > M,
  // nobody can pay minNeeded yet the price must still jump to M.
  const competing = proxies.find((p) => p.bidder_email !== justBidEmail);

  if (!competing) return;

  let winner: typeof competing;
  let winningAmount: number;

  if (competing.max_amount >= justBidMax) {
    // Competing proxy wins outright, OR ties (incumbent wins ties).
    // Second price = max(justBidMax, next-highest proxy below competing).
    // This handles 3+ proxy bidders correctly — e.g. A ($750k) beats both
    // B ($550k proxy) and C ($600k proxy): A wins at $600,100, not $550,100.
    // Tie example: both at $10k → secondPrice = justBidMax = $10k →
    //   winningAmount = min($10,100, $10,000) = $10,000 (competing wins at shared max).
    const secondProxy = proxies.find(
      (p) => p.bidder_email !== justBidEmail && p.bidder_email !== competing.bidder_email
    );
    const secondPrice = Math.max(justBidMax, secondProxy?.max_amount ?? 0);
    winner = competing;
    winningAmount = Math.min(secondPrice + increment, competing.max_amount);
  } else {
    // justBid proxy wins — jump to just above competing's max.
    // competing is already the highest other proxy, so this is the correct second price.
    if (!justBidProxy) return; // manual bidder wins, nothing to do
    winner = justBidProxy;
    winningAmount = Math.min(competing.max_amount + increment, justBidProxy.max_amount);
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

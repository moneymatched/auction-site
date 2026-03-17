import { SupabaseClient } from "@supabase/supabase-js";

/**
 * After a bid is placed, check if any competing proxy bids can counter.
 * Loops until the auction is stable (no proxy bid can respond).
 *
 * @param skipEmail - the email of the bidder who just bid (don't let them auto-counter themselves)
 */
export async function resolveProxyBids(
  supabase: SupabaseClient,
  auctionId: string,
  skipEmail: string
): Promise<void> {
  for (let i = 0; i < 20; i++) {
    // Fetch latest auction state
    const { data: auction } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (!auction || new Date(auction.end_time) <= new Date()) break;

    const minNeeded =
      auction.current_bid > 0
        ? auction.current_bid + auction.min_bid_increment
        : auction.starting_bid;

    // Find the highest proxy bid that can counter (excluding the current top bidder)
    const { data: proxies } = await supabase
      .from("proxy_bids")
      .select("*")
      .eq("auction_id", auctionId)
      .neq("bidder_email", skipEmail.toLowerCase())
      .gte("max_amount", minNeeded)
      .order("max_amount", { ascending: false })
      .limit(1);

    if (!proxies || proxies.length === 0) break;

    const proxy = proxies[0];

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

    // Optimistic-lock update — bail if another bid snuck in
    const { data: updated } = await supabase
      .from("auctions")
      .update({
        current_bid: minNeeded,
        bid_count: auction.bid_count + 1,
        end_time: newEndTime,
      })
      .eq("id", auctionId)
      .eq("current_bid", auction.current_bid)
      .select()
      .maybeSingle();

    if (!updated) break;

    await supabase.from("bids").insert({
      auction_id: auctionId,
      bidder_name: proxy.bidder_name,
      bidder_email: proxy.bidder_email,
      bidder_phone: proxy.bidder_phone,
      amount: minNeeded,
      was_auto_extended: shouldExtend,
      is_proxy: true,
    });

    // Next iteration: skip this proxy's email so the loop looks for a counter from others
    skipEmail = proxy.bidder_email;
  }
}

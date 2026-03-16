import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import Link from "next/link";
import { formatCurrency } from "@/lib/auction-utils";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { Plus, Building2, Gavel, TrendingUp, ArrowRight } from "lucide-react";

async function getDashboardStats() {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();

  const [{ count: propertyCount }, { count: auctionCount }, { data: allAuctions }, { data: recentBids }] =
    await Promise.all([
      supabase.from("properties").select("*", { count: "exact", head: true }),
      supabase.from("auctions").select("*", { count: "exact", head: true }),
      supabase.from("auctions").select("id, status, start_time, end_time, current_bid, bid_count, property:properties(title)"),
      supabase.from("bids").select("*").order("placed_at", { ascending: false }).limit(10),
    ]);

  const liveAuctions = ((allAuctions ?? []) as unknown as Array<{
    id: string;
    status: "upcoming" | "live" | "ended" | "cancelled";
    start_time: string;
    end_time: string;
    current_bid: number;
    bid_count: number;
    property: { title: string } | Array<{ title: string }>;
  }>).filter((auction) => getEffectiveAuctionStatus(auction) === "live");

  return { propertyCount, auctionCount, liveAuctions, recentBids };
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { propertyCount, auctionCount, liveAuctions, recentBids } = await getDashboardStats();

  const live = (liveAuctions ?? []).map((auction) => {
    const propertyTitle = Array.isArray(auction.property)
      ? (auction.property[0]?.title ?? "—")
      : (auction.property?.title ?? "—");

    return {
      id: auction.id,
      current_bid: auction.current_bid,
      bid_count: auction.bid_count,
      property: { title: propertyTitle },
    };
  });
  const bids = (recentBids ?? []) as Array<{ id: string; bidder_name: string | null; bidder_email: string; amount: number; placed_at: string; auction_id: string }>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/admin/auctions/new" className="btn-primary text-sm">
            <Plus size={16} />
            List Property for Auction
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Properties", value: propertyCount ?? 0, icon: Building2, href: "/admin/properties" },
          { label: "Total Auctions", value: auctionCount ?? 0, icon: Gavel, href: "/admin/auctions" },
          { label: "Live Now", value: live.length, icon: TrendingUp, href: "/admin/auctions", accent: live.length > 0 },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={18} className={stat.accent ? "text-emerald-600" : "text-stone-400"} />
              <ArrowRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </div>
            <p className={`text-3xl font-semibold mb-1 ${stat.accent ? "text-emerald-600" : "text-stone-900"}`}>
              {stat.value}
            </p>
            <p className="text-xs text-stone-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live auctions */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">Live Auctions</h2>
            <Link href="/admin/auctions" className="text-xs text-stone-400 hover:text-stone-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {live.length === 0 ? (
              <p className="p-5 text-sm text-stone-400">No live auctions.</p>
            ) : (
              live.map((a) => (
                <Link key={a.id} href={`/admin/auctions/${a.id}`} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{a.property.title}</p>
                    <p className="text-xs text-stone-400">{a.bid_count} bids</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(a.current_bid)}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent bids */}
        <div className="card">
          <div className="p-5 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">Recent Bids</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {bids.length === 0 ? (
              <p className="p-5 text-sm text-stone-400">No bids yet.</p>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{bid.bidder_name || bid.bidder_email}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(bid.placed_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-700">{formatCurrency(bid.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

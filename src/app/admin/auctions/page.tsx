import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction } from "@/types";
import Link from "next/link";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/auction-utils";
import { Plus, Gavel, Radio } from "lucide-react";
import DeleteButton from "@/components/admin/DeleteButton";

async function getAuctions(): Promise<Auction[]> {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("auctions")
    .select("*, property:properties(title)")
    .order("end_time", { ascending: true });
  return (data as Auction[]) ?? [];
}

export const dynamic = "force-dynamic";

function AuctionRow({ auction }: { auction: Auction }) {
  const property = auction.property as unknown as { title: string } | undefined;
  return (
    <div className="flex items-center gap-2 pr-4 hover:bg-stone-50 transition-colors">
      <Link
        href={`/admin/auctions/${auction.id}`}
        className="flex items-center justify-between flex-1 min-w-0 p-4"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900 text-sm">{property?.title ?? "—"}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className={`status-badge text-xs ${getStatusColor(auction.status)}`}>
              {auction.status === "live" && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {getStatusLabel(auction.status)}
            </span>
            <span className="text-xs text-stone-400">
              {auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-stone-400">
              Ends {new Date(auction.end_time).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-sm font-semibold text-stone-900">
            {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
          </p>
          <p className="text-xs text-stone-400">
            {auction.current_bid > 0 ? "current" : "starting"}
          </p>
        </div>
      </Link>
      <DeleteButton endpoint={`/api/auctions/${auction.id}`} />
    </div>
  );
}

function AuctionGroup({ title, auctions, accent }: { title: string; auctions: Auction[]; accent?: boolean }) {
  if (auctions.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        {accent && <Radio size={13} className="text-emerald-500" />}
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</h2>
        <span className="text-xs text-stone-400">({auctions.length})</span>
      </div>
      <div className="card divide-y divide-stone-100">
        {auctions.map((a) => <AuctionRow key={a.id} auction={a} />)}
      </div>
    </div>
  );
}

export default async function AdminAuctionsPage() {
  const auctions = await getAuctions();

  const live = auctions.filter((a) => a.status === "live");
  const upcoming = auctions.filter((a) => a.status === "upcoming");
  const ended = auctions.filter((a) => a.status === "ended" || a.status === "cancelled");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Auctions</h1>
        <Link href="/admin/auctions/new" className="btn-primary text-sm">
          <Plus size={16} />
          New Auction
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="card p-12 text-center">
          <Gavel size={36} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500 mb-4">No auctions yet.</p>
          <Link href="/admin/auctions/new" className="btn-primary">
            <Plus size={16} />
            Create First Auction
          </Link>
        </div>
      ) : (
        <>
          <AuctionGroup title="Live Now" auctions={live} accent />
          <AuctionGroup title="Upcoming" auctions={upcoming} />
          <AuctionGroup title="Ended / Cancelled" auctions={ended} />
        </>
      )}
    </div>
  );
}

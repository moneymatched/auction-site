import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction } from "@/types";
import Link from "next/link";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/auction-utils";
import { Plus, Gavel } from "lucide-react";

async function getAuctions(): Promise<Auction[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("auctions")
    .select("*, property:properties(title)")
    .order("created_at", { ascending: false });
  return (data as Auction[]) ?? [];
}

export const dynamic = "force-dynamic";

export default async function AdminAuctionsPage() {
  const auctions = await getAuctions();

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
        <div className="card divide-y divide-stone-100">
          {auctions.map((auction) => (
            <Link
              key={auction.id}
              href={`/admin/auctions/${auction.id}`}
              className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 text-sm">
                  {(auction.property as unknown as { title: string })?.title ?? "—"}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`status-badge text-xs ${getStatusColor(auction.status)}`}>
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
          ))}
        </div>
      )}
    </div>
  );
}

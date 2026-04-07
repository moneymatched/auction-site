"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Auction, AuctionStatus } from "@/types";
import AuctionCard from "@/components/AuctionCard";
import BidForm from "@/components/BidForm";
import PropertyMap from "@/components/PropertyMap";
import { LayoutGrid, Map, Gavel, CheckCircle2 } from "lucide-react";

type BidStatus = "leading" | "outbid" | "won" | "lost";

type FilterType = "all" | AuctionStatus;

interface AuctionsClientProps {
  initialAuctions: Auction[];
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Ended", value: "ended" },
];

export default function AuctionsClient({ initialAuctions }: AuctionsClientProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"grid" | "map">(
    searchParams.get("view") === "map" ? "map" : "grid"
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [bidAuction, setBidAuction] = useState<Auction | null>(null);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bidStatuses, setBidStatuses] = useState<Record<string, BidStatus>>({});
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [bidderEmail, setBidderEmail] = useState<string | null>(null);

  // Fetch bid statuses + watchlist for logged-in bidder
  useEffect(() => {
    try {
      const raw = localStorage.getItem("auction_bidder");
      if (!raw) return;
      const bidder = JSON.parse(raw);
      if (!bidder?.email || !bidder?.email_verified_at) return;
      const email = bidder.email;
      setBidderEmail(email);

      // Fetch bids and watchlist in parallel
      Promise.all([
        fetch(`/api/dashboard/bids?email=${encodeURIComponent(email)}`).then((r) => r.json()),
        fetch(`/api/watchlist?email=${encodeURIComponent(email)}`).then((r) => r.json()),
      ]).then(([bidsData, watchData]) => {
        const map: Record<string, BidStatus> = {};
        for (const item of bidsData.items ?? []) {
          map[item.auction.id] = item.bidStatus;
        }
        setBidStatuses(map);

        const ids = new Set<string>(
          (watchData.auctions ?? []).map((a: { id: string }) => a.id)
        );
        setWatchedIds(ids);
      }).catch(() => {});
    } catch {}
  }, []);

  const handleBidSuccess = useCallback(() => {
    setBidAuction(null);
    setBidSuccess(true);
    setTimeout(() => setBidSuccess(false), 5000);
    // Refresh bid statuses
    try {
      const raw = localStorage.getItem("auction_bidder");
      if (!raw) return;
      const bidder = JSON.parse(raw);
      if (!bidder?.email) return;
      fetch(`/api/dashboard/bids?email=${encodeURIComponent(bidder.email)}`)
        .then((r) => r.json())
        .then((data) => {
          const map: Record<string, BidStatus> = {};
          for (const item of data.items ?? []) {
            map[item.auction.id] = item.bidStatus;
          }
          setBidStatuses(map);
        })
        .catch(() => {});
    } catch {}
  }, []);

  const toggleWatch = useCallback(
    async (auctionId: string) => {
      if (!bidderEmail) return;
      const wasWatched = watchedIds.has(auctionId);
      // Optimistic update
      setWatchedIds((prev) => {
        const next = new Set(prev);
        if (wasWatched) next.delete(auctionId);
        else next.add(auctionId);
        return next;
      });
      try {
        if (wasWatched) {
          await fetch(
            `/api/watchlist?email=${encodeURIComponent(bidderEmail)}&auction_id=${auctionId}`,
            { method: "DELETE" }
          );
        } else {
          await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: bidderEmail, auction_id: auctionId }),
          });
        }
      } catch {
        // Revert on failure
        setWatchedIds((prev) => {
          const next = new Set(prev);
          if (wasWatched) next.add(auctionId);
          else next.delete(auctionId);
          return next;
        });
      }
    },
    [bidderEmail, watchedIds]
  );

  const filtered =
    filter === "all"
      ? initialAuctions
      : initialAuctions.filter((a) => a.status === filter);

  const liveCount = initialAuctions.filter((a) => a.status === "live").length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Auctions</h1>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-600 font-medium">
                {liveCount} live auction{liveCount !== 1 ? "s" : ""} now
              </span>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 rounded-sm p-1">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm transition-colors ${
                view === "grid"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <LayoutGrid size={15} />
              Grid
            </button>
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm transition-colors ${
                view === "map"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <Map size={15} />
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count =
            f.value === "all"
              ? initialAuctions.length
              : initialAuctions.filter((a) => a.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                filter === f.value
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
              }`}
            >
              {f.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === f.value ? "bg-white/20" : "bg-stone-100"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {view === "map" ? (
        <div className="rounded-sm overflow-hidden border border-stone-200" style={{ height: 600 }}>
          <PropertyMap auctions={filtered} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Gavel size={40} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500">No auctions found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              onBid={setBidAuction}
              bidStatus={bidStatuses[auction.id]}
              isWatched={watchedIds.has(auction.id)}
              onToggleWatch={bidderEmail ? toggleWatch : undefined}
            />
          ))}
        </div>
      )}

      {/* Bid success banner */}
      {bidSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white text-sm font-medium rounded-sm shadow-lg animate-slide-up">
          <CheckCircle2 size={16} />
          Bid placed successfully!
        </div>
      )}

      {/* Bid form modal */}
      {bidAuction && (
        <BidForm
          auction={bidAuction}
          onSuccess={handleBidSuccess}
          onClose={() => setBidAuction(null)}
        />
      )}
    </main>
  );
}

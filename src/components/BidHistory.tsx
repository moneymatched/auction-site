"use client";

import { Bid } from "@/types";
import { formatCurrency } from "@/lib/auction-utils";
import { Clock } from "lucide-react";

interface BidHistoryProps {
  bids: Bid[];
}

function maskBidder(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    return parts
      .map((part, i) =>
        i === 0
          ? part.charAt(0).toUpperCase() + "*".repeat(Math.max(part.length - 1, 1))
          : part.charAt(0).toUpperCase() + "."
      )
      .join(" ");
  }
  const prefix = email.split("@")[0] ?? "?";
  return prefix.charAt(0).toUpperCase() + "*".repeat(Math.max(prefix.length - 1, 1));
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function BidHistory({ bids }: BidHistoryProps) {
  if (bids.length === 0) {
    return (
      <div className="py-8 text-center text-stone-400 text-sm">
        No bids yet. Be the first to bid!
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-100">
      {bids.map((bid, idx) => (
        <div
          key={bid.id}
          className={`flex items-center justify-between py-3 ${
            idx === 0 ? "bg-emerald-50/50" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                idx === 0
                  ? "bg-emerald-600 text-white"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {maskBidder(bid.bidder_name, bid.bidder_email).charAt(0)}
            </div>
            <div>
              <p className={`text-sm font-medium ${idx === 0 ? "text-emerald-700" : "text-stone-700"}`}>
                {maskBidder(bid.bidder_name, bid.bidder_email)}
                {idx === 0 && <span className="ml-2 text-xs font-normal text-emerald-600">Winning</span>}
              </p>
              <div className="flex items-center gap-1 text-xs text-stone-400">
                <Clock size={11} />
                <span>{timeAgo(bid.placed_at)}</span>
                {bid.was_auto_extended && (
                  <span className="ml-1 text-amber-600">· Extended timer</span>
                )}
              </div>
            </div>
          </div>
          <span className={`text-sm font-semibold ${idx === 0 ? "text-emerald-700" : "text-stone-700"}`}>
            {formatCurrency(bid.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

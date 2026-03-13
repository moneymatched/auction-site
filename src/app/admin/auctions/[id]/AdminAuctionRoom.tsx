"use client";

import { useState, useEffect } from "react";
import { Auction, Bid, Property } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/auction-utils";
import CountdownTimer from "@/components/CountdownTimer";
import AuctionForm from "../AuctionForm";
import {
  Download,
  Radio,
  Square,
  Plus,
  Clock,
  Trophy,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AdminAuctionRoomProps {
  auction: Auction;
  bids: Bid[];
  properties: Property[];
}

export default function AdminAuctionRoom({ auction: initialAuction, bids: initialBids, properties }: AdminAuctionRoomProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [bids, setBids] = useState(initialBids);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`admin-auction:${auction.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${auction.id}` },
        (payload) => setAuction((prev) => ({ ...prev, ...(payload.new as Auction) }))
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${auction.id}` },
        (payload) => setBids((prev) => [payload.new as Bid, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [auction.id]);

  async function updateStatus(status: string) {
    setSaving(true);
    const res = await fetch(`/api/auctions/${auction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setAuction((prev) => ({ ...prev, status: status as Auction["status"] }));
    setSaving(false);
  }

  async function extendTime(extraSeconds: number) {
    setSaving(true);
    const newEnd = new Date(new Date(auction.end_time).getTime() + extraSeconds * 1000).toISOString();
    const res = await fetch(`/api/auctions/${auction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_time: newEnd }),
    });
    if (res.ok) setAuction((prev) => ({ ...prev, end_time: newEnd }));
    setSaving(false);
  }

  function exportCSV() {
    const header = "Bidder Name,Email,Phone,Amount,Time,Extended Timer\n";
    const rows = [...bids]
      .reverse()
      .map((b) =>
        [b.bidder_name, b.bidder_email, b.bidder_phone, b.amount, b.placed_at, b.was_auto_extended ? "Yes" : "No"]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bids-${auction.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const winner = bids[0];
  const property = auction.property!;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{property.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`status-badge ${getStatusColor(auction.status)}`}>
              {auction.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {getStatusLabel(auction.status)}
            </span>
            <span className="text-sm text-stone-400">{auction.bid_count} bids</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/auctions/${auction.id}`} target="_blank" className="btn-ghost text-sm">
            <Eye size={14} />
            Public View
          </a>
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Control panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current bid */}
        <div className="card p-5">
          <p className="text-xs text-stone-400 mb-1">Current Bid</p>
          <p className="text-2xl font-semibold text-stone-900">
            {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
          </p>
        </div>

        {/* Timer */}
        <div className="card p-5">
          <p className="text-xs text-stone-400 mb-2">Time Remaining</p>
          <CountdownTimer endTime={auction.end_time} status={auction.status} size="md" />
        </div>

        {/* Actions */}
        <div className="card p-5 space-y-2">
          <p className="text-xs text-stone-400 mb-1">Controls</p>
          {auction.status !== "live" && (
            <button
              onClick={() => updateStatus("live")}
              disabled={saving}
              className="btn-primary w-full text-sm bg-emerald-600 hover:bg-emerald-700"
            >
              <Radio size={14} />
              Go Live
            </button>
          )}
          {auction.status === "live" && (
            <button
              onClick={() => confirm("End this auction?") && updateStatus("ended")}
              disabled={saving}
              className="btn-secondary w-full text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              <Square size={14} />
              End Auction
            </button>
          )}
          <div className="flex gap-2">
            {[5, 10, 30].map((min) => (
              <button
                key={min}
                onClick={() => extendTime(min * 60)}
                disabled={saving}
                className="btn-ghost text-xs flex-1"
              >
                <Plus size={11} />+{min}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Winner highlight */}
      {winner && (auction.status === "ended" || auction.status === "live") && (
        <div className={`card p-5 ${auction.status === "ended" ? "border-emerald-200 bg-emerald-50" : "border-stone-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className={auction.status === "ended" ? "text-emerald-600" : "text-stone-400"} />
            <h2 className="text-sm font-semibold text-stone-900">
              {auction.status === "ended" ? "Winner" : "Highest Bidder"}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {winner.bidder_name && (
              <div>
                <p className="text-xs text-stone-400">Name</p>
                <p className="text-sm font-medium text-stone-900">{winner.bidder_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-400">Email</p>
              <p className="text-sm font-medium text-stone-900">{winner.bidder_email}</p>
            </div>
            {winner.bidder_phone && (
              <div>
                <p className="text-xs text-stone-400">Phone</p>
                <p className="text-sm font-medium text-stone-900">{winner.bidder_phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-400">Winning Bid</p>
              <p className="text-sm font-semibold text-emerald-700">{formatCurrency(winner.amount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bid history */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">
            All Bids <span className="text-stone-400 font-normal">({bids.length})</span>
          </h2>
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <Clock size={12} />
            Live updates
          </div>
        </div>

        {bids.length === 0 ? (
          <p className="p-5 text-sm text-stone-400">No bids yet.</p>
        ) : (
          <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
            {bids.map((bid, idx) => (
              <div
                key={bid.id}
                className={`grid grid-cols-5 gap-3 px-5 py-3 text-sm ${idx === 0 ? "bg-emerald-50/50" : ""}`}
              >
                <div className="col-span-2">
                  <p className={`font-medium ${idx === 0 ? "text-emerald-700" : "text-stone-800"}`}>
                    {bid.bidder_name || bid.bidder_email}
                    {idx === 0 && <span className="ml-1 text-xs text-emerald-500">★</span>}
                  </p>
                  {bid.bidder_name && <p className="text-xs text-stone-400">{bid.bidder_email}</p>}
                  {bid.bidder_phone && <p className="text-xs text-stone-400">{bid.bidder_phone}</p>}
                </div>
                <div>
                  <p className={`font-semibold ${idx === 0 ? "text-emerald-700" : "text-stone-700"}`}>
                    {formatCurrency(bid.amount)}
                  </p>
                </div>
                <div className="text-xs text-stone-400 col-span-2">
                  <p>{new Date(bid.placed_at).toLocaleString()}</p>
                  {bid.was_auto_extended && (
                    <p className="text-amber-600">Extended timer</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit auction section */}
      <div className="card">
        <button
          onClick={() => setShowEdit(!showEdit)}
          className="w-full flex items-center justify-between p-5 text-sm font-semibold text-stone-900 hover:bg-stone-50 transition-colors"
        >
          Edit Auction Settings
          {showEdit ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showEdit && (
          <div className="p-5 border-t border-stone-100">
            <AuctionForm properties={properties} auction={auction} />
          </div>
        )}
      </div>
    </div>
  );
}

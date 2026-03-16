"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Auction, Property } from "@/types";
import AuctionForm from "@/app/admin/auctions/AuctionForm";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/auction-utils";
import { Loader2, Plus, ExternalLink, Gavel } from "lucide-react";

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface AuctionPanelProps {
  property: Property;
  auction: Auction | null;
}

export default function AuctionPanel({ property, auction }: AuctionPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    start_time: toLocalDatetimeValue(tomorrow),
    end_time: toLocalDatetimeValue(dayAfter),
    starting_bid: "1000",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          status: "upcoming",
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          starting_bid: parseFloat(form.starting_bid) || 1000,
          min_bid_increment: 100,
          auto_extend_seconds: 300,
          auto_extend_threshold: 300,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create auction");
        setLoading(false);
        return;
      }

      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  // No auction yet
  if (!auction) {
    return (
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Gavel size={15} className="text-stone-400" />
          Auction
        </h2>

        {!showForm ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-stone-400">This property has not been listed for auction yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              <Plus size={14} />
              List for Auction
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setField("start_time", e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Close Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setField("end_time", e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Starting Bid ($) *</label>
              <input
                type="number"
                value={form.starting_bid}
                onChange={(e) => setField("starting_bid", e.target.value)}
                className="input-field"
                min="1"
                step="1"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary text-sm">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Auction"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // Auction exists — show summary + full editable form
  return (
    <div className="card p-6 space-y-4">
      <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Gavel size={15} className="text-stone-400" />
          Auction
        </h2>
        <a
          href={`/admin/auctions/${auction.id}`}
          className="btn-ghost text-xs"
        >
          <ExternalLink size={13} />
          Open Auction Room
        </a>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-stone-50 rounded-sm border border-stone-100 text-sm">
        <span className={`status-badge ${getStatusColor(auction.status)}`}>
          {auction.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          {getStatusLabel(auction.status)}
        </span>
        <span className="text-stone-700 font-medium">
          {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
          <span className="text-stone-400 font-normal ml-1">
            {auction.current_bid > 0 ? "current bid" : "starting bid"}
          </span>
        </span>
        <span className="text-stone-400 text-xs">{auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}</span>
        <span className="text-stone-400 text-xs">Ends {new Date(auction.end_time).toLocaleDateString()}</span>
      </div>

      {/* Full editable auction form */}
      <AuctionForm
        properties={[property]}
        auction={auction}
        redirectTo={`/admin/properties/${property.id}`}
      />
    </div>
  );
}

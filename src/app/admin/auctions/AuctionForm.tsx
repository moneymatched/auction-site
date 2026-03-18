"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Auction, Property } from "@/types";
import { Loader2, Save, Info } from "lucide-react";

interface AuctionFormProps {
  properties: Property[];
  auction?: Auction;
  redirectTo?: string;
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(localDatetime: string): string {
  return new Date(localDatetime).toISOString();
}

export default function AuctionForm({ properties, auction, redirectTo }: AuctionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    property_id: auction?.property_id ?? (properties[0]?.id ?? ""),
    status: auction?.status ?? "upcoming",
    start_time: auction ? toLocalDatetimeValue(auction.start_time) : toLocalDatetimeValue(tomorrow.toISOString()),
    end_time: auction ? toLocalDatetimeValue(auction.end_time) : toLocalDatetimeValue(dayAfter.toISOString()),
    starting_bid: auction?.starting_bid?.toString() ?? "1000",
    reserve_price: auction?.reserve_price?.toString() ?? "",
    min_bid_increment: auction?.min_bid_increment?.toString() ?? "100",
    auto_extend_seconds: auction?.auto_extend_seconds?.toString() ?? "300",
    auto_extend_threshold: auction?.auto_extend_threshold?.toString() ?? "300",
    notes: auction?.notes ?? "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      property_id: form.property_id,
      status: form.status,
      start_time: toISO(form.start_time),
      end_time: toISO(form.end_time),
      starting_bid: parseFloat(form.starting_bid) || 0,
      reserve_price: form.reserve_price ? parseFloat(form.reserve_price) : null,
      min_bid_increment: parseFloat(form.min_bid_increment) || 100,
      auto_extend_seconds: parseInt(form.auto_extend_seconds) || 300,
      auto_extend_threshold: parseInt(form.auto_extend_threshold) || 300,
      notes: form.notes || null,
    };

    const url = auction?.id ? `/api/auctions/${auction.id}` : "/api/auctions";
    const method = auction?.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setLoading(false);
      return;
    }

    router.push(redirectTo ?? "/admin/auctions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">Auction Setup</h2>

        <div>
          <label className="label">Property *</label>
          <select
            value={form.property_id}
            onChange={(e) => setField("property_id", e.target.value)}
            className="input-field"
            required
          >
            {properties.length === 0 && (
              <option value="">— Create a property first —</option>
            )}
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Status</label>
          <select
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
            className="input-field"
          >
            <option value="upcoming">Upcoming</option>
            <option value="live">Live (Active)</option>
            <option value="ended">Ended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

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
            <label className="label">End Date & Time *</label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setField("end_time", e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">Pricing</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Starting Bid ($) *</label>
            <input
              type="number"
              value={form.starting_bid}
              onChange={(e) => setField("starting_bid", e.target.value)}
              className="input-field"
              min="0"
              step="1"
              required
            />
          </div>
          <div>
            <label className="label">Bid Increment *</label>
            <select
              value={form.min_bid_increment}
              onChange={(e) => setField("min_bid_increment", e.target.value)}
              className="input-field"
              required
            >
              <option value="100">$100</option>
              <option value="250">$250</option>
              <option value="1000">$1,000</option>
              <option value="1500">$1,500</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Reserve Price ($) <span className="text-stone-300 font-normal normal-case">— optional, not shown to bidders</span></label>
          <input
            type="number"
            value={form.reserve_price}
            onChange={(e) => setField("reserve_price", e.target.value)}
            className="input-field"
            min="0"
            step="1"
            placeholder="Leave blank for no reserve"
          />
        </div>
      </div>

      {/* Auto-extend */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <h2 className="text-sm font-semibold text-stone-900">Auto-Extend Settings</h2>
          <Info size={14} className="text-stone-400" />
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800">
          When a bid is placed in the final window, the auction timer extends automatically. This prevents last-second sniping.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Trigger Window (seconds)</label>
            <input
              type="number"
              value={form.auto_extend_threshold}
              onChange={(e) => setField("auto_extend_threshold", e.target.value)}
              className="input-field"
              min="60"
              step="30"
            />
            <p className="text-xs text-stone-400 mt-1">If bid placed within this many seconds of end, extend. Default: 300 (5 min)</p>
          </div>
          <div>
            <label className="label">Extension Duration (seconds)</label>
            <input
              type="number"
              value={form.auto_extend_seconds}
              onChange={(e) => setField("auto_extend_seconds", e.target.value)}
              className="input-field"
              min="60"
              step="30"
            />
            <p className="text-xs text-stone-400 mt-1">How long to extend the auction by. Default: 300 (5 min)</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card p-6">
        <label className="label">Auction Notes <span className="text-stone-300 font-normal normal-case">— shown to bidders</span></label>
        <textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          className="input-field min-h-20 resize-y"
          placeholder="Any special terms, viewing info, access instructions…"
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={loading || properties.length === 0} className="btn-primary">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Auction</>}
        </button>
      </div>
    </form>
  );
}

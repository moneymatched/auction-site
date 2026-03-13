"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, MapPin } from "lucide-react";
import { Property } from "@/types";

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseCoords(raw: string): { lat: number | null; lng: number | null } {
  const parts = raw
    .replace(/[°'"NSEW]/gi, "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lat = parseFloat(parts[0] ?? "");
  const lng = parseFloat(parts[1] ?? "");
  return {
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
  };
}

export default function NewAuctionWithPropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: "",
    description: "",
    coordsRaw: "",
    start_time: toLocalDatetimeValue(tomorrow),
    end_time: toLocalDatetimeValue(dayAfter),
    starting_bid: "1000",
  });

  const parsedCoords = parseCoords(form.coordsRaw);
  const coordsValid =
    form.coordsRaw === "" ||
    (parsedCoords.lat !== null && parsedCoords.lng !== null);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Step 1: create the property
    const propertyPayload = {
      title: form.title,
      description: form.description,
      lat: parsedCoords.lat,
      lng: parsedCoords.lng,
    };

    const propRes = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(propertyPayload),
    });
    const propData = await propRes.json().catch(() => ({}));
    if (!propRes.ok) {
      setError(propData.error ?? "Failed to create property");
      setLoading(false);
      return;
    }

    const propertyId = (propData as Property).id;

    // Step 2: create the auction
    const auctionPayload = {
      property_id: propertyId,
      status: "upcoming",
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      starting_bid: parseFloat(form.starting_bid) || 1000,
      min_bid_increment: 100,
      auto_extend_seconds: 300,
      auto_extend_threshold: 300,
    };

    const auctRes = await fetch("/api/auctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auctionPayload),
    });
    const auctData = await auctRes.json().catch(() => ({}));
    if (!auctRes.ok) {
      setError(auctData.error ?? "Property saved but failed to create auction");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/admin/auctions");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property details */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">
          Property Details
        </h2>

        <div>
          <label className="label">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="input-field"
            placeholder="40 Acres in Hill Country"
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className="input-field min-h-24 resize-y"
            placeholder="Describe the property, its features, access, utilities…"
            rows={4}
          />
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <MapPin size={13} />
            GPS Coordinates
          </label>
          <input
            type="text"
            value={form.coordsRaw}
            onChange={(e) => setField("coordsRaw", e.target.value)}
            className={`input-field font-mono text-sm ${
              form.coordsRaw && !coordsValid
                ? "border-red-300 focus:ring-red-300"
                : ""
            }`}
            placeholder="30.274650, -97.740292"
          />
          <p className="text-xs text-stone-400 mt-1">
            Paste a latitude, longitude pair — e.g.{" "}
            <span className="font-mono">30.274650, -97.740292</span>
          </p>
          {form.coordsRaw && coordsValid && parsedCoords.lat !== null && (
            <p className="text-xs text-emerald-600 mt-1 font-mono">
              {parsedCoords.lat.toFixed(6)}, {parsedCoords.lng!.toFixed(6)}
            </p>
          )}
          {form.coordsRaw && !coordsValid && (
            <p className="text-xs text-red-500 mt-1">
              Could not parse coordinates — check the format.
            </p>
          )}
        </div>
      </div>

      {/* Auction timing */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">
          Auction Schedule
        </h2>

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
            min="0"
            step="1"
            required
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating…
            </>
          ) : (
            <>
              <Save size={16} /> List Property for Auction
            </>
          )}
        </button>
      </div>
    </form>
  );
}

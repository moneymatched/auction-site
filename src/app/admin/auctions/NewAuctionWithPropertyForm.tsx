"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowRight } from "lucide-react";
import { Property, PropertyImage } from "@/types";
import ImageUploader from "@/components/admin/ImageUploader";
import CoordinatePicker from "@/components/admin/CoordinatePicker";

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ZONING_TYPES = ["Agricultural", "Residential", "Commercial", "Industrial", "Rural", "Mixed Use", "Recreational"];

export default function NewAuctionWithPropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"details" | "images">("details");
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    acreage: "",
    zoning_type: "Agricultural",
    start_time: toLocalDatetimeValue(tomorrow),
    end_time: toLocalDatetimeValue(dayAfter),
    starting_bid: "1000",
    min_bid_increment: "100",
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Step 1: create the property, then show image uploader
  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const propRes = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          address: form.address,
          city: form.city,
          state: form.state,
          acreage: parseFloat(form.acreage) || 0,
          zoning_type: form.zoning_type,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
      const propData = await propRes.json().catch(() => ({}));
      if (!propRes.ok) {
        setError(propData.error ?? "Failed to create property");
        setLoading(false);
        return;
      }

      setCreatedPropertyId((propData as Property).id);
      setStep("images");
      setLoading(false);
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  // Step 2: create the auction and redirect
  async function handleCreateAuction() {
    setError("");
    setLoading(true);

    try {
      const auctRes = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: createdPropertyId,
          status: "upcoming",
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          starting_bid: parseFloat(form.starting_bid) || 1000,
          min_bid_increment: parseFloat(form.min_bid_increment) || 100,
          auto_extend_seconds: 300,
          auto_extend_threshold: 300,
        }),
      });
      const auctData = await auctRes.json().catch(() => ({}));
      if (!auctRes.ok) {
        setError(auctData.error ?? "Property saved but failed to create auction");
        setLoading(false);
        return;
      }

      await router.push("/admin/auctions");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  if (step === "images") {
    return (
      <div className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">
            Photos <span className="text-stone-400 font-normal">— optional</span>
          </h2>
          <ImageUploader
            propertyId={createdPropertyId!}
            existingImages={images}
            onChange={setImages}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button onClick={handleCreateAuction} disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating Auction…
              </>
            ) : (
              <>
                <Save size={16} /> List for Auction
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitDetails} className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Acreage</label>
            <input
              type="number"
              value={form.acreage}
              onChange={(e) => setField("acreage", e.target.value)}
              className="input-field"
              placeholder="40"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="label">Zoning Type</label>
            <select
              value={form.zoning_type}
              onChange={(e) => setField("zoning_type", e.target.value)}
              className="input-field"
            >
              {ZONING_TYPES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Street Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            className="input-field"
            placeholder="123 County Road 45"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className="input-field"
              placeholder="Fredericksburg"
            />
          </div>
          <div>
            <label className="label">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
              className="input-field"
              placeholder="TX"
              maxLength={2}
            />
          </div>
        </div>
      </div>

      {/* GPS Location */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">
          GPS Location
        </h2>
        <CoordinatePicker
          lat={coords.lat}
          lng={coords.lng}
          onChange={(lat, lng) => setCoords({ lat, lng })}
        />
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

        <div className="grid grid-cols-2 gap-3">
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
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              Next: Add Photos <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

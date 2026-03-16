"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/types";
import ImageUploader from "@/components/admin/ImageUploader";
import CoordinatePicker from "@/components/admin/CoordinatePicker";
import { Loader2, Save, Trash2 } from "lucide-react";

const ZONING_TYPES = ["Agricultural", "Residential", "Commercial", "Industrial", "Rural", "Mixed Use", "Recreational"];

interface PropertyFormProps {
  property?: Property;
}

export default function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(property?.id ?? null);

  const [form, setForm] = useState({
    title: property?.title ?? "",
    description: property?.description ?? "",
    address: property?.address ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "",
    acreage: property?.acreage?.toString() ?? "",
    zoning_type: property?.zoning_type ?? "Agricultural",
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: property?.lat ?? null,
    lng: property?.lng ?? null,
  });

  const [images, setImages] = useState(property?.images ?? []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      ...form,
      acreage: parseFloat(form.acreage) || 0,
      lat: coords.lat,
      lng: coords.lng,
    };

    let id = propertyId;

    if (id) {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        setLoading(false);
        return;
      }
    } else {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Insert failed");
        setLoading(false);
        return;
      }
      id = (data as Property).id;
      setPropertyId(id);
      setLoading(false);
      router.push(`/admin/properties/${id}`);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!propertyId || !confirm("Delete this property? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
    router.push("/admin/properties");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic info */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">Property Details</h2>

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

      {/* Location */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">GPS Location</h2>
        <CoordinatePicker
          lat={coords.lat}
          lng={coords.lng}
          onChange={(lat, lng) => setCoords({ lat, lng })}
        />
      </div>

      {/* Images — only available after property is created */}
      {propertyId ? (
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">Photos</h2>
          <ImageUploader
            propertyId={propertyId}
            existingImages={images}
            onChange={setImages}
          />
        </div>
      ) : (
        <div className="card p-6 text-sm text-stone-400 text-center">
          Save the property first to upload photos.
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div>
          {propertyId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700 text-sm"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting…" : "Delete Property"}
            </button>
          )}
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Property</>}
        </button>
      </div>
    </form>
  );
}

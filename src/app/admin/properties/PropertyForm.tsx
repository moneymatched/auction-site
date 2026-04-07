"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/types";
import ImageUploader from "@/components/admin/ImageUploader";
import CoordinatePicker from "@/components/admin/CoordinatePicker";
import { Loader2, Save, Trash2 } from "lucide-react";

const ZONING_TYPES = ["Agricultural", "Residential", "Commercial", "Industrial", "Rural", "Mixed Use", "Recreational"];
const BUYER_PREMIUM_OPTIONS = [0, 2, 5, 10];
const DOC_FEE_OPTIONS = [0, 200, 500, 1000];

const DEFAULT_TERMS = `1. PROPERTY SOLD "AS IS, WHERE IS": All properties are sold in their present condition with all faults. Neither the Seller nor the Auctioneer makes any warranties or representations of any kind regarding the property. Bidders are responsible for conducting their own due diligence prior to bidding.

2. BUYER'S PREMIUM: A buyer's premium will be added to the final bid price to determine the total purchase price, as specified in the auction listing.

3. EARNEST MONEY DEPOSIT: The winning bidder is required to submit a non-refundable earnest money deposit equal to 10% of the total purchase price within 24 hours of the auction closing. Deposit shall be made via wire transfer or certified funds.

4. CLOSING: Closing shall occur within 30 days of the auction end date. Buyer is responsible for all closing costs, including but not limited to title insurance, escrow fees, recording fees, and any applicable transfer taxes.

5. FINANCING: This is not a contingent sale. Bidders must have financing pre-arranged or be prepared to pay cash. There is no financing contingency.

6. TITLE & SURVEY: Seller will provide a general warranty deed or special warranty deed at closing. Buyer may obtain a survey at buyer's expense prior to closing. Any title objections must be raised within 10 business days of the earnest money deposit.

7. PROPERTY TAXES: Property taxes will be prorated to the date of closing. Buyer is responsible for all taxes from the date of closing forward.

8. INSPECTIONS: Bidders are encouraged to inspect the property prior to bidding. All inspections are at the bidder's expense. No contingencies for inspections will be allowed after the auction.

9. AGENCY DISCLOSURE: The auctioneer and auction company represent the seller in this transaction.

10. RESERVE: The seller reserves the right to accept or reject the final bid. Unless stated as "Absolute," all auctions are subject to seller confirmation.

11. DEFAULT: If the winning bidder fails to complete the purchase as outlined in these terms, the earnest money deposit shall be forfeited as liquidated damages, and the property may be re-offered for sale.

12. DOCUMENTATION FEE: A documentation fee may apply as specified in the auction listing, payable by the buyer at closing.

13. GOVERNING LAW: These terms shall be governed by the laws of the state in which the property is located.`;


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
    apn: property?.apn ?? "",
    description: property?.description ?? "",
    terms_and_conditions: property?.terms_and_conditions ?? DEFAULT_TERMS,
    address: property?.address ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "",
    acreage: property?.acreage?.toString() ?? "",
    zoning_type: property?.zoning_type ?? "Agricultural",
    buyer_premium: property?.buyer_premium?.toString() ?? "0",
    doc_fee: property?.doc_fee?.toString() ?? "0",
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
      buyer_premium: parseFloat(form.buyer_premium) || 0,
      doc_fee: parseFloat(form.doc_fee) || 0,
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
          <label className="label">APN #</label>
          <input
            type="text"
            value={form.apn}
            onChange={(e) => setField("apn", e.target.value)}
            className="input-field"
            placeholder="123-456-789"
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
          <label className="label">Terms and Conditions</label>
          <textarea
            value={form.terms_and_conditions}
            onChange={(e) => setField("terms_and_conditions", e.target.value)}
            className="input-field min-h-48 resize-y"
            placeholder="Enter the terms and conditions for this property auction…"
            rows={12}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Buyer Premium</label>
            <select
              value={form.buyer_premium}
              onChange={(e) => setField("buyer_premium", e.target.value)}
              className="input-field"
            >
              {BUYER_PREMIUM_OPTIONS.map((p) => (
                <option key={p} value={p}>{p === 0 ? "None" : `${p}%`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Doc Fee</label>
            <select
              value={form.doc_fee}
              onChange={(e) => setField("doc_fee", e.target.value)}
              className="input-field"
            >
              {DOC_FEE_OPTIONS.map((f) => (
                <option key={f} value={f}>{f === 0 ? "None" : `$${f.toLocaleString()}`}</option>
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

"use client";

import { useState, useEffect } from "react";
import { Auction, Bidder } from "@/types";
import { formatCurrency, getMinimumNextBid } from "@/lib/auction-utils";
import { X, DollarSign, Loader2, UserCheck, UserPlus } from "lucide-react";

const BIDDER_KEY = "auction_bidder";

function loadStoredBidder(): Bidder | null {
  try {
    const raw = localStorage.getItem(BIDDER_KEY);
    return raw ? (JSON.parse(raw) as Bidder) : null;
  } catch {
    return null;
  }
}

function storeBidder(bidder: Bidder) {
  localStorage.setItem(BIDDER_KEY, JSON.stringify(bidder));
}

function clearStoredBidder() {
  localStorage.removeItem(BIDDER_KEY);
}

interface BidFormProps {
  auction: Auction;
  onSuccess: () => void;
  onClose: () => void;
}

// ─── Step 1: Registration ────────────────────────────────────────────────────

interface RegistrationStepProps {
  onRegistered: (bidder: Bidder) => void;
  onClose: () => void;
}

function RegistrationStep({ onRegistered, onClose }: RegistrationStepProps) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      const res = await fetch("/api/bidders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      storeBidder(data as Bidder);
      onRegistered(data as Bidder);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-6 border-b border-stone-200">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Create Bidder Account</h2>
          <p className="text-sm text-stone-500 mt-0.5">One-time registration to place bids</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
              className="input-field"
              placeholder="Jane"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
              className="input-field"
              placeholder="Smith"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Email Address *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className="input-field"
            placeholder="jane@example.com"
            required
          />
        </div>

        <div>
          <label className="label">Phone Number *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className="input-field"
            placeholder="(555) 123-4567"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-1 space-y-2">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Registering…</>
            ) : (
              <><UserPlus size={16} /> Register & Continue</>
            )}
          </button>
          <p className="text-xs text-stone-400 text-center">
            Your info is used only to contact you if you win.
          </p>
        </div>
      </form>
    </>
  );
}

// ─── Step 2: Place Bid ────────────────────────────────────────────────────────

interface BidStepProps {
  auction: Auction;
  bidder: Bidder;
  onSuccess: () => void;
  onClose: () => void;
  onClearBidder: () => void;
}

function BidStep({ auction, bidder, onSuccess, onClose, onClearBidder }: BidStepProps) {
  const minBid = getMinimumNextBid(auction);
  const [amount, setAmount] = useState(minBid.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount < minBid) {
      setError(`Minimum bid is ${formatCurrency(minBid)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/proxy-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auction.id,
          max_amount: bidAmount,
          bidder_name: `${bidder.first_name} ${bidder.last_name}`,
          bidder_email: bidder.email,
          bidder_phone: bidder.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to place bid. Please try again.");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-6 border-b border-stone-200">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Place Your Bid</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Current: {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Registered bidder banner */}
        <div className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-sm">
          <div className="flex items-center gap-2 text-sm text-stone-700">
            <UserCheck size={15} className="text-emerald-600 shrink-0" />
            <span>
              Bidding as <strong>{bidder.first_name} {bidder.last_name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClearBidder}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline"
          >
            Not you?
          </button>
        </div>

        <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-sm px-3 py-2 leading-relaxed">
          Enter the most you&apos;re willing to pay. We&apos;ll automatically bid on your behalf up to that amount — other bidders won&apos;t see your maximum.
        </p>

        {/* Amount input */}
        <div>
          <label className="label">Maximum Bid Amount</label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              inputMode="numeric"
              value={amount ? parseInt(amount).toLocaleString("en-US") : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setAmount(raw);
              }}
              className="input-field pl-9"
              placeholder={minBid.toLocaleString("en-US")}
              required
              autoFocus
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Minimum: {formatCurrency(minBid)} · increment: {formatCurrency(auction.min_bid_increment)}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-1 space-y-2">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Placing Bid…</>
            ) : (
              `Place Bid — ${isNaN(parseFloat(amount)) ? "—" : formatCurrency(parseFloat(amount))}`
            )}
          </button>
          <p className="text-xs text-stone-400 text-center">
            By placing a bid you agree to be contacted by the seller. Payments are handled offline.
          </p>
        </div>
      </form>
    </>
  );
}

// ─── Main BidForm ─────────────────────────────────────────────────────────────

export default function BidForm({ auction, onSuccess, onClose }: BidFormProps) {
  const [bidder, setBidder] = useState<Bidder | null>(null);

  useEffect(() => {
    setBidder(loadStoredBidder());
  }, []);

  function handleClearBidder() {
    clearStoredBidder();
    setBidder(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-sm shadow-2xl animate-slide-up">
        {bidder ? (
          <BidStep
            auction={auction}
            bidder={bidder}
            onSuccess={onSuccess}
            onClose={onClose}
            onClearBidder={handleClearBidder}
          />
        ) : (
          <RegistrationStep
            onRegistered={(b) => setBidder(b)}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

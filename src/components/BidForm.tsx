"use client";

import { useState } from "react";
import { Auction } from "@/types";
import { formatCurrency, getMinimumNextBid } from "@/lib/auction-utils";
import { X, DollarSign, Loader2 } from "lucide-react";

interface BidFormProps {
  auction: Auction;
  onSuccess: () => void;
  onClose: () => void;
}

export default function BidForm({ auction, onSuccess, onClose }: BidFormProps) {
  const minBid = getMinimumNextBid(auction);
  const [amount, setAmount] = useState(minBid.toString());
  const [email, setEmail] = useState("");
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
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auction.id,
          amount: bidAmount,
          bidder_email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to place bid. Please try again.");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-sm shadow-2xl animate-slide-up">
        {/* Header */}
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
          {/* Bid amount */}
          <div>
            <label className="label">Bid Amount</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={minBid}
                step={auction.min_bid_increment}
                className="input-field pl-9"
                placeholder={minBid.toString()}
                required
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Minimum bid: {formatCurrency(minBid)} (increment: {formatCurrency(auction.min_bid_increment)})
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="jane@example.com"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2 space-y-2">
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
      </div>
    </div>
  );
}

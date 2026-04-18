"use client";

import { useState, useEffect } from "react";
import { Auction, Bidder } from "@/types";
import { formatCurrency, getMinimumNextBid } from "@/lib/auction-utils";
import { X, DollarSign, Loader2, Mail, UserCheck, UserPlus, Eye, EyeOff } from "lucide-react";

const BIDDER_KEY = "auction_bidder";

export function loadStoredBidder(): Bidder | null {
  try {
    const raw = localStorage.getItem(BIDDER_KEY);
    return raw ? (JSON.parse(raw) as Bidder) : null;
  } catch {
    return null;
  }
}

export function storeBidder(bidder: Bidder) {
  localStorage.setItem(BIDDER_KEY, JSON.stringify(bidder));
}


interface BidFormProps {
  auction: Auction;
  topBidderEmail?: string;
  onSuccess: () => void;
  onClose: () => void;
}

// ─── Step 1: Registration ────────────────────────────────────────────────────

interface RegistrationStepProps {
  onRegistered: (bidder: Bidder) => void;
  onClose: () => void;
}

export function RegistrationStep({ onRegistered, onClose }: RegistrationStepProps) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

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
          password: form.password,
          address_street: form.address_street,
          address_city: form.address_city,
          address_state: form.address_state,
          address_zip: form.address_zip,
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

      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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

        {/* Password */}
        <div>
          <label className="label">Password *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className="input-field pr-10"
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Confirm Password *</label>
          <input
            type={showPassword ? "text" : "password"}
            value={form.confirm_password}
            onChange={(e) => setField("confirm_password", e.target.value)}
            className="input-field"
            placeholder="Re-enter password"
            required
            minLength={8}
          />
        </div>

        {/* Home Address */}
        <div className="pt-2 border-t border-stone-100">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Home Address</p>

          <div className="space-y-3">
            <div>
              <label className="label">Street Address *</label>
              <input
                type="text"
                value={form.address_street}
                onChange={(e) => setField("address_street", e.target.value)}
                className="input-field"
                placeholder="123 Main St"
                required
              />
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <label className="label">City *</label>
                <input
                  type="text"
                  value={form.address_city}
                  onChange={(e) => setField("address_city", e.target.value)}
                  className="input-field"
                  placeholder="Springfield"
                  required
                />
              </div>
              <div className="col-span-1">
                <label className="label">State *</label>
                <input
                  type="text"
                  value={form.address_state}
                  onChange={(e) => setField("address_state", e.target.value)}
                  className="input-field"
                  placeholder="IL"
                  maxLength={2}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="label">ZIP Code *</label>
                <input
                  type="text"
                  value={form.address_zip}
                  onChange={(e) => setField("address_zip", e.target.value)}
                  className="input-field"
                  placeholder="62704"
                  required
                />
              </div>
            </div>
          </div>
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

// ─── Step 2: Confirm email ───────────────────────────────────────────────────

interface VerifyEmailStepProps {
  bidder: Bidder;
  onVerified: (bidder: Bidder) => void;
  onClose: () => void;
}

export function VerifyEmailStep({ bidder, onVerified, onClose }: VerifyEmailStepProps) {
  const [loading, setLoading] = useState<"resend" | "refresh" | null>(null);
  const [error, setError] = useState("");

  async function refreshStatus() {
    setError("");
    setLoading("refresh");
    try {
      const res = await fetch(
        `/api/bidders/lookup?email=${encodeURIComponent(bidder.email)}`
      );
      const data = (await res.json()) as { email_verified_at?: string | null; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not check status.");
        return;
      }
      const fresh: Bidder = {
        ...bidder,
        email_verified_at: data.email_verified_at ?? null,
      };
      storeBidder(fresh);
      if (fresh.email_verified_at) {
        onVerified(fresh);
      } else {
        setError("Not verified yet. Click the link in your email, then try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(null);
    }
  }

  async function resend() {
    setError("");
    setLoading("resend");
    try {
      const res = await fetch("/api/bidders/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: bidder.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend email.");
        return;
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-6 border-b border-stone-200">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Confirm your email</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            One quick step before you can bid
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost p-2">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-center py-2">
          <div className="rounded-full bg-stone-100 p-4 text-stone-600">
            <Mail size={28} />
          </div>
        </div>
        <p className="text-sm text-stone-600 text-center leading-relaxed">
          We sent a confirmation link to{" "}
          <strong className="text-stone-800">{bidder.email}</strong>. Open it, then
          click the button below to continue.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={loading !== null}
            onClick={refreshStatus}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "refresh" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Checking…
              </>
            ) : (
              "I've confirmed my email"
            )}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={resend}
            className="btn-ghost w-full text-sm text-stone-600 border border-stone-200"
          >
            {loading === "resend" ? (
              <>
                <Loader2 size={16} className="animate-spin inline mr-2" />
                Sending…
              </>
            ) : (
              "Resend email"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Step 3: Place Bid ────────────────────────────────────────────────────────

interface BidStepProps {
  auction: Auction;
  bidder: Bidder;
  topBidderEmail?: string;
  onSuccess: () => void;
  onClose: () => void;
}

function BidStep({ auction, bidder, topBidderEmail, onSuccess, onClose }: BidStepProps) {
  const isAlreadyLeading =
    !!topBidderEmail && topBidderEmail.toLowerCase() === bidder.email.toLowerCase();
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
              Bidding as{" "}
              <strong>
                {bidder.first_name} {bidder.last_name}
              </strong>
            </span>
          </div>
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

        {isAlreadyLeading && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2 text-center">
            You&apos;re currently the highest bidder. You can raise your maximum to protect your lead.
          </p>
        )}

        <div className="pt-1 space-y-2">
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
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

export default function BidForm({ auction, topBidderEmail, onSuccess, onClose }: BidFormProps) {
  const [bidder, setBidder] = useState<Bidder | null>(null);

  useEffect(() => {
    setBidder(loadStoredBidder());
  }, []);

  useEffect(() => {
    const stored = loadStoredBidder();
    if (!stored?.email) return;
    let cancelled = false;
    fetch(`/api/bidders/lookup?email=${encodeURIComponent(stored.email)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ email_verified_at: string | null }>;
      })
      .then((patch) => {
        if (cancelled || !patch) return;
        const merged: Bidder = { ...stored, email_verified_at: patch.email_verified_at };
        storeBidder(merged);
        setBidder((prev) => {
          if (!prev || prev.email.toLowerCase() !== stored.email.toLowerCase()) return prev;
          return merged;
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const emailVerified = Boolean(bidder?.email_verified_at);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-sm shadow-2xl animate-slide-up">
        {bidder ? (
          emailVerified ? (
            <BidStep
              auction={auction}
              bidder={bidder}
              topBidderEmail={topBidderEmail}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          ) : (
            <VerifyEmailStep
              bidder={bidder}
              onVerified={(b) => {
                storeBidder(b);
                setBidder(b);
              }}
              onClose={onClose}
            />
          )
        ) : (
          <RegistrationStep
            onRegistered={(b) => {
              storeBidder(b);
              setBidder(b);
            }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

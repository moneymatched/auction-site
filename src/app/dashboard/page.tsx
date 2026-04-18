"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bidder, Auction } from "@/types";
import { formatCurrency } from "@/lib/auction-utils";
import { getImageUrl } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import CountdownTimer from "@/components/CountdownTimer";
import {
  Loader2,
  Gavel,
  Eye,
  User,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Trophy,
  XCircle,
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import RegisterModal from "@/components/RegisterModal";

const BIDDER_KEY = "auction_bidder";

type BidStatus = "leading" | "outbid" | "won" | "lost";

interface DashboardBidItem {
  auction: Auction;
  bidStatus: BidStatus;
  myMaxBid: number;
  currentBid: number;
  topBidderEmail?: string;
}

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

function clearBidder() {
  localStorage.removeItem(BIDDER_KEY);
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function BidStatusBadge({ status }: { status: BidStatus }) {
  const config = {
    leading: {
      label: "Leading",
      icon: TrendingUp,
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    outbid: {
      label: "Outbid",
      icon: AlertTriangle,
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    won: {
      label: "Won",
      icon: Trophy,
      classes: "bg-blue-50 text-blue-700 border-blue-200",
    },
    lost: {
      label: "Lost",
      icon: XCircle,
      classes: "bg-stone-100 text-stone-500 border-stone-200",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`status-badge ${config.classes}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

// ─── Bid Card ────────────────────────────────────────────────────────────────

function DashboardBidCard({ item }: { item: DashboardBidItem }) {
  const { auction, bidStatus, myMaxBid, currentBid } = item;
  const property = auction.property;
  const primaryImage =
    property?.images?.find((img) => img.is_primary) ?? property?.images?.[0];
  const imageUrl = primaryImage ? getImageUrl(primaryImage.storage_path) : null;
  const effectiveStatus = getEffectiveAuctionStatus(auction);
  const isLive = effectiveStatus === "live";
  const isUpcoming = effectiveStatus === "upcoming";

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <Link
          href={`/auctions/${auction.id}`}
          className="relative w-full sm:w-48 aspect-[4/3] sm:aspect-auto sm:min-h-[140px] bg-stone-100 shrink-0 overflow-hidden"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={property?.title ?? "Property"}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300">
              <Gavel size={28} />
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <Link
                href={`/auctions/${auction.id}`}
                className="font-medium text-stone-900 hover:text-stone-600 transition-colors truncate block"
              >
                {property?.title ?? "Property"}
              </Link>
              {property && (
                <div className="flex items-center gap-1 text-stone-400 text-xs mt-0.5">
                  <MapPin size={11} />
                  <span>
                    {property.city}, {property.state}
                  </span>
                  {property.acreage > 0 && (
                    <span className="ml-1">· {property.acreage} ac</span>
                  )}
                </div>
              )}
            </div>
            <BidStatusBadge status={bidStatus} />
          </div>

          {/* Bid details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <p className="text-xs text-stone-400">Current Bid</p>
              <p className="text-sm font-semibold text-stone-900">
                {formatCurrency(currentBid > 0 ? currentBid : auction.starting_bid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">My Max Bid</p>
              <p className="text-sm font-semibold text-stone-900">
                {formatCurrency(myMaxBid)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              {(isLive || isUpcoming) && (
                <>
                  <p className="text-xs text-stone-400">
                    {isLive ? "Time Left" : "Starts In"}
                  </p>
                  <CountdownTimer
                    endTime={isUpcoming ? auction.start_time : auction.end_time}
                    status={effectiveStatus}
                    size="sm"
                  />
                </>
              )}
              {!isLive && !isUpcoming && (
                <>
                  <p className="text-xs text-stone-400">Status</p>
                  <p className="text-sm text-stone-500">Ended</p>
                </>
              )}
            </div>
          </div>

          {/* Action row */}
          {(isLive || isUpcoming) && bidStatus === "outbid" && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <Link
                href={`/auctions/${auction.id}`}
                className="btn-primary text-xs py-2 px-4"
              >
                <DollarSign size={13} />
                Bid Now
              </Link>
            </div>
          )}
          {bidStatus === "leading" && isLive && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <p className="text-xs text-emerald-600 font-medium">
                You&apos;re in the lead!
              </p>
            </div>
          )}
          {bidStatus === "won" && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <p className="text-xs text-blue-600 font-medium">
                Congratulations! You won this auction.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Watchlist Card ──────────────────────────────────────────────────────────

function WatchlistCard({
  auction,
  onRemove,
  bidStatus,
}: {
  auction: Auction;
  onRemove: () => void;
  bidStatus?: BidStatus;
}) {
  const property = auction.property;
  const primaryImage =
    property?.images?.find((img) => img.is_primary) ?? property?.images?.[0];
  const imageUrl = primaryImage ? getImageUrl(primaryImage.storage_path) : null;
  const effectiveStatus = getEffectiveAuctionStatus(auction);
  const displayBid =
    auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={`/auctions/${auction.id}`}
          className="relative w-full sm:w-40 aspect-[4/3] sm:aspect-auto sm:min-h-[120px] bg-stone-100 shrink-0 overflow-hidden"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={property?.title ?? "Property"}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, 160px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300">
              <Gavel size={24} />
            </div>
          )}
        </Link>

        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/auctions/${auction.id}`}
                  className="font-medium text-stone-900 hover:text-stone-600 transition-colors truncate text-sm"
                >
                  {property?.title ?? "Property"}
                </Link>
                {bidStatus && <BidStatusBadge status={bidStatus} />}
              </div>
              {property && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {property.city}, {property.state}
                  {property.acreage > 0 && ` · ${property.acreage} ac`}
                </p>
              )}
            </div>
            <button
              onClick={onRemove}
              className="btn-ghost p-1.5 text-stone-400 hover:text-red-500"
              title="Remove from watchlist"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-xs text-stone-400">
                {auction.current_bid > 0 ? "Current Bid" : "Starting Bid"}
              </p>
              <p className="text-sm font-semibold text-stone-900">
                {formatCurrency(displayBid)}
              </p>
            </div>
            <div className="text-right">
              <CountdownTimer
                endTime={
                  effectiveStatus === "upcoming"
                    ? auction.start_time
                    : auction.end_time
                }
                status={effectiveStatus}
                size="sm"
              />
            </div>
          </div>

          {effectiveStatus === "live" && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <Link
                href={`/auctions/${auction.id}`}
                className="btn-primary text-xs py-2 px-4"
              >
                <DollarSign size={13} />
                Place Bid
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onLoggedIn }: { onLoggedIn: (bidder: Bidder) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = loadStoredBidder();
    if (stored?.email_verified_at) {
      onLoggedIn(stored);
    }
  }, [onLoggedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/bidders/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      const bidder = data as Bidder;
      storeBidder(bidder);
      onLoggedIn(bidder);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900">
            Sign in to your dashboard
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Enter your email and password to sign in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="jane@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <p className="text-xs text-stone-400 text-center">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="underline hover:text-stone-600"
            >
              Register now
            </button>
          </p>
        </form>
      </div>

      {showRegister && (
        <RegisterModal
          onComplete={onLoggedIn}
          onClose={() => setShowRegister(false)}
        />
      )}
    </div>
  );
}

// ─── Dashboard Content ───────────────────────────────────────────────────────

type Tab = "bids" | "watchlist" | "account";

function DashboardContent() {
  const searchParams = useSearchParams();
  const loginToken = searchParams.get("login_token");

  const [bidder, setBidder] = useState<Bidder | null>(null);
  const [tokenLoading, setTokenLoading] = useState(!!loginToken);
  const [tokenError, setTokenError] = useState("");

  const initialTab = (searchParams.get("tab") as Tab) || "bids";
  const [tab, setTab] = useState<Tab>(
    ["bids", "watchlist", "account"].includes(initialTab) ? initialTab : "bids"
  );
  const [bidItems, setBidItems] = useState<DashboardBidItem[]>([]);
  const [watchlistAuctions, setWatchlistAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle magic link login
  useEffect(() => {
    if (!loginToken) return;

    fetch(`/api/bidders/login/confirm?token=${encodeURIComponent(loginToken)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setTokenError(data.error ?? "Login failed.");
          setTokenLoading(false);
          return;
        }
        const b = data as Bidder;
        storeBidder(b);
        setBidder(b);
        setTokenLoading(false);
        // Clean URL
        window.history.replaceState({}, "", "/dashboard");
      })
      .catch(() => {
        setTokenError("Network error. Please try again.");
        setTokenLoading(false);
      });
  }, [loginToken]);

  // Check localStorage on mount (if no login token)
  useEffect(() => {
    if (loginToken) return;
    const stored = loadStoredBidder();
    if (stored?.email_verified_at) {
      setBidder(stored);
    } else {
      setLoading(false);
    }
  }, [loginToken]);

  // Fetch dashboard data when bidder is set
  const fetchData = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const [bidsRes, watchRes] = await Promise.all([
        fetch(`/api/dashboard/bids?email=${encodeURIComponent(email)}`),
        fetch(`/api/watchlist?email=${encodeURIComponent(email)}`),
      ]);
      if (bidsRes.ok) {
        const bidsData = await bidsRes.json();
        setBidItems(bidsData.items ?? []);
      }
      if (watchRes.ok) {
        const watchData = await watchRes.json();
        setWatchlistAuctions(watchData.auctions ?? []);
      }
    } catch {
      // Silent fail — data just won't load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bidder?.email) {
      fetchData(bidder.email);
    }
  }, [bidder, fetchData]);

  function handleLogout() {
    clearBidder();
    setBidder(null);
    setBidItems([]);
    setWatchlistAuctions([]);
  }

  async function removeFromWatchlist(auctionId: string) {
    if (!bidder) return;
    setWatchlistAuctions((prev) => prev.filter((a) => a.id !== auctionId));
    await fetch(
      `/api/watchlist?email=${encodeURIComponent(bidder.email)}&auction_id=${auctionId}`,
      { method: "DELETE" }
    );
  }

  // Token loading state
  if (tokenLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={24} className="animate-spin mx-auto text-stone-400" />
          <p className="text-sm text-stone-600">Signing you in…</p>
        </div>
      </div>
    );
  }

  // Token error
  if (tokenError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {tokenError}
          </p>
          <Link href="/dashboard" className="btn-primary inline-block">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!bidder) {
    return <LoginForm onLoggedIn={(b) => setBidder(b)} />;
  }

  // Segment bid items
  const activeBids = bidItems.filter(
    (i) => i.bidStatus === "leading" || i.bidStatus === "outbid"
  );
  const completedBids = bidItems.filter(
    (i) => i.bidStatus === "won" || i.bidStatus === "lost"
  );

  const tabs: { key: Tab; label: string; icon: typeof Gavel; count?: number }[] = [
    { key: "bids", label: "My Bids", icon: Gavel, count: bidItems.length },
    { key: "watchlist", label: "Watchlist", icon: Eye, count: watchlistAuctions.length },
    { key: "account", label: "Account", icon: User },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            Welcome back, {bidder.first_name}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">{bidder.email}</p>
        </div>
        <button onClick={handleLogout} className="btn-ghost text-sm gap-1.5">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? "border-stone-900 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    active
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-stone-400" />
        </div>
      ) : (
        <>
          {/* ─── Bids Tab ─── */}
          {tab === "bids" && (
            <div className="space-y-6">
              {bidItems.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Gavel size={32} className="mx-auto text-stone-300" />
                  <p className="text-stone-500">No bids yet</p>
                  <Link href="/auctions" className="btn-primary inline-flex">
                    <ExternalLink size={14} />
                    Browse Auctions
                  </Link>
                </div>
              ) : (
                <>
                  {/* Active bids */}
                  {activeBids.length > 0 && (
                    <div>
                      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-3">
                        Active Auctions
                      </h2>
                      <div className="space-y-3">
                        {activeBids.map((item) => (
                          <DashboardBidCard key={item.auction.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed bids */}
                  {completedBids.length > 0 && (
                    <div>
                      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-3">
                        Completed
                      </h2>
                      <div className="space-y-3">
                        {completedBids.map((item) => (
                          <DashboardBidCard key={item.auction.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Watchlist Tab ─── */}
          {tab === "watchlist" && (
            <div className="space-y-3">
              {watchlistAuctions.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Eye size={32} className="mx-auto text-stone-300" />
                  <p className="text-stone-500">Your watchlist is empty</p>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto">
                    Browse auctions and click the watch icon to add them here.
                  </p>
                  <Link href="/auctions" className="btn-primary inline-flex">
                    <Plus size={14} />
                    Browse Auctions
                  </Link>
                </div>
              ) : (
                watchlistAuctions.map((auction) => {
                  const status = bidItems.find((i) => i.auction.id === auction.id)?.bidStatus;
                  return (
                    <WatchlistCard
                      key={auction.id}
                      auction={auction}
                      onRemove={() => removeFromWatchlist(auction.id)}
                      bidStatus={status}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* ─── Account Tab ─── */}
          {tab === "account" && (
            <div className="max-w-md space-y-6">
              <div className="card p-6 space-y-4">
                <h2 className="font-medium text-stone-900">Account Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider">
                      First Name
                    </p>
                    <p className="text-sm text-stone-900 mt-0.5">
                      {bidder.first_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider">
                      Last Name
                    </p>
                    <p className="text-sm text-stone-900 mt-0.5">
                      {bidder.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider">
                      Email
                    </p>
                    <p className="text-sm text-stone-900 mt-0.5">
                      {bidder.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider">
                      Phone
                    </p>
                    <p className="text-sm text-stone-900 mt-0.5">
                      {bidder.phone}
                    </p>
                  </div>
                </div>

                {bidder.address_street && (
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider">
                      Home Address
                    </p>
                    <p className="text-sm text-stone-900 mt-0.5">
                      {bidder.address_street}
                      <br />
                      {bidder.address_city}, {bidder.address_state} {bidder.address_zip}
                    </p>
                  </div>
                )}

                {bidder.email_verified_at && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Email verified
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-semibold text-stone-900">
                    {bidItems.length}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">Total Bids</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-semibold text-emerald-600">
                    {bidItems.filter((i) => i.bidStatus === "leading").length}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">Leading</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-semibold text-blue-600">
                    {bidItems.filter((i) => i.bidStatus === "won").length}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">Won</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn-secondary w-full text-sm"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-stone-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

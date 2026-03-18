"use client";

import { useEffect, useState, useCallback } from "react";
import { Auction, Bid } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/auction-utils";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import ImageGallery from "@/components/ImageGallery";
import CountdownTimer from "@/components/CountdownTimer";
import BidForm from "@/components/BidForm";
import BidHistory from "@/components/BidHistory";
import PropertyMap from "@/components/PropertyMap";
import { MapPin, Gavel, ChevronRight, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AuctionRoomProps {
  initialAuction: Auction;
  initialBids: Bid[];
}

export default function AuctionRoom({ initialAuction, initialBids }: AuctionRoomProps) {
  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [bids, setBids] = useState<Bid[]>(initialBids);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);

  const property = auction.property!;
  const effectiveStatus = getEffectiveAuctionStatus(auction);

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const auctionChannel = supabase
      .channel(`auction:${auction.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${auction.id}` },
        (payload) => {
          setAuction((prev) => ({ ...prev, ...(payload.new as Auction) }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${auction.id}` },
        (payload) => {
          setBids((prev) => [payload.new as Bid, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
    };
  }, [auction.id]);

  const handleBidSuccess = useCallback(() => {
    setShowBidForm(false);
    setBidSuccess(true);
    setTimeout(() => setBidSuccess(false), 5000);
  }, []);

  const canBid = effectiveStatus === "live" && new Date(auction.end_time) > new Date();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-stone-400 mb-6">
        <Link href="/auctions" className="hover:text-stone-600 transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          Auctions
        </Link>
        <ChevronRight size={14} />
        <span className="text-stone-700 truncate max-w-xs">{property.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Left column — property details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Image gallery */}
          <ImageGallery
            images={property.images ?? []}
            title={property.title}
          />

          {/* Property info */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl font-semibold text-stone-900">{property.title}</h1>
              <span className={`status-badge shrink-0 ${getStatusColor(effectiveStatus)}`}>
                {effectiveStatus === "live" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {getStatusLabel(effectiveStatus)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-4">
              <MapPin size={14} />
              <span>{property.address && `${property.address}, `}{property.city}, {property.state}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Acreage", value: property.acreage > 0 ? `${property.acreage} ac` : "—" },
                { label: "Zoning", value: property.zoning_type || "—" },
                { label: "State", value: property.state || "—" },
              ].map((item) => (
                <div key={item.label} className="bg-stone-50 border border-stone-200 rounded-sm px-3 py-2.5">
                  <p className="text-xs text-stone-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-stone-800">{item.value}</p>
                </div>
              ))}
            </div>

            {property.description && (
              <div className="prose prose-sm max-w-none text-stone-600 leading-relaxed">
                <p>{property.description}</p>
              </div>
            )}

            {auction.notes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-sm text-sm text-amber-800">
                <strong>Auction Notes:</strong> {auction.notes}
              </div>
            )}
          </div>

          {/* Map */}
          {property.lat && property.lng && (
            <div>
              <h2 className="text-base font-semibold text-stone-900 mb-3">Location</h2>
              <div className="rounded-sm overflow-hidden border border-stone-200 h-64">
                <PropertyMap
                  auctions={[auction]}
                  singleProperty
                  lat={property.lat}
                  lng={property.lng}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right column — bidding panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            {/* Bid card */}
            <div className="card p-6">
              {/* Current bid */}
              <div className="mb-5">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">
                  {auction.current_bid > 0 ? "Current Bid" : "Starting Bid"}
                </p>
                <p className="text-4xl font-semibold text-stone-900 tabular-nums">
                  {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
                </p>
                {auction.bid_count > 0 && (
                  <p className="text-sm text-stone-400 mt-1">
                    {auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Timer */}
              <div className="py-4 border-y border-stone-100 mb-5">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-2">
                  {effectiveStatus === "upcoming" ? "Starts In" : "Time Remaining"}
                </p>
                <CountdownTimer
                  endTime={effectiveStatus === "upcoming" ? auction.start_time : auction.end_time}
                  status={effectiveStatus}
                  size="lg"
                  showExtendedBanner
                />
              </div>

              {/* Bid success */}
              {bidSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-emerald-700 text-sm mb-4">
                  <CheckCircle2 size={16} />
                  <span>You&apos;re the highest bidder!</span>
                </div>
              )}

              {/* CTA */}
              {canBid ? (
                <button onClick={() => setShowBidForm(true)} className="btn-primary w-full py-3 text-base">
                  <Gavel size={18} />
                  Place Bid
                </button>
              ) : effectiveStatus === "upcoming" ? (
                <div className="text-center py-2 text-sm text-stone-500">
                  Bidding opens when auction starts
                </div>
              ) : (
                <div className="text-center py-2 text-sm text-stone-500">
                  This auction has ended
                </div>
              )}

              {canBid && (
                <p className="text-xs text-stone-400 text-center mt-3">
                  Min. bid: {formatCurrency(auction.current_bid + auction.min_bid_increment)}
                  {" "}· Auto-extends {auction.auto_extend_seconds / 60}m if bid in last {auction.auto_extend_threshold / 60}m
                </p>
              )}
            </div>

            {/* Bid history */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-stone-900 mb-4">
                Bid History
                {bids.length > 0 && (
                  <span className="ml-2 text-stone-400 font-normal">({bids.length})</span>
                )}
              </h2>
              <BidHistory bids={bids} />
            </div>
          </div>
        </div>
      </div>

      {/* Bid form modal */}
      {showBidForm && (
        <BidForm
          auction={auction}
          topBidderEmail={bids.find((b) => b.amount === auction.current_bid)?.bidder_email}
          onSuccess={handleBidSuccess}
          onClose={() => setShowBidForm(false)}
        />
      )}
    </main>
  );
}

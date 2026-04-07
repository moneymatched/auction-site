import Link from "next/link";
import Image from "next/image";
import { Auction } from "@/types";
import { formatCurrency, getStatusLabel, getStatusColor } from "@/lib/auction-utils";
import { getImageUrl } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import CountdownTimer from "./CountdownTimer";
import { MapPin, Maximize2, Gavel, TrendingUp, AlertTriangle, Trophy, XCircle, Heart } from "lucide-react";

type BidStatus = "leading" | "outbid" | "won" | "lost";

interface AuctionCardProps {
  auction: Auction;
  onBid?: (auction: Auction) => void;
  bidStatus?: BidStatus;
  isWatched?: boolean;
  onToggleWatch?: (auctionId: string) => void;
}

export default function AuctionCard({ auction, onBid, bidStatus, isWatched, onToggleWatch }: AuctionCardProps) {
  const property = auction.property;
  const primaryImage = property?.images?.find((img) => img.is_primary) ?? property?.images?.[0];
  const imageUrl = primaryImage ? getImageUrl(primaryImage.storage_path) : null;
  const displayBid = auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;
  const effectiveStatus = getEffectiveAuctionStatus(auction);
  const canBid = effectiveStatus === "live";

  return (
    <div className="group card hover:shadow-md transition-shadow flex flex-col">
      {/* Image — links to detail page */}
      <Link href={`/auctions/${auction.id}`} className="relative aspect-[4/3] bg-stone-100 overflow-hidden block">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={property?.title ?? "Property"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Maximize2 size={32} className="text-stone-300" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`status-badge bg-white/90 backdrop-blur-sm ${getStatusColor(effectiveStatus)}`}>
            {effectiveStatus === "live" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {getStatusLabel(effectiveStatus)}
          </span>
        </div>

        {/* Bid status badge */}
        {bidStatus && (
          <div className="absolute top-3 right-3">
            {bidStatus === "leading" && (
              <span className="status-badge bg-emerald-500 text-white border-emerald-600">
                <TrendingUp size={11} />
                Winning
              </span>
            )}
            {bidStatus === "outbid" && (
              <span className="status-badge bg-amber-500 text-white border-amber-600">
                <AlertTriangle size={11} />
                Outbid
              </span>
            )}
            {bidStatus === "won" && (
              <span className="status-badge bg-blue-500 text-white border-blue-600">
                <Trophy size={11} />
                Won
              </span>
            )}
            {bidStatus === "lost" && (
              <span className="status-badge bg-stone-500 text-white border-stone-600">
                <XCircle size={11} />
                Lost
              </span>
            )}
          </div>
        )}

        {/* Watch button */}
        {onToggleWatch && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatch(auction.id);
            }}
            className={`absolute bottom-3 left-3 p-1.5 rounded-full backdrop-blur-sm transition-colors ${
              isWatched
                ? "bg-red-500 text-white"
                : "bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
            }`}
            title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Heart size={16} fill={isWatched ? "currentColor" : "none"} />
          </button>
        )}

        {/* Image count */}
        {property?.images && property.images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded-sm">
            {property.images.length} photos
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <Link href={`/auctions/${auction.id}`}>
          <h3 className="font-medium text-stone-900 text-base leading-snug mb-1 group-hover:text-stone-600 transition-colors">
            {property?.title ?? "Property"}
          </h3>
        </Link>

        {property && (
          <div className="flex items-center gap-1 text-stone-400 text-xs mb-3">
            <MapPin size={12} />
            <span>{property.city}, {property.state}</span>
            {property.acreage > 0 && (
              <span className="ml-1">· {property.acreage} ac</span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">
              {auction.current_bid > 0 ? "Current Bid" : "Starting Bid"}
            </p>
            <p className="text-xl font-semibold text-stone-900">
              {formatCurrency(displayBid)}
            </p>
            {auction.bid_count > 0 && (
              <p className="text-xs text-stone-400 mt-0.5">
                {auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="text-right flex flex-col items-end gap-2">
            <CountdownTimer
              endTime={effectiveStatus === "upcoming" ? auction.start_time : auction.end_time}
              status={effectiveStatus}
              size="sm"
            />
            {canBid && onBid && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onBid(auction);
                }}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Gavel size={13} />
                Bid Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

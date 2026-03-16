import { AuctionStatus } from "@/types";

type AuctionTimeWindow = {
  status: string;
  start_time: string;
  end_time: string;
};

function isAuctionStatus(value: string): value is AuctionStatus {
  return value === "upcoming" || value === "live" || value === "ended" || value === "cancelled";
}

export function getEffectiveAuctionStatus(
  auction: AuctionTimeWindow,
  now: Date = new Date()
): AuctionStatus {
  if (auction.status === "cancelled" || auction.status === "ended") {
    return auction.status;
  }

  const nowMs = now.getTime();
  const startMs = new Date(auction.start_time).getTime();
  const endMs = new Date(auction.end_time).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return isAuctionStatus(auction.status) ? auction.status : "upcoming";
  }

  if (nowMs >= endMs) return "ended";
  if (nowMs >= startMs) return "live";
  return "upcoming";
}

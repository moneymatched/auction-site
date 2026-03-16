import { Auction } from "@/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimeRemaining(endTime: string): {
  display: string;
  seconds: number;
  urgency: "normal" | "warning" | "critical";
} {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = Math.max(0, end - now);
  const seconds = Math.floor(diff / 1000);

  if (seconds <= 0) return { display: "Ended", seconds: 0, urgency: "critical" };

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let display: string;
  if (days > 0) display = `${days}d ${hours}h`;
  else if (hours > 0) display = `${hours}h ${minutes}m`;
  else if (minutes > 0) display = `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  else display = `${secs}s`;

  const urgency =
    seconds <= 60 ? "critical" : seconds <= 300 ? "warning" : "normal";

  return { display, seconds, urgency };
}

export function getMinimumNextBid(auction: Auction): number {
  if (auction.current_bid === 0) {
    return auction.starting_bid;
  }
  return auction.current_bid + auction.min_bid_increment;
}

export function shouldAutoExtend(auction: Auction): boolean {
  const secondsRemaining = Math.floor(
    (new Date(auction.end_time).getTime() - Date.now()) / 1000
  );
  return secondsRemaining > 0 && secondsRemaining <= auction.auto_extend_threshold;
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "live": return "Live";
    case "upcoming": return "Upcoming";
    case "ended": return "Ended";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "live": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "upcoming": return "bg-blue-50 text-blue-700 border-blue-200";
    case "ended": return "bg-stone-100 text-stone-500 border-stone-200";
    case "cancelled": return "bg-red-50 text-red-600 border-red-200";
    default: return "bg-stone-100 text-stone-500 border-stone-200";
  }
}

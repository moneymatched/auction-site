import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction } from "@/types";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import AuctionsClient from "./AuctionsClient";

const STATUS_ORDER: Record<string, number> = { live: 0, upcoming: 1, ended: 2 };

async function getAllAuctions(): Promise<Auction[]> {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("auctions")
    .select(`*, property:properties(*, images:property_images(*))`)
    .order("end_time", { ascending: true });
  const auctions = ((data as Auction[]) ?? [])
    .map((auction) => ({
      ...auction,
      status: getEffectiveAuctionStatus(auction),
    }))
    .filter((auction) => auction.status !== "cancelled")
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3));
  return auctions;
}

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await getAllAuctions();
  return <AuctionsClient initialAuctions={auctions} />;
}

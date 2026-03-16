import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction } from "@/types";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import AuctionsClient from "./AuctionsClient";

async function getAllAuctions(): Promise<Auction[]> {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("auctions")
    .select(`*, property:properties(*, images:property_images(*))`)
    .order("status", { ascending: true })
    .order("end_time", { ascending: true });
  const auctions = ((data as Auction[]) ?? []).map((auction) => ({
    ...auction,
    status: getEffectiveAuctionStatus(auction),
  }));
  return auctions;
}

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await getAllAuctions();
  return <AuctionsClient initialAuctions={auctions} />;
}

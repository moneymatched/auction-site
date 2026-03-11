import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction } from "@/types";
import AuctionsClient from "./AuctionsClient";

async function getAllAuctions(): Promise<Auction[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("auctions")
    .select(`*, property:properties(*, images:property_images(*))`)
    .order("status", { ascending: true })
    .order("end_time", { ascending: true });
  return (data as Auction[]) ?? [];
}

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await getAllAuctions();
  return <AuctionsClient initialAuctions={auctions} />;
}

import { createSupabaseServiceClient } from "@/lib/supabase";
import { Property } from "@/types";
import AuctionForm from "../AuctionForm";

export const dynamic = "force-dynamic";

async function getProperties(): Promise<Property[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("id, title")
    .order("title", { ascending: true });
  return (data as Property[]) ?? [];
}

export default async function NewAuctionPage() {
  const properties = await getProperties();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 mb-8">New Auction</h1>
      <AuctionForm properties={properties} />
    </div>
  );
}

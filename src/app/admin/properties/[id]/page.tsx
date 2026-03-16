import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Auction, Property } from "@/types";
import { notFound } from "next/navigation";
import PropertyForm from "../PropertyForm";
import AuctionPanel from "@/components/admin/AuctionPanel";

async function getData(id: string): Promise<{ property: Property; auction: Auction | null } | null> {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();

  const [{ data: property }, { data: auction }] = await Promise.all([
    supabase
      .from("properties")
      .select("*, images:property_images(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("auctions")
      .select("*")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!property) return null;
  return { property: property as Property, auction: auction as Auction | null };
}

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) notFound();

  const { property, auction } = data;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{property.title}</h1>
        <p className="text-sm text-stone-400 mt-1">Property & Auction Management</p>
      </div>

      <PropertyForm property={property} />

      <AuctionPanel property={property} auction={auction} />
    </div>
  );
}

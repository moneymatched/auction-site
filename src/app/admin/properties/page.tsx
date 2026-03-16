import { createSupabaseServiceClient } from "@/lib/supabase";
import { Property } from "@/types";
import Link from "next/link";
import { Plus, MapPin, Maximize2 } from "lucide-react";
import DeleteButton from "@/components/admin/DeleteButton";

type PropertyWithAuction = Property & {
  auctions: { id: string; status: string }[];
};

async function getProperties(): Promise<PropertyWithAuction[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*, images:property_images(*), auctions(id, status)")
    .order("created_at", { ascending: false });
  return (data as PropertyWithAuction[]) ?? [];
}

export const dynamic = "force-dynamic";

function AuctionBadge({ auctions }: { auctions: { id: string; status: string }[] }) {
  const active = auctions.find((a) => a.status === "live" || a.status === "upcoming");
  const ended = auctions.find((a) => a.status === "ended");

  if (active?.status === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    );
  }
  if (active?.status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-sm px-1.5 py-0.5">
        Upcoming
      </span>
    );
  }
  if (ended) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 bg-stone-50 border border-stone-200 rounded-sm px-1.5 py-0.5">
        Ended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-400 border border-stone-200 rounded-sm px-1.5 py-0.5">
      No Auction
    </span>
  );
}

export default async function AdminPropertiesPage() {
  const properties = await getProperties();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Properties</h1>
        <Link href="/admin/properties/new" className="btn-primary text-sm">
          <Plus size={16} />
          Add Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="card p-12 text-center">
          <Maximize2 size={36} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500 mb-4">No properties yet.</p>
          <Link href="/admin/properties/new" className="btn-primary">
            <Plus size={16} />
            Add Your First Property
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-stone-100">
          {properties.map((prop) => {
            const imgCount = prop.images?.length ?? 0;
            return (
              <div key={prop.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                <Link href={`/admin/properties/${prop.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 text-sm">{prop.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <AuctionBadge auctions={prop.auctions ?? []} />
                    {(prop.city || prop.state) && (
                      <span className="flex items-center gap-1 text-xs text-stone-400">
                        <MapPin size={11} />
                        {[prop.city, prop.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {prop.acreage > 0 && (
                      <span className="text-xs text-stone-400">{prop.acreage} ac</span>
                    )}
                    <span className="text-xs text-stone-400">{imgCount} photo{imgCount !== 1 ? "s" : ""}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  <Link href={`/admin/properties/${prop.id}`} className="btn-ghost text-xs">
                    Manage
                  </Link>
                  <DeleteButton endpoint={`/api/properties/${prop.id}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

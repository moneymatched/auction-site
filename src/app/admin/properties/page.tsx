import { createSupabaseServiceClient } from "@/lib/supabase";
import { Property } from "@/types";
import Link from "next/link";
import { Plus, MapPin, Edit, Maximize2 } from "lucide-react";

async function getProperties(): Promise<Property[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*, images:property_images(*)")
    .order("created_at", { ascending: false });
  return (data as Property[]) ?? [];
}

export const dynamic = "force-dynamic";

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
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 text-sm">{prop.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <MapPin size={11} />
                      {prop.city}, {prop.state}
                    </span>
                    {prop.acreage > 0 && (
                      <span className="text-xs text-stone-400">{prop.acreage} ac</span>
                    )}
                    <span className="text-xs text-stone-400">{imgCount} photo{imgCount !== 1 ? "s" : ""}</span>
                    {prop.lat && prop.lng && (
                      <span className="text-xs text-emerald-600">📍 Mapped</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/properties/${prop.id}/edit`}
                  className="btn-ghost text-xs shrink-0 ml-4"
                >
                  <Edit size={13} />
                  Edit
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

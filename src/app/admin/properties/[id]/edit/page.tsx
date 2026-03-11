import { createSupabaseServiceClient } from "@/lib/supabase";
import { Property } from "@/types";
import { notFound } from "next/navigation";
import PropertyForm from "../../PropertyForm";

async function getProperty(id: string): Promise<Property | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*, images:property_images(*)")
    .eq("id", id)
    .single();
  return (data as Property) ?? null;
}

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const property = await getProperty(params.id);
  if (!property) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 mb-8">Edit Property</h1>
      <PropertyForm property={property} />
    </div>
  );
}

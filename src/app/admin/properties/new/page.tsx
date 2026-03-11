import PropertyForm from "../PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 mb-8">New Property</h1>
      <PropertyForm />
    </div>
  );
}

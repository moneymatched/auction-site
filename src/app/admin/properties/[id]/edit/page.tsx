import { redirect } from "next/navigation";

export default function EditPropertyRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/properties/${params.id}`);
}

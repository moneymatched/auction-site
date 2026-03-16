"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteButtonProps {
  endpoint: string;
  label?: string;
}

export default function DeleteButton({ endpoint, label = "Delete" }: DeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;

    const ok = window.confirm("Are you sure you want to delete this?");
    if (!ok) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
        return;
      }
      setError(data.error ?? "Failed to delete");
    } catch {
      setError("Network error while deleting");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 shrink-0">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        {label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

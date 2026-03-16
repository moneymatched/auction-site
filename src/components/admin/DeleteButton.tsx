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
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(endpoint, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error ?? "Failed to delete");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-start gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-ghost text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(""); }}
            disabled={deleting}
            className="btn-ghost text-xs px-2 py-1"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); setConfirming(true); }}
      className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
    >
      <Trash2 size={13} />
      {label}
    </button>
  );
}

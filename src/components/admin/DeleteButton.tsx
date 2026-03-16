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

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-ghost text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="btn-ghost text-xs px-2 py-1"
        >
          Cancel
        </button>
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

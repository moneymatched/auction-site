"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("This link is incomplete. Open the link from your verification email.");
      return;
    }

    let cancelled = false;
    fetch("/api/bidders/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const data = (await r.json()) as { error?: string };
        if (cancelled) return;
        if (!r.ok) {
          setStatus("err");
          setMessage(data.error ?? "Verification failed.");
          return;
        }
        setStatus("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("err");
        setMessage("Network error. Check your connection and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {status === "loading" && (
          <p className="text-stone-600">Verifying your email…</p>
        )}
        {status === "ok" && (
          <>
            <p className="text-lg font-medium text-stone-900">Email confirmed</p>
            <p className="text-stone-600 text-sm leading-relaxed">
              Go back to the auction page (same browser is fine) and place your bid.
            </p>
            <Link href="/" className="btn-primary inline-block mt-2">
              Home
            </Link>
          </>
        )}
        {status === "err" && (
          <>
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              {message}
            </p>
            <Link href="/" className="btn-primary inline-block mt-2">
              Back to site
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center p-6 text-stone-600">
          Loading…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

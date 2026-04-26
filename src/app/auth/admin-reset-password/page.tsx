"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Loader2, Lock } from "lucide-react";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const t = window.setTimeout(() => setTimedOut(true), 8000);
    return () => {
      window.clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || "Could not update password.");
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/admin/login?message=password-reset");
  }

  if (!ready && !timedOut) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-stone-500 text-sm flex items-center gap-2">
          <Loader2 className="animate-spin" size={18} />
          Verifying reset link…
        </div>
      </div>
    );
  }

  if (!ready && timedOut) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm card p-6 text-center space-y-4">
          <p className="text-stone-700 text-sm">This reset link is invalid or has expired. Request a new one from the admin login page.</p>
          <a href="/admin/login" className="btn-primary inline-block w-full text-center">
            Back to admin login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-stone-900 rounded-sm mb-4">
            <Lock size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Set a new password</h1>
          <p className="text-stone-500 text-sm mt-1">Admin account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                "Save password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Loader2, Lock } from "lucide-react";

function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("message") === "password-reset") {
      setInfo("Your password was updated. You can sign in below.");
      router.replace("/admin/login", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("error") !== "forbidden") return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/admin/login", { scroll: false });
        return;
      }
      void supabase.auth.signOut().then(() => {
        setError("This account is not allowed to use the admin area.");
        router.replace("/admin/login", { scroll: false });
      });
    });
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
  }

  async function handleForgotPassword() {
    setError("");
    setInfo("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address first, then click “Forgot password?”.");
      return;
    }
    setResetSending(true);
    const supabase = createSupabaseBrowserClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${origin}/auth/admin-reset-password`,
    });
    setResetSending(false);
    if (resetError) {
      setError(resetError.message || "Could not send reset email.");
      return;
    }
    setInfo("If that email is registered for admin, you will receive a link to choose a new password.");
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-stone-900 rounded-sm mb-4">
            <Lock size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Admin Login</h1>
          <p className="text-stone-500 text-sm mt-1">Going Going Gobbi</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <div className="mt-2 flex flex-col items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={loading || resetSending}
                  className="text-left text-sm font-medium text-stone-800 hover:text-stone-950 underline decoration-stone-400 underline-offset-2 disabled:opacity-50"
                >
                  {resetSending ? "Sending reset email…" : "Forgot password? Email me a reset link"}
                </button>
                <p className="text-xs text-stone-500">
                  Enter your email above, then use this link. Check spam if nothing arrives.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                {error}
              </p>
            )}

            {info && (
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">
                {info}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-stone-400" size={24} />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

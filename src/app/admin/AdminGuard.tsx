"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && pathname !== "/admin/login") {
        router.replace("/admin/login");
      } else {
        setChecking(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== "/admin/login") {
        router.replace("/admin/login");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, pathname]);

  if (checking && pathname !== "/admin/login") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}

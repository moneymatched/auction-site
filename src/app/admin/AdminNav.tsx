"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { LayoutDashboard, Building2, Gavel, LogOut, ExternalLink } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/auctions", label: "Auctions", icon: Gavel },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-stone-200 flex flex-col min-h-screen sticky top-0">
      <div className="p-5 border-b border-stone-200">
        <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Admin</p>
        <p className="font-semibold text-stone-900 text-sm">Going Going Gobbi</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                active
                  ? "bg-stone-100 text-stone-900 font-medium"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-stone-200 space-y-0.5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <ExternalLink size={16} />
          View Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

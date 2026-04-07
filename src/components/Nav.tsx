"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auction_bidder");
      if (raw) {
        const b = JSON.parse(raw);
        if (b?.email_verified_at) setHasAccount(true);
      }
    } catch { /* ignore */ }
  }, []);

  const isAdmin = pathname?.startsWith("/admin");
  if (isAdmin) return null; // Admin has its own layout

  const isHome = pathname === "/";

  const links = [
    { href: "/auctions", label: "Auctions" },
    { href: "/auctions?view=map", label: "Map" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        isHome ? "bg-transparent" : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                isHome ? "text-white" : "text-stone-900"
              }`}
            >
              Going, Going, Gobbi
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm transition-colors ${
                  isHome ? "text-white/80 hover:text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors rounded-sm ml-2 ${
                isHome
                  ? "text-white border border-white/30 hover:bg-white/10"
                  : "text-stone-700 border border-stone-300 hover:bg-stone-100"
              }`}
            >
              <User size={14} />
              {hasAccount ? "My Account" : "Sign In"}
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 rounded-sm transition-colors ${
              isHome ? "text-white hover:bg-white/10" : "btn-ghost"
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className={`md:hidden border-t ${
            isHome ? "border-white/20 bg-stone-900/95 backdrop-blur-sm" : "border-stone-200 bg-white"
          }`}
        >
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 text-sm rounded-sm ${
                  isHome ? "text-white/90 hover:bg-white/10" : "text-stone-700 hover:bg-stone-50"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm font-medium ${
                isHome ? "text-white/90 hover:bg-white/10" : "text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <User size={14} />
              {hasAccount ? "My Account" : "Sign In"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

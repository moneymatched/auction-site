"use client";

import { usePathname } from "next/navigation";
import AdminNav from "./AdminNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <AdminNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

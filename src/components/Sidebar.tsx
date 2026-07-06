"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Tổng quan", icon: "🏠" },
  { href: "/charter", label: "Khởi tạo", icon: "📜" },
  { href: "/contracts", label: "Hợp đồng", icon: "📋" },
  { href: "/cashflow", label: "Dòng tiền", icon: "💰" },
  { href: "/accounts", label: "Tài khoản", icon: "🏦" },
  { href: "/schedule", label: "Tiến độ", icon: "📅" },
  { href: "/materials", label: "Vật tư", icon: "🧱" },
  { href: "/risks", label: "Rủi ro", icon: "⚠️" },
  { href: "/documents", label: "Hồ sơ", icon: "📁" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-52 shrink-0 border-r border-line bg-surface min-h-screen flex flex-col p-3 max-md:w-14">
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <span className="text-xl">🏗️</span>
        <span className="font-bold max-md:hidden">PM4U HomeBuild</span>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                active ? "bg-brand text-white" : "text-ink-2 hover:bg-page"
              }`}
            >
              <span>{n.icon}</span>
              <span className="max-md:hidden">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-page"
      >
        <span>🚪</span>
        <span className="max-md:hidden">Đăng xuất</span>
      </button>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/charter", label: "📜 Điều lệ dự án" },
  { href: "/charter/stakeholders", label: "👥 Bên liên quan" },
];

/** Tab điều hướng giữa Project Charter và Stakeholder Register — 2 trang cùng module Khởi tạo */
export function CharterTabs() {
  const pathname = usePathname();
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-[13px] mb-1">
      {TABS.map((t, i) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 font-semibold ${i > 0 ? "border-l border-line" : ""} ${
              active ? "bg-brand text-white" : "bg-surface hover:bg-page text-ink-2"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/materials", label: "Vật tư dự án" },
  { href: "/materials/catalog", label: "📖 Danh mục tham khảo" },
];

/** Tab điều hướng giữa Vật tư dự án và Danh mục tham khảo — 2 trang cùng module, khác route */
export function MaterialsTabs() {
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

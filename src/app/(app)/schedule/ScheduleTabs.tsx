"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/schedule", label: "Giai đoạn & Nghiệm thu" },
  { href: "/schedule/todo", label: "☑️ Việc cần làm" },
  { href: "/schedule/daily-log", label: "📆 Nhật ký" },
  { href: "/schedule/checklist-templates", label: "✅ Mẫu Checklist" },
  { href: "/schedule/knowledge", label: "📚 Kiến thức" },
  { href: "/schedule/timeline", label: "🖼️ Tiến độ trực quan" },
];

/** Tab điều hướng giữa Tiến độ, Nhật ký và Mẫu Checklist — cùng module, khác route */
export function ScheduleTabs() {
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

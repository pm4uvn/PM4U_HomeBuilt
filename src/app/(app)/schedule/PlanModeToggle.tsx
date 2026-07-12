"use client";

import { useState } from "react";

type Mode = "master" | "detail" | "detailGantt";

/**
 * Chuyển giữa Master Plan (Gantt tổng quan theo giai đoạn — báo cáo/nhìn nhanh), Detail Plan
 * (danh sách đầy đủ milestone, WBS, checklist — làm việc hằng ngày) và Gantt chi tiết (mỗi mốc
 * 1 hàng, thấy chuỗi phụ thuộc giữa các mốc/công việc). Cả 3 đã render sẵn từ server (nhận qua
 * props), component này chỉ ẩn/hiện, không fetch lại dữ liệu.
 */
export function PlanModeToggle({
  master,
  detail,
  detailGantt,
}: {
  master: React.ReactNode;
  detail: React.ReactNode;
  detailGantt: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("master");

  const TABS: { key: Mode; label: string }[] = [
    { key: "master", label: "🗺️ Master Plan" },
    { key: "detail", label: "📋 Detail Plan" },
    { key: "detailGantt", label: "📊 Gantt chi tiết" },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-line overflow-hidden text-[13px]">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={`px-3 py-1.5 font-semibold ${i > 0 ? "border-l border-line" : ""} ${
              mode === t.key ? "bg-brand text-white" : "bg-surface hover:bg-page text-ink-2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {mode === "master" ? master : mode === "detail" ? detail : detailGantt}
    </div>
  );
}

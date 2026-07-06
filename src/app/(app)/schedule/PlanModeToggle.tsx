"use client";

import { useState } from "react";

type Mode = "master" | "detail";

/**
 * Chuyển giữa Master Plan (Gantt tổng quan theo giai đoạn, không chi tiết milestone — dùng để
 * báo cáo/nhìn nhanh) và Detail Plan (đầy đủ milestone, checklist, nghiệm thu — dùng để làm việc
 * hằng ngày). Cả 2 đã render sẵn từ server (nhận qua props), component này chỉ ẩn/hiện, không
 * fetch lại dữ liệu.
 */
export function PlanModeToggle({ master, detail }: { master: React.ReactNode; detail: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("master");

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-line overflow-hidden text-[13px]">
        <button
          type="button"
          onClick={() => setMode("master")}
          className={`px-3 py-1.5 font-semibold ${mode === "master" ? "bg-brand text-white" : "bg-surface hover:bg-page text-ink-2"}`}
        >
          🗺️ Master Plan
        </button>
        <button
          type="button"
          onClick={() => setMode("detail")}
          className={`px-3 py-1.5 font-semibold border-l border-line ${mode === "detail" ? "bg-brand text-white" : "bg-surface hover:bg-page text-ink-2"}`}
        >
          📋 Detail Plan
        </button>
      </div>
      {mode === "master" ? master : detail}
    </div>
  );
}

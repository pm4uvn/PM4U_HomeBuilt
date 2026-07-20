"use client";

import { useState } from "react";
import { TimelineView } from "@/components/Timeline";
import type { ProjectTimeline } from "@/services/timeline.service";
import { DailyStoryView } from "./DailyStoryView";
import type { StoryDay } from "./dailyStory";
import type { TodoItem } from "@/services/todo.service";

/** Chuyển giữa 2 cách kể chuyện tiến độ — nội bộ mới xem được cả 2 (public chỉ có "Theo giai đoạn") */
export function TimelineTabs({
  phaseData, days, noDate,
}: {
  phaseData: ProjectTimeline; days: StoryDay[]; noDate: TodoItem[];
}) {
  const [mode, setMode] = useState<"phase" | "day">("phase");
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-line overflow-hidden text-[13px]">
        {([
          ["phase", "🏗️ Theo giai đoạn"],
          ["day", "📆 Theo ngày"],
        ] as const).map(([key, label], i) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`px-3 py-1.5 font-semibold ${i > 0 ? "border-l border-line" : ""} ${
              mode === key ? "bg-brand text-white" : "bg-surface hover:bg-page text-ink-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "phase" ? <TimelineView data={phaseData} isPublic={false} /> : <DailyStoryView days={days} noDate={noDate} />}
    </div>
  );
}

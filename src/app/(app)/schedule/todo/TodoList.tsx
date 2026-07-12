"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { TodoItem, TodoSource } from "@/services/todo.service";
import { toggleDailyLogItem, toggleMilestoneTask, toggleChecklistItem } from "../actions";
import { toggleRiskMitigationAction } from "../../risks/actions";

const SOURCE_LABEL: Record<TodoSource, string> = {
  DAILY_LOG: "📆 Nhật ký",
  MILESTONE_TASK: "📅 WBS tiến độ",
  MILESTONE_CHECKLIST: "✅ Checklist mốc",
  RISK_MITIGATION: "⚠️ Rủi ro",
};

const FILTERS: { key: TodoSource | "ALL" | "OVERDUE"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OVERDUE", label: "Trễ hạn" },
  { key: "DAILY_LOG", label: "📆 Nhật ký" },
  { key: "MILESTONE_TASK", label: "📅 WBS tiến độ" },
  { key: "MILESTONE_CHECKLIST", label: "✅ Checklist mốc" },
  { key: "RISK_MITIGATION", label: "⚠️ Rủi ro" },
];

async function toggleItem(item: TodoItem) {
  if (item.source === "DAILY_LOG") return toggleDailyLogItem(item.id, true);
  if (item.source === "MILESTONE_TASK") return toggleMilestoneTask(item.id);
  if (item.source === "MILESTONE_CHECKLIST") return toggleChecklistItem(item.id);
  return toggleRiskMitigationAction(item.id, true);
}

export function TodoList({ items }: { items: TodoItem[] }) {
  const [filter, setFilter] = useState<TodoSource | "ALL" | "OVERDUE">("ALL");
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const visible = items.filter((it) => {
    if (doneIds.has(it.id)) return false;
    if (filter === "ALL") return true;
    if (filter === "OVERDUE") return it.isOverdue;
    return it.source === filter;
  });

  const counts = {
    ALL: items.length,
    OVERDUE: items.filter((it) => it.isOverdue).length,
    DAILY_LOG: items.filter((it) => it.source === "DAILY_LOG").length,
    MILESTONE_TASK: items.filter((it) => it.source === "MILESTONE_TASK").length,
    MILESTONE_CHECKLIST: items.filter((it) => it.source === "MILESTONE_CHECKLIST").length,
    RISK_MITIGATION: items.filter((it) => it.source === "RISK_MITIGATION").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-[13px] font-semibold rounded-lg px-3 py-1.5 border ${
              filter === f.key ? "bg-brand text-white border-brand" : "border-line bg-surface hover:bg-page text-ink-2"
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <Card>
        {visible.length === 0 ? (
          <p className="text-center text-muted text-sm py-6">Không có việc nào trong bộ lọc này.</p>
        ) : (
          <div className="divide-y divide-grid">
            {visible.map((it) => (
              <div key={`${it.source}:${it.id}`} className="flex items-start gap-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  disabled={pending}
                  onChange={() => {
                    setDoneIds((prev) => new Set(prev).add(it.id));
                    startTransition(() => toggleItem(it));
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink-2">{it.label}</div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-grid text-muted whitespace-nowrap">{SOURCE_LABEL[it.source]}</span>
                    <span className="text-muted">{it.context}</span>
                    {it.pic && <span className="text-muted">· 👤 {it.pic}</span>}
                    {it.dueDate && (
                      <span style={{ color: it.isOverdue ? "var(--critical)" : "var(--text-muted)" }}>
                        {it.isOverdue && "⚠️ "}Hạn {fmtDate(it.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Link href={it.href} className="text-brand text-xs font-semibold hover:underline shrink-0 whitespace-nowrap">
                  Xem →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

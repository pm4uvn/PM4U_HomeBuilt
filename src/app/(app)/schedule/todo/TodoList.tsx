"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { TodoItem, TodoSource } from "@/services/todo.service";
import { toggleDailyLogItem, toggleMilestoneTask, toggleChecklistItem, updateDailyLogItemFields, updateMilestoneTaskFields } from "../actions";
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

/** Chỉ Nhật ký và WBS tiến độ có field Hạn/PIC riêng trong DB — Checklist mốc và Rủi ro chỉ có label+xong/chưa */
const isEditableSource = (source: TodoSource) => source === "DAILY_LOG" || source === "MILESTONE_TASK";

async function updateDue(item: TodoItem, value: string) {
  if (item.source === "DAILY_LOG") return updateDailyLogItemFields(item.id, { dueDate: value || null });
  if (item.source === "MILESTONE_TASK") return updateMilestoneTaskFields(item.id, { dueDate: value || null });
}

async function updatePic(item: TodoItem, value: string) {
  if (item.source === "DAILY_LOG") return updateDailyLogItemFields(item.id, { pic: value });
  if (item.source === "MILESTONE_TASK") return updateMilestoneTaskFields(item.id, { responsible: value });
}

/** input type="date" cho gõ tay tới 6 chữ số năm khi chưa gõ xong — chỉ lưu DB khi năm hợp lý */
const isSaneDate = (iso: string) => {
  const y = new Date(iso).getFullYear();
  return !isNaN(y) && y >= 1970 && y <= 2200;
};

const EDIT_INPUT = "bg-transparent text-[11px] border border-transparent rounded px-0.5 hover:border-line focus:border-brand outline-none";

/**
 * 1 dòng việc cần làm — Hạn/PIC sửa trực tiếp tại đây cho Nhật ký/WBS tiến độ (2 nguồn có field
 * riêng trong DB). Key gắn theo (id + dueDate + pic) ở nơi gọi để ép remount lấy state mới mỗi khi
 * dữ liệu đổi từ nơi khác (Gantt chi tiết, Detail Plan, Nhật ký) — đảm bảo DB luôn là nguồn duy nhất.
 */
function TodoRow({
  item, onDone,
}: {
  item: TodoItem; onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [due, setDue] = useState(item.dueDate ? item.dueDate.slice(0, 10) : "");
  const [pic, setPic] = useState(item.pic ?? "");
  const editable = isEditableSource(item.source);
  const isLate = !!due && due < new Date().toISOString().slice(0, 10);
  const picListId = `todo-pic-options`;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <input
        type="checkbox"
        className="mt-1 shrink-0"
        disabled={isPending}
        onChange={() => {
          onDone();
          startTransition(() => toggleItem(item));
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-ink-2">{item.label}</div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px]">
          <span className="px-1.5 py-0.5 rounded bg-grid text-muted whitespace-nowrap">{SOURCE_LABEL[item.source]}</span>
          <span className="text-muted">{item.context}</span>

          {editable ? (
            <>
              <span className="flex items-center gap-1 text-muted">
                👤
                <input
                  type="text"
                  list={picListId}
                  value={pic}
                  placeholder="PIC..."
                  className={`${EDIT_INPUT} !w-28`}
                  onChange={(e) => setPic(e.target.value)}
                  onBlur={() => {
                    if (pic !== (item.pic ?? "")) startTransition(() => { void updatePic(item, pic); });
                  }}
                />
              </span>
              <span className="flex items-center gap-1" style={{ color: isLate ? "var(--critical)" : "var(--text-muted)" }}>
                {isLate && "⚠️ "}Hạn
                <input
                  type="date"
                  value={due}
                  className={EDIT_INPUT}
                  style={{ color: isLate ? "var(--critical)" : undefined, borderColor: isLate ? "var(--critical)" : undefined }}
                  onChange={(e) => {
                    setDue(e.target.value);
                    if (e.target.value && !isSaneDate(e.target.value)) return; // đang gõ dở/ngày rác — chưa lưu
                    startTransition(() => { void updateDue(item, e.target.value); });
                  }}
                />
              </span>
            </>
          ) : (
            <>
              {item.pic && <span className="text-muted">· 👤 {item.pic}</span>}
              {item.dueDate && (
                <span style={{ color: item.isOverdue ? "var(--critical)" : "var(--text-muted)" }}>
                  {item.isOverdue && "⚠️ "}Hạn {fmtDate(item.dueDate)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <Link href={item.href} className="text-brand text-xs font-semibold hover:underline shrink-0 whitespace-nowrap">
        Xem →
      </Link>
    </div>
  );
}

export function TodoList({ items, picOptions = [] }: { items: TodoItem[]; picOptions?: string[] }) {
  const [filter, setFilter] = useState<TodoSource | "ALL" | "OVERDUE">("ALL");
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

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
      {/* datalist dùng chung cho mọi ô PIC — combobox: gợi ý sẵn nhưng vẫn gõ tên mới được */}
      <datalist id="todo-pic-options">
        {picOptions.map((p) => <option key={p} value={p} />)}
      </datalist>

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
              <TodoRow
                key={`${it.source}:${it.id}:${it.dueDate}:${it.pic}`}
                item={it}
                onDone={() => setDoneIds((prev) => new Set(prev).add(it.id))}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { TodoItem, TodoSource } from "@/services/todo.service";
import { toggleDailyLogItem, toggleMilestoneTask, toggleChecklistItem, updateDailyLogItemFields, updateMilestoneTaskFields } from "../actions";
import { toggleRiskMitigationAction } from "../../risks/actions";
import { updateIssueStatus } from "../../issues/actions";
import { updateDefectStatus } from "../../defects/actions";

const SOURCE_LABEL: Record<TodoSource, string> = {
  DAILY_LOG: "📆 Nhật ký",
  MILESTONE_TASK: "📅 WBS tiến độ",
  MILESTONE_CHECKLIST: "✅ Checklist mốc",
  RISK_MITIGATION: "⚠️ Rủi ro",
  ISSUE: "🐞 Issue Log",
  DEFECT: "🔧 Bảo hành",
};

const FILTERS: { key: TodoSource | "ALL" | "OVERDUE"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OVERDUE", label: "Trễ hạn" },
  { key: "DAILY_LOG", label: "📆 Nhật ký" },
  { key: "MILESTONE_TASK", label: "📅 WBS tiến độ" },
  { key: "MILESTONE_CHECKLIST", label: "✅ Checklist mốc" },
  { key: "RISK_MITIGATION", label: "⚠️ Rủi ro" },
  { key: "ISSUE", label: "🐞 Issue Log" },
  { key: "DEFECT", label: "🔧 Bảo hành" },
];

/** Bấm tick ở Issue/Bảo hành = đánh dấu đã xử lý xong (RESOLVED/FIXED) — 1 chiều, không bỏ tick lại được ở đây (vào đúng trang để đổi trạng thái chi tiết hơn) */
async function toggleItem(item: TodoItem) {
  if (item.source === "DAILY_LOG") return toggleDailyLogItem(item.id, true);
  if (item.source === "MILESTONE_TASK") return toggleMilestoneTask(item.id);
  if (item.source === "MILESTONE_CHECKLIST") return toggleChecklistItem(item.id);
  if (item.source === "ISSUE") return updateIssueStatus(item.id, "RESOLVED");
  if (item.source === "DEFECT") return updateDefectStatus(item.id, "FIXED");
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

const EDIT_INPUT = "bg-transparent text-[11px] border border-transparent rounded px-0.5 hover:border-line focus:border-brand outline-none w-full";

type SortKey = "label" | "source" | "pic" | "startDate" | "dueDate" | "percentComplete" | "delayDays";
type SortDir = "asc" | "desc";

/**
 * 1 dòng bảng — Hạn/PIC sửa trực tiếp tại đây cho Nhật ký/WBS tiến độ (2 nguồn có field riêng
 * trong DB). Key gắn theo (id + dueDate + pic) ở nơi gọi để ép remount lấy state mới mỗi khi dữ
 * liệu đổi từ nơi khác (Gantt chi tiết, Detail Plan, Nhật ký) — đảm bảo DB luôn là nguồn duy nhất.
 */
function TodoRow({ item, onDone }: { item: TodoItem; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [due, setDue] = useState(item.dueDate ? item.dueDate.slice(0, 10) : "");
  const [pic, setPic] = useState(item.pic ?? "");
  const [picTouched, setPicTouched] = useState(false);
  const editable = isEditableSource(item.source);
  const isLate = !!due && due < new Date().toISOString().slice(0, 10);
  const picListId = "todo-pic-options";

  return (
    <tr className="border-b border-grid last:border-0 align-top">
      <td className="py-2 pr-2">
        <input
          type="checkbox"
          disabled={isPending}
          onChange={() => {
            onDone();
            startTransition(() => toggleItem(item));
          }}
        />
      </td>
      <td className="py-2 pr-2 text-[13px] text-ink-2 max-w-[280px]">{item.label}</td>
      <td className="py-2 pr-2">
        <span className="px-1.5 py-0.5 rounded bg-grid text-muted whitespace-nowrap text-[11px]">{SOURCE_LABEL[item.source]}</span>
      </td>
      <td className="py-2 pr-2 text-muted text-[12px] max-w-[220px]">{item.context}</td>
      <td className="py-2 pr-2 text-[12px]">
        {editable ? (
          <input
            type="text"
            list={picListId}
            value={pic}
            placeholder="PIC..."
            className={EDIT_INPUT}
            onFocus={() => { setPic(""); setPicTouched(false); }} // xóa tạm để datalist hiện đủ danh sách thay vì lọc theo tên đang có sẵn
            onChange={(e) => { setPic(e.target.value); setPicTouched(true); }}
            onBlur={() => {
              if (!picTouched) { setPic(item.pic ?? ""); return; } // chỉ bấm vào rồi bấm ra, chưa chọn/gõ gì -> khôi phục, không lưu rỗng
              if (pic !== (item.pic ?? "")) startTransition(() => { void updatePic(item, pic); });
            }}
          />
        ) : (
          <span className="text-muted">{item.pic ?? "—"}</span>
        )}
      </td>
      <td className="py-2 pr-2 text-[12px] text-muted whitespace-nowrap">{item.startDate ? fmtDate(item.startDate) : "—"}</td>
      <td className="py-2 pr-2 text-[12px] whitespace-nowrap">
        {editable ? (
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
        ) : item.dueDate ? (
          <span style={{ color: item.isOverdue ? "var(--critical)" : "var(--text-muted)" }}>{fmtDate(item.dueDate)}</span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="py-2 pr-2 text-[12px] whitespace-nowrap" style={{ color: item.percentComplete != null && item.percentComplete >= 100 ? "var(--good)" : undefined }}>
        {item.percentComplete != null ? `${item.percentComplete}%` : "—"}
      </td>
      <td className="py-2 pr-2 text-[12px] font-semibold whitespace-nowrap" style={{ color: item.delayDays != null ? "var(--critical)" : undefined }}>
        {item.delayDays != null ? `⚠️ ${item.delayDays}d` : "—"}
      </td>
      <td className="py-2">
        <Link href={item.href} className="text-brand text-xs font-semibold hover:underline whitespace-nowrap">
          Xem →
        </Link>
      </td>
    </tr>
  );
}

export function TodoList({ items, picOptions = [] }: { items: TodoItem[]; picOptions?: string[] }) {
  const [filter, setFilter] = useState<TodoSource | "ALL" | "OVERDUE">("ALL");
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const visible = items.filter((it) => {
    if (doneIds.has(it.id)) return false;
    if (filter === "ALL") return true;
    if (filter === "OVERDUE") return it.isOverdue;
    return it.source === filter;
  });

  const sorted = [...visible].sort((a, b) => {
    let av: string | number | null;
    let bv: string | number | null;
    if (sortKey === "source") { av = SOURCE_LABEL[a.source]; bv = SOURCE_LABEL[b.source]; }
    else { av = a[sortKey]; bv = b[sortKey]; }
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // trống luôn xếp cuối bất kể asc/desc
    if (bv == null) return -1;
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "vi");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const counts = {
    ALL: items.length,
    OVERDUE: items.filter((it) => it.isOverdue).length,
    DAILY_LOG: items.filter((it) => it.source === "DAILY_LOG").length,
    MILESTONE_TASK: items.filter((it) => it.source === "MILESTONE_TASK").length,
    MILESTONE_CHECKLIST: items.filter((it) => it.source === "MILESTONE_CHECKLIST").length,
    RISK_MITIGATION: items.filter((it) => it.source === "RISK_MITIGATION").length,
    ISSUE: items.filter((it) => it.source === "ISSUE").length,
    DEFECT: items.filter((it) => it.source === "DEFECT").length,
  };

  const th = (key: SortKey, label: string) => (
    <th className="py-1.5 pr-2 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(key)}>
      {label}{sortArrow(key)}
    </th>
  );

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
        {sorted.length === 0 ? (
          <p className="text-center text-muted text-sm py-6">Không có việc nào trong bộ lọc này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-grid">
                  <th className="py-1.5 pr-2 font-semibold w-8"></th>
                  {th("label", "Việc cần làm")}
                  {th("source", "Nguồn")}
                  <th className="py-1.5 pr-2 font-semibold">Bối cảnh</th>
                  {th("pic", "PIC")}
                  {th("startDate", "Bắt đầu")}
                  {th("dueDate", "Hạn")}
                  {th("percentComplete", "%")}
                  {th("delayDays", "Trễ")}
                  <th className="py-1.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((it) => (
                  <TodoRow
                    key={`${it.source}:${it.id}:${it.dueDate}:${it.pic}`}
                    item={it}
                    onDone={() => setDoneIds((prev) => new Set(prev).add(it.id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

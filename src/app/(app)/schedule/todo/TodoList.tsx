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
import { DailyLogItemDiscussion, DailyLogItemPhotos, MilestoneTaskPhotos, VoiceNotes } from "../forms";
import { uploadMilestoneTaskVoiceNote, deleteMilestoneTaskPhoto, uploadDailyLogItemVoiceNote, deleteDailyLogItemPhoto } from "../actions";

const SOURCE_LABEL: Record<TodoSource, string> = {
  DAILY_LOG: "📆 Nhật ký",
  MILESTONE_TASK: "📅 WBS tiến độ",
  MILESTONE_CHECKLIST: "✅ Checklist mốc",
  RISK_MITIGATION: "⚠️ Rủi ro",
  ISSUE: "🐞 Issue Log",
  DEFECT: "🔧 Bảo hành",
};

type FilterKey = TodoSource | "ALL" | "OVERDUE" | "DONE";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OVERDUE", label: "Trễ hạn" },
  { key: "DAILY_LOG", label: "📆 Nhật ký" },
  { key: "MILESTONE_TASK", label: "📅 WBS tiến độ" },
  { key: "MILESTONE_CHECKLIST", label: "✅ Checklist mốc" },
  { key: "RISK_MITIGATION", label: "⚠️ Rủi ro" },
  { key: "ISSUE", label: "🐞 Issue Log" },
  { key: "DEFECT", label: "🔧 Bảo hành" },
  { key: "DONE", label: "✔️ Đã hoàn thành" },
];

/** Bấm tick = đảo trạng thái xong/chưa (2 chiều — bấm lại ở tab "Đã hoàn thành" thì quay về chưa xong) */
async function toggleItem(item: TodoItem) {
  const willBeDone = !item.isDone;
  if (item.source === "DAILY_LOG") return toggleDailyLogItem(item.id, willBeDone);
  if (item.source === "MILESTONE_TASK") return toggleMilestoneTask(item.id);
  if (item.source === "MILESTONE_CHECKLIST") return toggleChecklistItem(item.id);
  if (item.source === "ISSUE") return updateIssueStatus(item.id, willBeDone ? "RESOLVED" : "OPEN");
  if (item.source === "DEFECT") return updateDefectStatus(item.id, willBeDone ? "FIXED" : "OPEN");
  return toggleRiskMitigationAction(item.id, willBeDone);
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

type SortKey = "label" | "source" | "context" | "pic" | "startDate" | "dueDate" | "percentComplete" | "delayDays";
type SortDir = "asc" | "desc";

/** So sánh chuỗi kiểu "tự nhiên": tách số ra so sánh bằng giá trị số, không so ký tự -> "10." không
 * còn bị xếp trước "2." (đúng thứ tự thi công 1,2,3...10,11,12 thay vì 1,10,11,12,2,3...) */
function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g;
  const pa = a.match(re) ?? [];
  const pb = b.match(re) ?? [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? "";
    const y = pb[i] ?? "";
    if (x === y) continue;
    const nx = Number(x);
    const ny = Number(y);
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
    return x.localeCompare(y, "vi");
  }
  return 0;
}

/**
 * 1 dòng bảng — Hạn/PIC sửa trực tiếp tại đây cho Nhật ký/WBS tiến độ (2 nguồn có field riêng
 * trong DB). Key gắn theo (id + dueDate + pic) ở nơi gọi để ép remount lấy state mới mỗi khi dữ
 * liệu đổi từ nơi khác (Gantt chi tiết, Detail Plan, Nhật ký) — đảm bảo DB luôn là nguồn duy nhất.
 */
/** Nguồn nào có chỗ gắn bình luận/ảnh/ghi âm — chỉ DAILY_LOG (bình luận, cảm xúc, ảnh, ghi âm) và MILESTONE_TASK (ảnh, ghi âm) */
const hasAttachments = (source: TodoSource) => source === "DAILY_LOG" || source === "MILESTONE_TASK";

function TodoRow({ item, onToggle, myEmail }: { item: TodoItem; onToggle: (willBeDone: boolean) => void; myEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [due, setDue] = useState(item.dueDate ? item.dueDate.slice(0, 10) : "");
  const [pic, setPic] = useState(item.pic ?? "");
  const [picTouched, setPicTouched] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const editable = isEditableSource(item.source);
  const isLate = !!due && due < new Date().toISOString().slice(0, 10);
  const picListId = "todo-pic-options";

  const commentCount = item.comments?.length ?? 0;
  const reactionCount = item.reactions?.reduce((s, r) => s + r.count, 0) ?? 0;
  const photoCount = item.photos?.length ?? 0;
  const voiceCount = item.voiceNotes?.length ?? 0;
  const canExpand = hasAttachments(item.source);

  return (
    <>
      <tr className="border-b border-grid last:border-0 align-top">
        <td className="py-2 pr-2">
          <input
            type="checkbox"
            checked={item.isDone}
            disabled={isPending}
            onChange={() => {
              onToggle(!item.isDone);
              startTransition(() => toggleItem(item));
            }}
          />
        </td>
        <td className="py-2 pr-2 text-[13px] text-ink-2 max-w-[280px]">
          <div className="flex items-start gap-1.5">
            {canExpand && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-muted shrink-0 mt-0.5 text-[11px]"
                title="Bình luận/ảnh/ghi âm"
              >
                {expanded ? "▾" : "▸"}
              </button>
            )}
            <div className="min-w-0">
              <div>{item.label}</div>
              {/* Luôn hiện chỉ dấu bình luận/cảm xúc/ảnh/ghi âm ngay dưới tên việc, không cần mở rộng mới thấy có gì */}
              {(commentCount > 0 || reactionCount > 0 || photoCount > 0 || voiceCount > 0) && (
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
                  {commentCount > 0 && <span>💬 {commentCount}</span>}
                  {reactionCount > 0 && <span>👍 {reactionCount}</span>}
                  {photoCount > 0 && <span>📷 {photoCount}</span>}
                  {voiceCount > 0 && <span>🎙️ {voiceCount}</span>}
                </div>
              )}
            </div>
          </div>
        </td>
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
      {expanded && canExpand && (
        <tr className="border-b border-grid last:border-0">
          <td></td>
          <td colSpan={9} className="pb-3 pt-1">
            {item.source === "DAILY_LOG" ? (
              <div className="space-y-1.5">
                <DailyLogItemDiscussion
                  itemId={item.id}
                  comments={item.comments ?? []}
                  reactions={item.reactions ?? []}
                  myEmail={myEmail}
                />
                <div className="flex flex-wrap gap-3 items-start">
                  <DailyLogItemPhotos itemId={item.id} projectId={item.projectId} photos={item.photos ?? []} />
                  <VoiceNotes
                    notes={item.voiceNotes ?? []}
                    entityId={item.id}
                    projectId={item.projectId}
                    uploadAction={uploadDailyLogItemVoiceNote}
                    onDelete={deleteDailyLogItemPhoto}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 items-start">
                <MilestoneTaskPhotos taskId={item.id} projectId={item.projectId} photos={item.photos ?? []} />
                <VoiceNotes
                  notes={item.voiceNotes ?? []}
                  entityId={item.id}
                  projectId={item.projectId}
                  uploadAction={uploadMilestoneTaskVoiceNote}
                  onDelete={deleteMilestoneTaskPhoto}
                />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function TodoList({
  items: rawItems, picOptions = [], myEmail = "",
}: {
  items: TodoItem[]; picOptions?: string[]; myEmail?: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  // Ghi đè isDone cục bộ ngay khi bấm tick (2 chiều: xong <-> chưa xong) để phản hồi tức thì, không
  // cần đợi revalidate — key theo id, xoá override khi props items mới (từ server) khớp lại giá trị.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  // Mặc định sắp theo Bối cảnh (giai đoạn) — WBS tiến độ/Checklist mốc theo đúng trình tự I → II →
  // III... thay vì trộn lẫn theo hạn, dễ đối chiếu với tiến độ thi công thật.
  const [sortKey, setSortKey] = useState<SortKey>("context");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const items = rawItems.map((it) => (overrides.has(it.id) ? { ...it, isDone: overrides.get(it.id)! } : it));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const visible = items.filter((it) => {
    if (filter === "DONE") return it.isDone;
    if (it.isDone) return false;
    if (filter === "ALL") return true;
    if (filter === "OVERDUE") return it.isOverdue;
    return it.source === filter;
  });

  const sorted = [...visible].sort((a, b) => {
    // Bối cảnh: theo đúng trình tự giai đoạn thi công (phaseOrder) trước, rồi mới đến tên mốc/việc
    // (natural-sort để "10." không bị xếp trước "2." như so sánh chuỗi thường) — không thuộc giai
    // đoạn nào (Nhật ký/Rủi ro/Issue/Bảo hành) thì xếp theo tên bối cảnh, luôn ở cuối.
    if (sortKey === "context") {
      if (a.phaseOrder != null && b.phaseOrder != null && a.phaseOrder !== b.phaseOrder) {
        return sortDir === "asc" ? a.phaseOrder - b.phaseOrder : b.phaseOrder - a.phaseOrder;
      }
      if ((a.phaseOrder == null) !== (b.phaseOrder == null)) return a.phaseOrder == null ? 1 : -1;
      const cmp = naturalCompare(a.context, b.context);
      return sortDir === "asc" ? cmp : -cmp;
    }
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

  const isPending = (it: TodoItem) => !it.isDone;
  const counts: Record<FilterKey, number> = {
    ALL: items.filter(isPending).length,
    OVERDUE: items.filter((it) => isPending(it) && it.isOverdue).length,
    DAILY_LOG: items.filter((it) => isPending(it) && it.source === "DAILY_LOG").length,
    MILESTONE_TASK: items.filter((it) => isPending(it) && it.source === "MILESTONE_TASK").length,
    MILESTONE_CHECKLIST: items.filter((it) => isPending(it) && it.source === "MILESTONE_CHECKLIST").length,
    RISK_MITIGATION: items.filter((it) => isPending(it) && it.source === "RISK_MITIGATION").length,
    ISSUE: items.filter((it) => isPending(it) && it.source === "ISSUE").length,
    DEFECT: items.filter((it) => isPending(it) && it.source === "DEFECT").length,
    DONE: items.filter((it) => it.isDone).length,
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
                  {th("context", "Bối cảnh")}
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
                    onToggle={(willBeDone) => setOverrides((prev) => new Map(prev).set(it.id, willBeDone))}
                    myEmail={myEmail}
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

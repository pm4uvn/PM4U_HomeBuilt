"use client";

/**
 * Gantt chi tiết — mỗi mốc nghiệm thu 1 hàng, nhóm theo giai đoạn.
 * Dependency thể hiện kiểu thác nước (finish-to-start): thanh của mốc sau bắt đầu đúng nơi
 * mốc trước kết thúc (đúng cách spreadDates rải ngày khi tạo tiến độ chuẩn), kèm ke nối ↳
 * giữa các mốc liên tiếp. Mốc nào có công việc WBS thì bấm ▸/▾ để xổ/thu gọn thành từng hàng
 * riêng (mỗi việc 1 thanh con, vị trí chia theo tỷ lệ số ngày trong khoảng của mốc).
 * Mỗi hàng có thêm 3 cột: hạn (due date), PIC, % hoàn thành — mốc thì gộp/suy ra từ WBS
 * (Milestone không có field PIC/% riêng), việc WBS thì sửa trực tiếp (click-to-edit, tự lưu
 * DB qua updateMilestoneTaskFields). Nếu chưa đặt hạn tay, hạn hiển thị tạm suy ra từ vị trí
 * tỷ lệ trong khoảng ngày của mốc (MilestoneTask.dueDate trống -> chỉ là gợi ý, chưa lưu).
 * Bộ lọc "Xem theo" thu hẹp trục thời gian về 1 khoảng cụ thể (tuần/tháng/N tháng tới) — mốc
 * nào không giao với khoảng đang xem thì ẩn hẳn hàng, thanh nào tràn ra ngoài thì bị cắt gọn.
 */
import { useState, useTransition } from "react";
import { Card, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { updateMilestoneTaskFields } from "./actions";

export type DetailGanttTask = {
  id: string;
  name: string;
  durationDays: number;
  responsible: string | null;
  isDone: boolean;
  dueDate: string | null;
  percentComplete: number;
};

export type DetailGanttMilestone = {
  id: string;
  name: string;
  isHoldPoint: boolean;
  status: string;
  plannedDate: string | null;
  tasks: DetailGanttTask[];
};

export type DetailGanttPhase = {
  id: string;
  sortOrder: number;
  name: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  progressPct: number;
  milestones: DetailGanttMilestone[];
};

/** Mốc đầu mỗi tháng trong [min, max] làm trục thời gian — cùng logic với Gantt tổng quan */
function monthTicks(min: number, max: number) {
  const ticks: { pos: number; label: string }[] = [];
  const first = new Date(min);
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  if (cursor.getTime() < min) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() <= max) {
    ticks.push({
      pos: ((cursor.getTime() - min) / (max - min)) * 100,
      label: `T${cursor.getMonth() + 1}/${String(cursor.getFullYear()).slice(2)}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

const DONE_STATUSES = ["APPROVED", "AUTO_APPROVED"];

/** "dd/MM/yyyy" -> "dd/MM" — đủ nhìn ở cột hẹp, năm đã có sẵn trên trục tháng */
const fmtShort = (d: string | Date | null | undefined) => (d ? fmtDate(d).slice(0, 5) : "—");

/** Gộp PIC từ danh sách công việc WBS của 1 mốc — bỏ trùng tên, giới hạn hiển thị gọn */
function summarizePic(tasks: DetailGanttTask[]): string {
  const names = [...new Set(tasks.map((t) => t.responsible).filter(Boolean))] as string[];
  if (names.length === 0) return "—";
  if (names.length <= 2) return names.join(", ");
  return `${names[0]} +${names.length - 1}`;
}

/** Cắt gọn 1 thanh về đúng khung nhìn [0,100]% — dùng khi bộ lọc "Xem theo" thu hẹp trục thời gian */
function clampBar(left: number, width: number): { left: number; width: number } {
  const end = Math.min(100, left + width);
  const clampedLeft = Math.max(0, left);
  return { left: clampedLeft, width: Math.max(0, end - clampedLeft) };
}

type RangeKey = "all" | "week" | "nextWeek" | "month" | "nextMonth" | "2m" | "3m" | "6m";
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "nextWeek", label: "Tuần sau" },
  { key: "month", label: "Tháng này" },
  { key: "nextMonth", label: "Tháng sau" },
  { key: "2m", label: "2 tháng" },
  { key: "3m", label: "3 tháng" },
  { key: "6m", label: "6 tháng" },
];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // về thứ 2 đầu tuần
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return monday;
}

/** Tính khoảng [start, end] cho bộ lọc "Xem theo" — null nghĩa là không giới hạn (Tất cả) */
function getWindow(key: RangeKey, now: Date): { start: Date; end: Date } | null {
  switch (key) {
    case "all":
      return null;
    case "week": {
      const start = startOfWeek(now);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      return { start, end };
    }
    case "nextWeek": {
      const thisMonday = startOfWeek(now);
      const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      return { start, end };
    }
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "nextMonth": {
      const next = addMonths(now, 1);
      return { start: startOfMonth(next), end: endOfMonth(next) };
    }
    case "2m":
      return { start: startOfMonth(now), end: endOfMonth(addMonths(now, 1)) };
    case "3m":
      return { start: startOfMonth(now), end: endOfMonth(addMonths(now, 2)) };
    case "6m":
      return { start: startOfMonth(now), end: endOfMonth(addMonths(now, 5)) };
  }
}

/** Cột: nhãn | thanh Gantt | hạn | PIC | % — dùng chung cho mọi hàng để track thanh luôn thẳng nhau */
const GRID_COLS = "grid-cols-[210px_1fr_104px_92px_50px] max-sm:grid-cols-[130px_1fr]";
const EXTRA_COLS = "max-sm:hidden text-[11px] text-muted truncate";
const EDIT_INPUT = "w-full bg-transparent text-[11px] text-ink-2 border border-transparent rounded px-0.5 hover:border-line focus:border-brand outline-none truncate";

function TicksLayer({ ticks }: { ticks: { pos: number; label: string }[] }) {
  return (
    <>
      {ticks.map((t, i) => (
        <div key={i} className="absolute inset-y-0 w-px" style={{ left: `${t.pos}%`, background: "var(--baseline)", opacity: 0.4 }} />
      ))}
    </>
  );
}

function TodayLine({ pos }: { pos: number }) {
  return <div className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded" style={{ left: `${pos}%`, background: "var(--critical)" }} />;
}

/**
 * 1 hàng việc WBS khi mốc được xổ ra — Hạn/PIC/% sửa trực tiếp (click-to-edit), tự lưu DB.
 * Giữ state cục bộ để gõ mượt, gọi server action lúc onBlur/onChange rồi revalidate từ server.
 */
function TaskRow({
  t, taskLeft, taskWidth, ticks, todayPos, fallbackDue, now,
}: {
  t: DetailGanttTask; taskLeft: number; taskWidth: number;
  ticks: { pos: number; label: string }[]; todayPos: number; fallbackDue: Date; now: number;
}) {
  const [, startTransition] = useTransition();
  const [due, setDue] = useState(t.dueDate ? t.dueDate.slice(0, 10) : "");
  const [pic, setPic] = useState(t.responsible ?? "");
  const [pct, setPct] = useState(t.percentComplete);

  const effectiveDue = due ? new Date(due) : fallbackDue;
  const isDone = pct >= 100;
  const isLate = !isDone && effectiveDue.getTime() < now;

  return (
    <div className={`grid ${GRID_COLS} gap-2.5 items-center py-[2px]`}>
      <div
        className="flex items-center gap-1 text-[11px] truncate pl-8"
        style={{ color: isLate ? "var(--critical)" : isDone ? "var(--good)" : "var(--text-muted)" }}
        title={isLate ? `${t.name} · quá hạn` : isDone ? `${t.name} · ✓ xong` : t.name}
      >
        {isLate && "⚠️ "}
        {isDone && !isLate && "✓ "}
        <span className={isDone ? "line-through" : ""}>{t.name}</span>
      </div>
      <div className="relative h-2.5 rounded bg-grid overflow-visible">
        <TicksLayer ticks={ticks} />
        <div
          className="absolute inset-y-0 rounded-sm"
          title={`${t.name} · ~${t.durationDays} ngày${pic ? ` · ${pic}` : ""} · ${pct}%${isLate ? " · ⚠️ quá hạn" : ""}`}
          style={{
            left: `${taskLeft}%`,
            width: `${taskWidth}%`,
            background: "var(--seq-150)",
            outline: isLate ? "1px solid var(--critical)" : undefined,
          }}
        />
        {pct > 0 && (
          <div
            className="absolute inset-y-0 rounded-sm"
            style={{ left: `${taskLeft}%`, width: `${(taskWidth * pct) / 100}%`, background: isDone ? "var(--good)" : "var(--series-1)" }}
          />
        )}
        <TodayLine pos={todayPos} />
      </div>
      <input
        type="date"
        className={EDIT_INPUT}
        value={due}
        title={isLate ? "Quá hạn" : undefined}
        style={{ color: isLate ? "var(--critical)" : undefined, borderColor: isLate ? "var(--critical)" : undefined }}
        onChange={(e) => {
          setDue(e.target.value);
          startTransition(() => {
            void updateMilestoneTaskFields(t.id, { dueDate: e.target.value || null });
          });
        }}
      />
      <input
        type="text"
        list="detail-gantt-pic-options"
        className={EDIT_INPUT}
        value={pic}
        placeholder="—"
        onChange={(e) => setPic(e.target.value)}
        onBlur={() => {
          if (pic !== (t.responsible ?? "")) startTransition(() => { void updateMilestoneTaskFields(t.id, { responsible: pic }); });
        }}
      />
      <input
        type="number"
        min={0}
        max={100}
        className={EDIT_INPUT}
        style={{ color: isDone ? "var(--good)" : undefined }}
        value={pct}
        onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        onBlur={() => {
          if (pct !== t.percentComplete) startTransition(() => { void updateMilestoneTaskFields(t.id, { percentComplete: pct }); });
        }}
      />
    </div>
  );
}

export function DetailGantt({ phases, picOptions = [] }: { phases: DetailGanttPhase[]; picOptions?: string[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [rangeKey, setRangeKey] = useState<RangeKey>("all");
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Trục thời gian chung cho cả dự án: gộp ngày giai đoạn + ngày mốc
  const allDates: number[] = [];
  for (const p of phases) {
    if (p.plannedStart) allDates.push(+new Date(p.plannedStart));
    if (p.plannedEnd) allDates.push(+new Date(p.plannedEnd));
    for (const m of p.milestones) if (m.plannedDate) allDates.push(+new Date(m.plannedDate));
  }
  if (allDates.length === 0) {
    return (
      <Card title="Gantt chi tiết theo mốc nghiệm thu">
        <EmptyState title="Chưa có mốc nào có ngày kế hoạch" />
      </Card>
    );
  }

  const now = Date.now();
  const win = getWindow(rangeKey, new Date(now));
  const min = win ? win.start.getTime() : Math.min(...allDates);
  const max = win ? win.end.getTime() : Math.max(...allDates);
  const span = Math.max(1, max - min);
  const todayPos = Math.min(100, Math.max(0, ((now - min) / span) * 100));
  const ticks = monthTicks(min, max);
  const pos = (iso: string) => ((+new Date(iso) - min) / span) * 100;
  /** Ngược lại pos(): % vị trí trên trục -> ngày thực — dùng để suy ra hạn của việc WBS */
  const dateAtPos = (p: number) => new Date(min + (p / 100) * span);

  let anyRowVisible = false;

  const rangeButtons = (
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-[11.5px] mb-2">
      {RANGE_OPTIONS.map((r, i) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setRangeKey(r.key)}
          className={`px-2.5 py-1 font-semibold ${i > 0 ? "border-l border-line" : ""} ${
            rangeKey === r.key ? "bg-brand text-white" : "bg-surface hover:bg-page text-ink-2"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  return (
    <Card title="Gantt chi tiết theo mốc nghiệm thu">
      {/* datalist dùng chung cho mọi ô PIC — combobox: gợi ý sẵn nhưng vẫn gõ tên mới được, giống Nhật ký thi công */}
      <datalist id="detail-gantt-pic-options">
        {picOptions.map((p) => <option key={p} value={p} />)}
      </datalist>
      {rangeButtons}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Trục tháng */}
          <div className={`grid ${GRID_COLS} gap-2.5 text-[11px] text-muted pb-1 border-b border-grid mb-1`}>
            <span>Giai đoạn / Mốc nghiệm thu</span>
            <div className="relative h-4">
              {ticks.map((t, i) => (
                <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${t.pos}%` }}>
                  {t.label}
                </span>
              ))}
            </div>
            <span className="max-sm:hidden">Hạn</span>
            <span className="max-sm:hidden">PIC</span>
            <span className="max-sm:hidden">%</span>
          </div>

          {phases.map((phase) => {
            const dated = phase.milestones
              .filter((m) => m.plannedDate)
              .sort((a, b) => +new Date(a.plannedDate!) - +new Date(b.plannedDate!));
            const undated = phase.milestones.filter((m) => !m.plannedDate);

            /** Mốc có giao với khoảng đang xem không (theo ngày thực, không phụ thuộc % vị trí) */
            const isMilestoneInWindow = (idx: number) => {
              if (!win) return true;
              const startIso = idx === 0 ? (phase.plannedStart ?? dated[idx].plannedDate!) : dated[idx - 1].plannedDate!;
              const s = +new Date(startIso);
              const e = +new Date(dated[idx].plannedDate!);
              return e >= win.start.getTime() && s <= win.end.getTime();
            };
            const phaseRangeInWindow =
              !win ||
              (!!phase.plannedStart &&
                !!phase.plannedEnd &&
                +new Date(phase.plannedEnd) >= win.start.getTime() &&
                +new Date(phase.plannedStart) <= win.end.getTime());
            const anyMilestoneInWindow = dated.some((_, idx) => isMilestoneInWindow(idx));
            if (win && !phaseRangeInWindow && !anyMilestoneInWindow) return null;
            anyRowVisible = true;

            return (
              <div key={phase.id} className="mb-1">
                {/* Hàng giai đoạn — khoảng bao [plannedStart, plannedEnd] làm nền tham chiếu */}
                <div className={`grid ${GRID_COLS} gap-2.5 items-center py-1`}>
                  <div className="text-[13px] font-bold truncate">
                    {phase.sortOrder}. {phase.name}
                    <span className="text-muted font-normal text-xs"> · {phase.progressPct}%</span>
                  </div>
                  <div className="relative h-2 rounded bg-grid">
                    {phase.plannedStart && phase.plannedEnd && (() => {
                      const { left, width } = clampBar(pos(phase.plannedStart), Math.max(0.5, pos(phase.plannedEnd) - pos(phase.plannedStart)));
                      return (
                        <div
                          className="absolute inset-y-0 rounded opacity-50"
                          style={{ left: `${left}%`, width: `${width}%`, background: "var(--seq-150)" }}
                        />
                      );
                    })()}
                    <TodayLine pos={todayPos} />
                  </div>
                  <span className={EXTRA_COLS}>{fmtShort(phase.plannedEnd)}</span>
                  <span className={EXTRA_COLS}></span>
                  <span className={EXTRA_COLS}>{phase.progressPct}%</span>
                </div>

                {/* Từng mốc — thanh chạy từ mốc trước tới mốc này (chuỗi finish-to-start) */}
                {dated.map((m, idx) => {
                  if (win && !isMilestoneInWindow(idx)) return null;
                  const end = pos(m.plannedDate!);
                  const startIso = idx === 0 ? (phase.plannedStart ?? m.plannedDate!) : dated[idx - 1].plannedDate!;
                  const rawStart = Math.min(pos(startIso), end);
                  const rawWidth = Math.max(0.6, end - rawStart);
                  const { left: start, width } = clampBar(rawStart, rawWidth);
                  const connectorLeft = Math.max(0, Math.min(100, rawStart));
                  const totalTaskDays = m.tasks.reduce((s, t) => s + t.durationDays, 0);
                  const hasTasks = m.tasks.length > 0 && totalTaskDays > 0;
                  const open = openIds.has(m.id);
                  const doneCount = m.tasks.filter((t) => t.isDone).length;
                  const statusDone = DONE_STATUSES.includes(m.status);
                  const msPct = hasTasks
                    ? Math.round(m.tasks.reduce((s, t) => s + t.percentComplete, 0) / m.tasks.length)
                    : statusDone
                      ? 100
                      : 0;
                  // Đã xong nếu nghiệm thu đạt HOẶC toàn bộ WBS con đã 100% — không báo quá hạn khi đã xong
                  const isDone = statusDone || msPct >= 100;
                  const isLate = !isDone && +new Date(m.plannedDate!) < now;
                  const msPic = hasTasks ? summarizePic(m.tasks) : "—";

                  return (
                    <div key={m.id}>
                      <div className={`grid ${GRID_COLS} gap-2.5 items-center py-[3px]`}>
                        <div className="flex items-center gap-1 text-[12px] text-ink-2 truncate pl-2" title={m.name}>
                          {hasTasks ? (
                            <button
                              type="button"
                              onClick={() => toggle(m.id)}
                              className="text-muted shrink-0 w-3.5 text-center"
                              title={open ? "Thu gọn WBS" : `Xổ ${m.tasks.length} công việc`}
                            >
                              {open ? "▾" : "▸"}
                            </button>
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          {m.isHoldPoint && "⛔ "}
                          {isLate && "⚠️ "}
                          <span className="truncate" style={{ color: isLate ? "var(--critical)" : isDone ? "var(--good)" : undefined }}>{m.name}</span>
                          {hasTasks && (
                            <span className="text-muted shrink-0 text-[10px]">({doneCount}/{m.tasks.length})</span>
                          )}
                        </div>
                        <div className="relative h-3 rounded bg-grid overflow-visible">
                          <TicksLayer ticks={ticks} />
                          {/* Ke nối dependency: mốc này bắt đầu nơi mốc trước kết thúc */}
                          {idx > 0 && (
                            <div
                              className="absolute w-px"
                              style={{ left: `${connectorLeft}%`, top: "-9px", height: "9px", background: "var(--baseline)" }}
                            />
                          )}
                          {/* Thu gọn: 1 thanh duy nhất, chia đoạn theo WBS làm gợi ý. Xổ ra: ẩn thanh này, mỗi việc có hàng riêng bên dưới */}
                          {!open &&
                            (hasTasks ? (
                              (() => {
                                let acc = 0;
                                return m.tasks.map((t) => {
                                  const rawSegLeft = rawStart + (acc / totalTaskDays) * rawWidth;
                                  const rawSegWidth = Math.max(0.4, (t.durationDays / totalTaskDays) * rawWidth - 0.15);
                                  acc += t.durationDays;
                                  const taskDue = t.dueDate ? new Date(t.dueDate) : dateAtPos(rawSegLeft + rawSegWidth);
                                  const taskLate = t.percentComplete < 100 && taskDue.getTime() < now;
                                  const { left: segLeft, width: segWidth } = clampBar(rawSegLeft, rawSegWidth);
                                  return (
                                    <div
                                      key={t.id}
                                      className="absolute inset-y-0 rounded-sm"
                                      title={`${t.name} · ~${t.durationDays} ngày${t.responsible ? ` · ${t.responsible}` : ""} · ${t.percentComplete}%${taskLate ? " · ⚠️ quá hạn" : t.isDone ? " · ✓ xong" : ""}`}
                                      style={{
                                        left: `${segLeft}%`,
                                        width: `${segWidth}%`,
                                        background: t.isDone ? "var(--good)" : "var(--seq-150)",
                                        outline: taskLate ? "1px solid var(--critical)" : undefined,
                                      }}
                                    />
                                  );
                                });
                              })()
                            ) : (
                              <div
                                className="absolute inset-y-0 rounded-sm"
                                title={`${m.name} · hạn ${fmtDate(m.plannedDate)}`}
                                style={{
                                  left: `${start}%`,
                                  width: `${width}%`,
                                  background: isDone ? "var(--good)" : "var(--seq-150)",
                                  outline: isLate ? "1px solid var(--critical)" : undefined,
                                }}
                              />
                            ))}
                          <TodayLine pos={todayPos} />
                        </div>
                        <span className={EXTRA_COLS} style={{ color: isLate ? "var(--critical)" : undefined }} title={isLate ? "Quá hạn" : fmtDate(m.plannedDate)}>
                          {isLate && "⚠️ "}{fmtShort(m.plannedDate)}
                        </span>
                        <span className={EXTRA_COLS} title={msPic}>{msPic}</span>
                        <span className={EXTRA_COLS} style={{ color: msPct >= 100 ? "var(--good)" : undefined }}>{msPct}%</span>
                      </div>

                      {/* Xổ ra: mỗi công việc WBS 1 hàng riêng, vị trí theo tỷ lệ số ngày trong khoảng của mốc */}
                      {open &&
                        hasTasks &&
                        (() => {
                          let acc = 0;
                          return m.tasks.map((t) => {
                            const rawLeft = rawStart + (acc / totalTaskDays) * rawWidth;
                            const rawTaskWidth = Math.max(0.4, (t.durationDays / totalTaskDays) * rawWidth);
                            acc += t.durationDays;
                            const fallbackDue = dateAtPos(rawLeft + rawTaskWidth);
                            const { left: taskLeft, width: taskWidth } = clampBar(rawLeft, rawTaskWidth);
                            return (
                              <TaskRow
                                key={`${t.id}-${t.dueDate}-${t.responsible}-${t.percentComplete}`}
                                t={t}
                                taskLeft={taskLeft}
                                taskWidth={taskWidth}
                                ticks={ticks}
                                todayPos={todayPos}
                                fallbackDue={fallbackDue}
                                now={now}
                              />
                            );
                          });
                        })()}
                    </div>
                  );
                })}
                {undated.length > 0 && (
                  <p className="text-[11px] text-muted pl-4 py-0.5">
                    +{undated.length} mốc chưa đặt ngày (không hiện trên Gantt): {undated.map((m) => m.name).join(", ")}
                  </p>
                )}
              </div>
            );
          })}

          {!anyRowVisible && (
            <EmptyState title="Không có giai đoạn/mốc nào trong khoảng thời gian đang xem" sub="Thử chọn “Tất cả” hoặc khoảng thời gian khác" />
          )}

          <div className="flex gap-3.5 flex-wrap text-[12.5px] text-ink-2 mt-2.5 pt-2 border-t border-grid">
            <span><span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--good)" }} />Đã xong</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--series-1)" }} />Đang làm (đúng tiến độ)</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--seq-150)" }} />Kế hoạch (chưa bắt đầu)</span>
            <span style={{ color: "var(--critical)" }}><span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "transparent", outline: "1.5px solid var(--critical)" }} />⚠️ Quá hạn</span>
            <span><span className="inline-block w-0.5 h-3 mr-1 align-[-2px]" style={{ background: "var(--critical)" }} />Hôm nay</span>
            <span>⛔ Điểm dừng nghiệm thu</span>
            <span className="text-muted">Bấm ▸ cạnh mốc để xổ WBS thành từng hàng riêng</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

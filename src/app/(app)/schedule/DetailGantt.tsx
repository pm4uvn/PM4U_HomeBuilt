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
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Card, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { updateMilestoneTaskFields, updateMilestoneFields } from "./actions";

export type DetailGanttTask = {
  id: string;
  name: string;
  durationDays: number;
  responsible: string | null;
  isDone: boolean;
  dueDate: string | null;
  percentComplete: number;
  dependsOn?: string[];
};

export type DetailGanttMilestone = {
  id: string;
  name: string;
  isHoldPoint: boolean;
  status: string;
  plannedDate: string | null;
  responsible: string | null;
  percentComplete: number | null;
  tasks: DetailGanttTask[];
  dependsOn?: string[];
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

// Mảng rỗng dùng chung làm default param — tránh tạo literal [] mới mỗi lần render, vì [] mới sẽ
// luôn "khác" mảng cũ về reference, khiến useEffect có nó trong dependency-array chạy lặp vô hạn.
const EMPTY_ARR: never[] = [];

export type DependencyEdge = {
  predType: "MILESTONE" | "MILESTONE_TASK";
  predId: string;
  succType: "MILESTONE" | "MILESTONE_TASK";
  succId: string;
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

/**
 * input type="date" cho gõ tay tới 6 chữ số năm khi chưa gõ xong (VD lỡ tay ra "82926-09-16") —
 * chỉ coi là hạn hợp lệ để lưu DB khi năm nằm trong khoảng dự án thực tế.
 */
function isSaneDate(iso: string): boolean {
  const y = new Date(iso).getFullYear();
  return !isNaN(y) && y >= 1970 && y <= 2200;
}

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
const GRID_COLS = "grid-cols-[300px_1fr_92px_92px_88px_50px] max-sm:grid-cols-[160px_1fr]";
const EXTRA_COLS = "max-sm:hidden text-[12px] text-muted truncate";
const EDIT_INPUT = "w-full bg-transparent text-[12px] text-ink-2 border border-transparent rounded px-0.5 hover:border-line focus:border-brand outline-none truncate";

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
/** Dòng phụ nhỏ "⛓ Phụ thuộc: X, Y" hiện dưới tên mốc/việc khi có predecessor — chỉ hiển thị, không sửa được ở đây */
function DependsOnLine({ names }: { names?: string[] }) {
  if (!names || names.length === 0) return null;
  return (
    <div className="text-[11px] text-muted italic truncate" title={`Phụ thuộc: ${names.join(", ")}`}>
      ⛓ Phụ thuộc: {names.join(", ")}
    </div>
  );
}

function TaskRow({
  t, taskLeft, taskWidth, ticks, todayPos, fallbackDue, now, barRef, isSelected, isRelated, onSelect,
}: {
  t: DetailGanttTask; taskLeft: number; taskWidth: number;
  ticks: { pos: number; label: string }[]; todayPos: number; fallbackDue: Date; now: number;
  barRef?: (el: HTMLDivElement | null) => void;
  isSelected?: boolean; isRelated?: boolean; onSelect?: () => void;
}) {
  const [, startTransition] = useTransition();
  const [due, setDue] = useState(t.dueDate ? t.dueDate.slice(0, 10) : "");
  const [pic, setPic] = useState(t.responsible ?? "");
  const [picTouched, setPicTouched] = useState(false);
  const [pct, setPct] = useState(t.percentComplete);

  const effectiveDue = due ? new Date(due) : fallbackDue;
  const isDone = pct >= 100;
  const isLate = !isDone && effectiveDue.getTime() < now;
  const [start, setStart] = useState(() => new Date(effectiveDue.getTime() - t.durationDays * 86_400_000).toISOString().slice(0, 10));

  return (
    <div
      className={`grid ${GRID_COLS} gap-2.5 items-start py-1`}
      style={{
        background: isSelected
          ? "color-mix(in srgb, var(--series-1) 22%, transparent)"
          : isRelated
            ? "color-mix(in srgb, var(--series-1) 10%, transparent)"
            : undefined,
      }}
    >
      <div
        className="flex items-start gap-1 text-[12px] pl-8 leading-snug cursor-pointer"
        style={{ color: isLate ? "var(--critical)" : isDone ? "var(--good)" : "var(--text-muted)" }}
        title={isLate ? `${t.name} · quá hạn` : isDone ? `${t.name} · ✓ xong` : t.name}
        onClick={onSelect}
      >
        <div className="min-w-0">
          {isLate && "⚠️ "}
          {isDone && !isLate && "✓ "}
          <span className={isDone ? "line-through" : ""}>{t.name}</span>
          <DependsOnLine names={t.dependsOn} />
        </div>
      </div>
      <div ref={barRef} className="relative h-3 rounded bg-grid overflow-visible">
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
      {/* Bắt đầu không có field riêng trong DB (MilestoneTask chỉ lưu dueDate + durationDays) — sửa
          ngày bắt đầu thực chất là ghi lại durationDays = Hạn - Bắt đầu, giữ nguyên Hạn đã chọn. */}
      <input
        type="date"
        className={EDIT_INPUT}
        value={start}
        title="Bắt đầu (suy ra số ngày dự kiến = Hạn − Bắt đầu)"
        onChange={(e) => {
          setStart(e.target.value);
          if (!e.target.value || !isSaneDate(e.target.value)) return;
          const newStart = new Date(e.target.value);
          const days = Math.max(1, Math.round((effectiveDue.getTime() - newStart.getTime()) / 86_400_000));
          startTransition(() => { void updateMilestoneTaskFields(t.id, { durationDays: days }); });
        }}
      />
      <input
        type="date"
        className={EDIT_INPUT}
        value={due}
        title={isLate ? "Quá hạn" : undefined}
        style={{ color: isLate ? "var(--critical)" : undefined, borderColor: isLate ? "var(--critical)" : undefined }}
        onChange={(e) => {
          setDue(e.target.value);
          if (e.target.value && !isSaneDate(e.target.value)) return; // đang gõ dở/ngày rác — chưa lưu
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
        onFocus={() => { setPic(""); setPicTouched(false); }} // xóa tạm để datalist hiện đủ danh sách thay vì lọc theo tên đang có sẵn
        onChange={(e) => { setPic(e.target.value); setPicTouched(true); }}
        onBlur={() => {
          if (!picTouched) { setPic(t.responsible ?? ""); return; } // chỉ bấm vào rồi bấm ra, chưa chọn/gõ gì -> khôi phục, không lưu rỗng
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

/**
 * 3 ô Bắt đầu/Hạn/PIC/% ở hàng mốc — Hạn luôn sửa được trực tiếp (đổi thì tự dời lịch dây chuyền
 * qua updateMilestoneFields). PIC/% chỉ sửa tay được khi mốc CHƯA có WBS con (hasTasks=false) — có
 * WBS rồi thì 2 giá trị này PHẢI gộp tự động từ WBS (msPic/msPct truyền vào), sửa tay sẽ lệch nguồn
 * dữ liệu nên chỉ hiện dạng chữ, không cho sửa.
 */
function MilestoneEditCells({
  m, startIso, hasTasks, msPic, msPct, isDone,
}: {
  m: DetailGanttMilestone; startIso: string; hasTasks: boolean; msPic: string; msPct: number; isDone: boolean;
}) {
  const [, startTransition] = useTransition();
  const [due, setDue] = useState(m.plannedDate ? m.plannedDate.slice(0, 10) : "");
  const [pic, setPic] = useState(m.responsible ?? "");
  const [picTouched, setPicTouched] = useState(false);
  const [pct, setPct] = useState(m.percentComplete ?? 0);
  const isLate = !isDone && !!due && new Date(due).getTime() < Date.now();

  return (
    <>
      <span className={EXTRA_COLS} title={fmtDate(startIso)}>{fmtShort(startIso)}</span>
      <input
        type="date"
        className={EDIT_INPUT}
        value={due}
        title={isLate ? "Quá hạn" : undefined}
        style={{ color: isLate ? "var(--critical)" : undefined, borderColor: isLate ? "var(--critical)" : undefined }}
        onChange={(e) => {
          setDue(e.target.value);
          if (e.target.value && !isSaneDate(e.target.value)) return;
          startTransition(() => { void updateMilestoneFields(m.id, { plannedDate: e.target.value || null }); });
        }}
      />
      {hasTasks ? (
        <span className={EXTRA_COLS} title={msPic}>{msPic}</span>
      ) : (
        <input
          type="text"
          list="detail-gantt-pic-options"
          className={EDIT_INPUT}
          value={pic}
          placeholder="—"
          onFocus={() => { setPic(""); setPicTouched(false); }}
          onChange={(e) => { setPic(e.target.value); setPicTouched(true); }}
          onBlur={() => {
            if (!picTouched) { setPic(m.responsible ?? ""); return; }
            if (pic !== (m.responsible ?? "")) startTransition(() => { void updateMilestoneFields(m.id, { responsible: pic }); });
          }}
        />
      )}
      {hasTasks ? (
        <span className={EXTRA_COLS} style={{ color: msPct >= 100 ? "var(--good)" : undefined }}>{msPct}%</span>
      ) : (
        <input
          type="number"
          min={0}
          max={100}
          className={EDIT_INPUT}
          style={{ color: pct >= 100 ? "var(--good)" : undefined }}
          value={pct}
          onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          onBlur={() => {
            if (pct !== (m.percentComplete ?? 0)) startTransition(() => { void updateMilestoneFields(m.id, { percentComplete: pct }); });
          }}
        />
      )}
    </>
  );
}

export function DetailGantt({
  phases, picOptions = EMPTY_ARR, dependencyEdges = EMPTY_ARR,
}: {
  phases: DetailGanttPhase[]; picOptions?: string[]; dependencyEdges?: DependencyEdge[];
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  // Mặc định "Tháng này" thay vì "Tất cả" — xem toàn bộ ~30 mốc 1 lúc luôn dài hơn 1 màn hình, phải
  // cuộn trang; thu hẹp theo tháng cho vừa màn hình hơn, người dùng vẫn bấm "Tất cả" khi cần xem hết.
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  // Tìm theo tên mốc/việc — khi đang gõ tìm, bỏ qua giới hạn "Xem theo" (mốc khớp có thể nằm ngoài
  // tháng/tuần đang chọn) để tìm được xuyên suốt cả dự án, không chỉ trong khung thời gian hiện tại.
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const [fullscreen, setFullscreen] = useState(false);
  // "Toàn màn hình" dùng Fullscreen API thật (không chỉ CSS position:fixed) — nếu trang đang được
  // xem trong 1 khung xem trước/iframe cỡ cố định (VD panel preview trong IDE), CSS fixed chỉ phủ
  // đúng khung đó chứ không chiếm được toàn màn hình vật lý; requestFullscreen() mới thoát hẳn ra được.
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setFullscreen(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (fullscreen && portalRef.current && document.fullscreenElement !== portalRef.current) {
      portalRef.current.requestFullscreen?.().catch(() => {});
    }
    if (!fullscreen && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [fullscreen]);
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Bấm vào 1 mốc/công việc -> tô sáng các mốc/công việc phụ thuộc trực tiếp (1 nấc, cả 2 chiều)
  // và chỉ vẽ mũi tên cho đúng các quan hệ đó — tránh rối mắt khi hiện hết 38 mũi tên cùng lúc.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const relatedKeys = (() => {
    if (!selectedKey) return null;
    const related = new Set<string>([selectedKey]);
    for (const e of dependencyEdges) {
      const pk = `${e.predType}:${e.predId}`;
      const sk = `${e.succType}:${e.succId}`;
      if (pk === selectedKey) related.add(sk);
      if (sk === selectedKey) related.add(pk);
    }
    return related;
  })();
  // useMemo bắt buộc: .filter() luôn tạo mảng mới mỗi lần render, nếu không nhớ lại reference thì
  // useLayoutEffect bên dưới (có selectableEdges trong dependency-array) sẽ lặp vô hạn y hệt lỗi trước.
  const selectableEdges = useMemo(
    () =>
      selectedKey
        ? dependencyEdges.filter((e) => `${e.predType}:${e.predId}` === selectedKey || `${e.succType}:${e.succId}` === selectedKey)
        : EMPTY_ARR,
    [selectedKey, dependencyEdges],
  );
  const toggleSelect = (key: string) => setSelectedKey((s) => (s === key ? null : key));

  // Đường nối mũi tên dependency: ref chỉ gắn trên track full-width (0-100%) của mỗi hàng — điểm neo
  // mũi tên phải là mép của THANH MÀU thực tế (theo leftPct/widthPct đã tính riêng cho hàng đó khi
  // render), không phải mép track, nên lưu kèm leftPct/widthPct cùng lúc với ref.
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Map<string, { el: HTMLDivElement; leftPct: number; widthPct: number }>>(new Map());
  const registerBarRef = (key: string, el: HTMLDivElement | null, leftPct: number, widthPct: number) => {
    if (el) barRefs.current.set(key, { el, leftPct, widthPct });
    else barRefs.current.delete(key);
  };
  const [arrows, setArrows] = useState<{ key: string; x1: number; y1: number; x2: number; y2: number }[]>([]);
  // SVG cần width/height tính bằng số px cụ thể — containerRef có chiều cao "auto" theo nội dung nên
  // CSS height:100% trên overlay tuyệt đối bên trong sẽ không tự resolve được (spec CSS box percentage).
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    function recompute() {
      const cont = containerRef.current;
      if (!cont) return;
      const contRect = cont.getBoundingClientRect();
      setSvgSize({ width: cont.scrollWidth, height: cont.scrollHeight });
      const next: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
      // Chỉ vẽ mũi tên cho quan hệ liên quan tới mốc/việc đang được bấm chọn (selectableEdges) —
      // không chọn gì thì không vẽ mũi tên nào cả, tránh rối mắt với hàng chục mũi tên cùng lúc.
      for (const e of selectableEdges) {
        const pred = barRefs.current.get(`${e.predType}:${e.predId}`);
        const succ = barRefs.current.get(`${e.succType}:${e.succId}`);
        if (!pred || !succ) continue; // hàng đang ẩn (thu gọn WBS / ngoài khoảng lọc) -> bỏ qua mũi tên này
        const predTrack = pred.el.getBoundingClientRect();
        const succTrack = succ.el.getBoundingClientRect();
        next.push({
          key: `${e.predType}:${e.predId}->${e.succType}:${e.succId}`,
          x1: predTrack.left - contRect.left + ((pred.leftPct + pred.widthPct) / 100) * predTrack.width,
          y1: predTrack.top - contRect.top + predTrack.height / 2,
          x2: succTrack.left - contRect.left + (succ.leftPct / 100) * succTrack.width,
          y2: succTrack.top - contRect.top + succTrack.height / 2,
        });
      }
      setArrows(next);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases, openIds, rangeKey, selectableEdges, fullscreen]);

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
  const win = q ? null : getWindow(rangeKey, new Date(now));
  const milestoneMatches = (m: DetailGanttMilestone) =>
    !q || m.name.toLowerCase().includes(q) || m.tasks.some((t) => t.name.toLowerCase().includes(q));
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
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-[11.5px]">
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

  const fullscreenButton = (
    <button
      type="button"
      onClick={() => setFullscreen((f) => !f)}
      className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border border-line text-ink-2 hover:bg-page shrink-0"
    >
      {fullscreen ? "✕ Thoát toàn màn hình" : "⛶ Toàn màn hình"}
    </button>
  );

  const body = (
    <>
      {/* datalist dùng chung cho mọi ô PIC — combobox: gợi ý sẵn nhưng vẫn gõ tên mới được, giống Nhật ký thi công */}
      <datalist id="detail-gantt-pic-options">
        {picOptions.map((p) => <option key={p} value={p} />)}
      </datalist>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        {rangeButtons}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔎 Tìm mốc/việc..."
              className="text-[12px] border border-line rounded-lg pl-2.5 pr-6 py-1 bg-surface outline-none focus:border-brand w-40 sm:w-52"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                title="Xóa tìm kiếm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
              >
                ✕
              </button>
            )}
          </div>
          {fullscreenButton}
        </div>
      </div>
      {/* overflow-y-visible bắt buộc phải khai báo rõ: CSS spec quy định nếu overflow-x khác "visible"
          mà overflow-y không khai báo, trình duyệt tự đổi overflow-y thành "auto" theo — sinh ra
          thanh cuộn dọc thừa dù không hề set. */}
      {/* Toàn màn hình: không giới hạn maxHeight ở đây — để cuộn xảy ra đúng 1 lần ở khung portal
          ngoài cùng (overflow-y-auto), tránh cảnh 2 lớp scrollbar lồng nhau gây khó chịu. */}
      <div className={fullscreen ? "overflow-x-auto" : "overflow-x-auto overflow-y-visible"}>
        <div ref={containerRef} className="relative min-w-[640px]">
          {arrows.length > 0 && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={svgSize.width}
              height={svgSize.height}
              style={{ overflow: "visible" }}
            >
              <defs>
                <marker id="dep-arrowhead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L8,4 L0,8 Z" fill="var(--series-1)" />
                </marker>
              </defs>
              {arrows.map((a) => {
                const midX = a.x1 + Math.max(6, (a.x2 - a.x1) / 2);
                return (
                  <path
                    key={a.key}
                    d={`M${a.x1},${a.y1} L${midX},${a.y1} L${midX},${a.y2} L${a.x2},${a.y2}`}
                    fill="none"
                    stroke="var(--series-1)"
                    strokeWidth={1.25}
                    strokeOpacity={0.85}
                    markerEnd="url(#dep-arrowhead)"
                  />
                );
              })}
            </svg>
          )}
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
            <span className="max-sm:hidden">Bắt đầu</span>
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
            const phaseMatchesQuery = !q || phase.name.toLowerCase().includes(q) || phase.milestones.some(milestoneMatches);
            if ((win && !phaseRangeInWindow && !anyMilestoneInWindow) || !phaseMatchesQuery) return null;
            anyRowVisible = true;

            return (
              <div key={phase.id} className="mb-1">
                {/* Hàng giai đoạn — khoảng bao [plannedStart, plannedEnd] làm nền tham chiếu */}
                <div className={`grid ${GRID_COLS} gap-2.5 items-start py-1`}>
                  <div className="text-[13px] font-bold leading-snug">
                    {phase.sortOrder}. {phase.name}
                    <span className="font-normal text-xs" style={{ color: phase.progressPct >= 100 ? "var(--good)" : "var(--text-muted)" }}> · {phase.progressPct}%</span>
                  </div>
                  <div className="relative h-2 rounded bg-grid">
                    {phase.plannedStart && phase.plannedEnd && (() => {
                      const { left, width } = clampBar(pos(phase.plannedStart), Math.max(0.5, pos(phase.plannedEnd) - pos(phase.plannedStart)));
                      return (
                        <>
                          <div
                            className="absolute inset-y-0 rounded opacity-50"
                            style={{ left: `${left}%`, width: `${width}%`, background: "var(--seq-150)" }}
                          />
                          {phase.progressPct > 0 && (
                            <div
                              className="absolute inset-y-0 rounded"
                              style={{
                                left: `${left}%`,
                                width: `${(width * phase.progressPct) / 100}%`,
                                background: phase.progressPct >= 100 ? "var(--good)" : "var(--series-1)",
                              }}
                            />
                          )}
                        </>
                      );
                    })()}
                    <TodayLine pos={todayPos} />
                  </div>
                  <span className={EXTRA_COLS}>{fmtShort(phase.plannedStart)}</span>
                  <span className={EXTRA_COLS}>{fmtShort(phase.plannedEnd)}</span>
                  <span className={EXTRA_COLS}></span>
                  <span className={EXTRA_COLS} style={{ color: phase.progressPct >= 100 ? "var(--good)" : undefined }}>{phase.progressPct}%</span>
                </div>

                {/* Từng mốc — thanh chạy từ mốc trước tới mốc này (chuỗi finish-to-start) */}
                {dated.map((m, idx) => {
                  if (win && !isMilestoneInWindow(idx)) return null;
                  if (q && !milestoneMatches(m)) return null;
                  const end = pos(m.plannedDate!);
                  const startIso = idx === 0 ? (phase.plannedStart ?? m.plannedDate!) : dated[idx - 1].plannedDate!;
                  const rawStart = Math.min(pos(startIso), end);
                  const rawWidth = Math.max(0.6, end - rawStart);
                  const { left: start, width } = clampBar(rawStart, rawWidth);
                  const connectorLeft = Math.max(0, Math.min(100, rawStart));
                  const totalTaskDays = m.tasks.reduce((s, t) => s + t.durationDays, 0);
                  const hasTasks = m.tasks.length > 0 && totalTaskDays > 0;
                  // Đang tìm kiếm mà chỉ có việc con khớp (tên mốc không khớp) -> tự xổ ra luôn để thấy việc khớp
                  const queryMatchedTaskOnly = q && !m.name.toLowerCase().includes(q) && m.tasks.some((t) => t.name.toLowerCase().includes(q));
                  const open = openIds.has(m.id) || queryMatchedTaskOnly;
                  const doneCount = m.tasks.filter((t) => t.isDone).length;
                  const statusDone = DONE_STATUSES.includes(m.status);
                  const msPct = hasTasks
                    ? Math.round(m.tasks.reduce((s, t) => s + t.percentComplete, 0) / m.tasks.length)
                    : (m.percentComplete ?? (statusDone ? 100 : 0));
                  // Đã xong nếu nghiệm thu đạt HOẶC toàn bộ WBS con đã 100% — không báo quá hạn khi đã xong
                  const isDone = statusDone || msPct >= 100;
                  const isLate = !isDone && +new Date(m.plannedDate!) < now;
                  const msPic = hasTasks ? summarizePic(m.tasks) : (m.responsible ?? "—");
                  const mKey = `MILESTONE:${m.id}`;
                  const isSelected = selectedKey === mKey;
                  const isRelated = !isSelected && (relatedKeys?.has(mKey) ?? false);

                  return (
                    <div
                      key={`${m.id}-${m.plannedDate}-${m.responsible}-${m.percentComplete}`}
                      style={{
                        background: isSelected
                          ? "color-mix(in srgb, var(--series-1) 22%, transparent)"
                          : isRelated
                            ? "color-mix(in srgb, var(--series-1) 10%, transparent)"
                            : idx % 2 === 1
                              ? "var(--page)"
                              : undefined,
                      }}
                    >
                      <div className={`grid ${GRID_COLS} gap-2.5 items-start py-1.5`}>
                        <div
                          className="flex items-start gap-1 text-[13px] text-ink-2 pl-2 leading-snug cursor-pointer"
                          title={m.name}
                          onClick={() => toggleSelect(mKey)}
                        >
                          {hasTasks ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggle(m.id); }}
                              className="text-muted shrink-0 w-3.5 text-center"
                              title={open ? "Thu gọn WBS" : `Xổ ${m.tasks.length} công việc`}
                            >
                              {open ? "▾" : "▸"}
                            </button>
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            {m.isHoldPoint && "⛔ "}
                            {isLate && "⚠️ "}
                            <span style={{ color: isLate ? "var(--critical)" : isDone ? "var(--good)" : undefined }}>{m.name}</span>
                            {hasTasks && (
                              <span className="text-muted shrink-0 text-[11px]"> ({doneCount}/{m.tasks.length})</span>
                            )}
                            <DependsOnLine names={m.dependsOn} />
                          </div>
                        </div>
                        <div ref={(el) => registerBarRef(`MILESTONE:${m.id}`, el, start, width)} className="relative h-3.5 rounded bg-grid overflow-visible">
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
                        <MilestoneEditCells m={m} startIso={startIso} hasTasks={hasTasks} msPic={msPic} msPct={msPct} isDone={isDone} />
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
                                barRef={(el) => registerBarRef(`MILESTONE_TASK:${t.id}`, el, taskLeft, taskWidth)}
                                isSelected={selectedKey === `MILESTONE_TASK:${t.id}`}
                                isRelated={selectedKey !== `MILESTONE_TASK:${t.id}` && (relatedKeys?.has(`MILESTONE_TASK:${t.id}`) ?? false)}
                                onSelect={() => toggleSelect(`MILESTONE_TASK:${t.id}`)}
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
            <EmptyState
              title={q ? `Không tìm thấy mốc/việc nào khớp "${query}"` : "Không có giai đoạn/mốc nào trong khoảng thời gian đang xem"}
              sub={q ? "Thử từ khóa khác hoặc bấm ✕ để xóa tìm kiếm" : "Thử chọn “Tất cả” hoặc khoảng thời gian khác"}
            />
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
    </>
  );

  if (fullscreen) {
    return createPortal(
      <div ref={portalRef} className="fixed inset-0 z-50 bg-page overflow-y-auto p-4">
        <div className="bg-surface border border-line rounded-xl p-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-3">Gantt chi tiết theo mốc nghiệm thu</h2>
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return <Card title="Gantt chi tiết theo mốc nghiệm thu">{body}</Card>;
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { PreviewButton } from "@/components/FilePreview";
import { fmtDate, fmtDateTime, todayVN } from "@/lib/format";
import type { TodoItem, TodoSource } from "@/services/todo.service";
import type { StoryDay } from "./dailyStory";

/** Ngày gần hôm nay nhất trong danh sách (không hẳn khớp chính xác — có thể là ngày kế hoạch tương lai gần nhất) */
function findClosestDayIndex(days: StoryDay[], today: string): number {
  if (days.length === 0) return -1;
  let closest = 0;
  let minDiff = Infinity;
  const todayMs = new Date(today).getTime();
  days.forEach((d, i) => {
    const diff = Math.abs(new Date(d.date).getTime() - todayMs);
    if (diff < minDiff) { minDiff = diff; closest = i; }
  });
  return closest;
}

const SOURCE_LABEL: Record<TodoSource, string> = {
  DAILY_LOG: "📆 Nhật ký",
  MILESTONE_TASK: "📅 WBS tiến độ",
  MILESTONE_CHECKLIST: "✅ Checklist mốc",
  RISK_MITIGATION: "⚠️ Rủi ro",
  ISSUE: "🐞 Issue Log",
  DEFECT: "🔧 Bảo hành",
};

function StoryItemRow({ item }: { item: TodoItem }) {
  const comments = item.comments ?? [];
  const photos = item.photos ?? [];
  return (
    <li className="flex items-start gap-2 text-[13px] py-1.5">
      <span className="shrink-0 mt-0.5">{item.isDone ? "✅" : "⬜"}</span>
      <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-grid text-muted shrink-0 whitespace-nowrap mt-0.5">
        {SOURCE_LABEL[item.source]}
      </span>
      <div className="min-w-0 flex-1">
        <span className={item.isDone ? "line-through text-muted" : "text-ink-2"}>{item.label}</span>
        <span className="text-muted text-[11px] ml-1.5">· {item.context}</span>
        {item.pic && <div className="text-[11px] text-muted mt-0.5">👤 {item.pic}</div>}

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {photos.map((p, i) => (
              <PreviewButton
                key={p.id}
                url={p.url}
                mimeType="image/jpeg"
                title={p.title}
                siblings={photos.map((x) => ({ url: x.url, mimeType: "image/jpeg", title: x.title }))}
                index={i}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.title} className="w-14 h-14 object-cover rounded border border-line hover:opacity-80" />
              </PreviewButton>
            ))}
          </div>
        )}

        {comments.length > 0 && (
          <div className="mt-1.5 pl-2 border-l-2 border-grid space-y-1">
            {comments.map((c) => (
              <div key={c.id} className="text-[12px] flex items-start gap-1.5">
                <span className="font-semibold text-ink-2 shrink-0">{c.authorEmail.split("@")[0]}:</span>
                <span className="text-ink-2 flex-1 min-w-0 break-words">{c.body}</span>
                <span className="text-[10px] text-muted shrink-0 whitespace-nowrap">{fmtDateTime(c.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Link href={item.href} className="text-brand text-xs font-semibold hover:underline shrink-0">
        Xem →
      </Link>
    </li>
  );
}

export function DailyStoryView({ days, noDate }: { days: StoryDay[]; noDate: TodoItem[] }) {
  const todayStr = todayVN();
  const closestIdx = findClosestDayIndex(days, todayStr);
  // Mặc định chỉ mở ngày gần hôm nay nhất — 70+ ngày mở hết cùng lúc quá dài, người dùng tự bấm mở thêm ngày khác
  const [openDates, setOpenDates] = useState<Set<string>>(() => new Set(closestIdx >= 0 ? [days[closestIdx].date] : []));
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (scrolledRef.current || closestIdx < 0) return;
    scrolledRef.current = true;
    dayRefs.current.get(days[closestIdx].date)?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDay = (date: string) =>
    setOpenDates((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  if (days.length === 0 && noDate.length === 0) {
    return <Card><p className="text-muted text-sm text-center py-6">Chưa có việc nào được ghi nhận.</p></Card>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs">
        <button type="button" onClick={() => setOpenDates(new Set(days.map((d) => d.date)))} className="text-brand font-semibold hover:underline">
          Mở tất cả
        </button>
        <button type="button" onClick={() => setOpenDates(new Set())} className="text-brand font-semibold hover:underline">
          Thu gọn tất cả
        </button>
      </div>
      {days.map((d) => {
        const open = openDates.has(d.date);
        const isToday = d.date === todayStr;
        return (
          <div key={d.date} ref={(el) => { if (el) dayRefs.current.set(d.date, el); else dayRefs.current.delete(d.date); }}>
            <Card className={isToday ? "ring-1 ring-[var(--series-1)]" : ""}>
              <button
                type="button"
                onClick={() => toggleDay(d.date)}
                className="w-full flex items-center gap-2 text-left"
              >
                <span className="text-muted">{open ? "▾" : "▸"}</span>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">{fmtDate(d.date)}</span>
                {isToday && <span className="text-[10.5px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--series-1) 20%, transparent)", color: "var(--series-1)" }}>Hôm nay</span>}
                <span className="text-muted text-[11px]">({d.items.length} việc)</span>
              </button>
              {open && (
                <ul className="divide-y divide-grid mt-2">
                  {d.items.map((it) => <StoryItemRow key={`${it.source}:${it.id}`} item={it} />)}
                </ul>
              )}
            </Card>
          </div>
        );
      })}
      {noDate.length > 0 && (
        <Card title="Không có ngày cụ thể">
          <ul className="divide-y divide-grid">
            {noDate.map((it) => <StoryItemRow key={`${it.source}:${it.id}`} item={it} />)}
          </ul>
        </Card>
      )}
    </div>
  );
}

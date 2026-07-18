"use client";

/**
 * Trình bày "Tiến độ trực quan" — dùng chung cho trang nội bộ (/schedule/timeline) và trang chia sẻ
 * công khai (/share/[token]). Component thuần hiển thị, không tự fetch dữ liệu, không phụ thuộc bất
 * kỳ service nội bộ nào (giữ an toàn khi render ở route public không đăng nhập).
 */
import { Card } from "@/components/ui";
import { PreviewButton } from "@/components/FilePreview";
import { fmtDate } from "@/lib/format";
import type { ProjectTimeline, TimelineMilestone } from "@/services/timeline.service";

function ProgressRing({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="Tiến độ tổng">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--grid)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="var(--series-1)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(100, Math.max(0, pct))) / 100} ${c}`}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

function MilestoneCard({ m, status }: { m: TimelineMilestone; status: "done" | "current" | "upcoming" }) {
  const color = status === "done" ? "var(--good)" : status === "current" ? "var(--series-1)" : "var(--text-muted)";
  return (
    <div className="border border-line rounded-xl p-3" style={{ opacity: status === "upcoming" ? 0.55 : 1 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="font-semibold text-[13.5px]">{m.name}</span>
        {status === "done" && (
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--good) 18%, transparent)", color: "var(--good)" }}>
            ✓ Đã nghiệm thu
          </span>
        )}
        {status === "current" && (
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--series-1) 18%, transparent)", color: "var(--series-1)" }}>
            Đang thi công
          </span>
        )}
        {m.date && <span className="text-[11px] text-muted ml-auto">{fmtDate(m.date)}</span>}
      </div>
      {m.photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 mt-2.5">
          {m.photos.map((p, i) => (
            <PreviewButton
              key={p.id}
              url={p.url}
              mimeType="image/jpeg"
              title={p.title}
              siblings={m.photos.map((x) => ({ url: x.url, mimeType: "image/jpeg", title: x.title }))}
              index={i}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.title} className="w-full aspect-square object-cover rounded-lg border border-line hover:opacity-80" />
            </PreviewButton>
          ))}
        </div>
      )}
    </div>
  );
}

export function TimelineView({ data, isPublic = false }: { data: ProjectTimeline; isPublic?: boolean }) {
  // Mốc "đang thi công" = mốc CHƯA đạt đầu tiên theo đúng thứ tự giai đoạn/mốc — mọi mốc chưa đạt
  // sau đó là "sắp tới", mờ đi để không rối mắt.
  let currentFound = false;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
            <ProgressRing pct={data.overallPct} />
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold">{data.overallPct}%</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold">{data.projectName}</h1>
            <p className="text-[13px] text-ink-2 mt-1">
              Tiến độ tổng {data.overallPct}%
              {data.expectedHandover && <> · Dự kiến bàn giao {fmtDate(data.expectedHandover)}</>}
            </p>
          </div>
        </div>
      </Card>

      {data.phases.map((phase) => (
        <Card key={phase.id} title={`${phase.name} — ${phase.progressPct}%`}>
          <div className="h-1.5 rounded-full bg-grid overflow-hidden mb-3">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, phase.progressPct)}%`, background: phase.progressPct >= 100 ? "var(--good)" : "var(--series-1)" }}
            />
          </div>
          <div className="space-y-2.5">
            {phase.milestones.map((m) => {
              let status: "done" | "current" | "upcoming" = "upcoming";
              if (m.isDone) status = "done";
              else if (!currentFound) { status = "current"; currentFound = true; }
              return <MilestoneCard key={m.id} m={m} status={status} />;
            })}
            {phase.milestones.length === 0 && (
              <p className="text-muted text-[13px] text-center py-2">Chưa có mốc nào trong giai đoạn này.</p>
            )}
          </div>
        </Card>
      ))}

      {isPublic && (
        <p className="text-center text-muted text-xs pt-2">
          🏗️ Cập nhật trực tiếp từ PM4U HomeBuild · {fmtDate(new Date().toISOString())}
        </p>
      )}
    </div>
  );
}

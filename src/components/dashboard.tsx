/* Các khối Dashboard — server components thuần, nhận data từ dashboard.service */
import Link from "next/link";
import { Card, Tag, StatusPill, EmptyState } from "@/components/ui";
import { fmtVND, fmtTr, fmtDate } from "@/lib/format";
import type { DashboardData, GanttPhase } from "@/services/dashboard.service";

/* ---------- Chỉ số sức khỏe dự án (Project Health Score) ---------- */
const HEALTH_COLOR: Record<string, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  critical: "var(--critical)",
};

export function HealthScoreCard({ health }: { health: DashboardData["healthScore"] }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const color = HEALTH_COLOR[health.sev];
  const breakdown = [
    { label: "Tiến độ", value: health.schedule },
    { label: "Ngân sách", value: health.budget },
    { label: "Rủi ro", value: health.risk },
  ];
  return (
    <Card title="Sức khỏe dự án">
      <div className="flex items-center gap-4 mb-3">
        <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label="Chỉ số sức khỏe dự án">
          <circle cx="46" cy="46" r={r} fill="none" stroke="var(--grid)" strokeWidth="9" />
          <circle
            cx="46" cy="46" r={r} fill="none"
            stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${(c * health.overall) / 100} ${c}`}
            transform="rotate(-90 46 46)"
          />
        </svg>
        <div>
          <div className="text-3xl font-bold">{health.overall}</div>
          <div className="text-[12.5px] font-semibold mt-1" style={{ color }}>{health.label}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {breakdown.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[11px] text-muted w-16 shrink-0">{b.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-grid overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${b.value}%`, background: "var(--series-1)" }}
              />
            </div>
            <span className="text-[11px] font-semibold text-ink-2 w-7 text-right">{b.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Vòng tiến độ ---------- */
export function ProgressGauge({ progress }: { progress: DashboardData["progress"] }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <Card title="Tiến độ tổng">
      <div className="flex items-center gap-4">
        <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label="Tiến độ tổng">
          <circle cx="46" cy="46" r={r} fill="none" stroke="var(--grid)" strokeWidth="9" />
          <circle
            cx="46" cy="46" r={r} fill="none"
            stroke="var(--series-1)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${(c * progress.pct) / 100} ${c}`}
            transform="rotate(-90 46 46)"
          />
        </svg>
        <div>
          <div className="text-3xl font-bold">
            {progress.pct.toLocaleString("vi-VN")}%
          </div>
          <div className="text-[12.5px] text-ink-2 mt-1">
            {progress.lateDays > 0 ? (
              <>
                Trễ <b>{progress.lateDays} ngày</b>
                {progress.forceMajeureDays > 0 && (
                  <><br />(đã trừ {progress.forceMajeureDays} ngày mưa hợp lệ)</>
                )}
              </>
            ) : (
              <span style={{ color: "var(--good-text)" }}>Đúng tiến độ ✓</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Ngân sách ---------- */
export function BudgetCard({ budget }: { budget: DashboardData["budget"] }) {
  const p1 = Math.min(100, (budget.contractorPaid / budget.planned) * 100);
  const p2 = Math.min(100 - p1, (budget.ownerPaid / budget.planned) * 100);
  return (
    <Card title="Ngân sách">
      <div className="text-2xl font-bold money">
        {fmtTr(budget.totalSpent)}{" "}
        <span className="text-sm font-normal text-muted">/ {fmtTr(budget.planned)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-grid my-2.5 flex overflow-hidden">
        <div className="h-full" style={{ width: `${p1}%`, background: "var(--series-1)" }} />
        <div
          className="h-full border-l-2 border-surface"
          style={{ width: `${p2}%`, background: "var(--seq-150)" }}
        />
      </div>
      <div className="flex gap-3.5 flex-wrap text-[12.5px] text-ink-2">
        <span>
          <span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--series-1)" }} />
          Trả thầu {fmtTr(budget.contractorPaid)}
        </span>
        <span>
          <span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--seq-150)" }} />
          CĐT mua {fmtTr(budget.ownerPaid)}
        </span>
      </div>
      {budget.approvedVariations !== 0 && (
        <div className="text-[12.5px] text-ink-2 mt-2 money">
          Phát sinh đã duyệt:{" "}
          <b style={{ color: budget.approvedVariations > 0 ? "var(--good-text)" : undefined }}>
            {budget.approvedVariations > 0 ? "+" : ""}
            {fmtTr(budget.approvedVariations)}
          </b>
        </div>
      )}
      {budget.overrun && (
        <div className="mt-2"><Tag sev="critical">Vượt ngân sách</Tag></div>
      )}
    </Card>
  );
}

/* ---------- Hàng đợi cần hành động ---------- */
export function ActionQueue({ actions }: { actions: DashboardData["actions"] }) {
  return (
    <Card title="⚡ Cần hành động">
      {actions.length === 0 ? (
        <EmptyState title="Không có việc nào chờ bạn" sub="Mọi thứ đang trong tầm kiểm soát 👍" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {actions.slice(0, 5).map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="flex gap-2.5 items-start p-2.5 border border-line rounded-lg hover:bg-page"
            >
              <span className="text-[15px]">{a.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[13.5px]">{a.title}</span>
                <span className="block text-[12.5px] text-ink-2">{a.sub}</span>
              </span>
              <Tag sev={a.sev}>{a.tag}</Tag>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Gantt ---------- */
/** Mốc đầu mỗi tháng nằm trong [min, max] để làm trục thời gian trên Gantt */
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

export function GanttChart({ phases }: { phases: GanttPhase[] }) {
  const dated = phases.filter((p) => p.plannedStart && p.plannedEnd);
  if (dated.length === 0)
    return (
      <Card title="Tiến độ giai đoạn">
        <EmptyState title="Chưa có giai đoạn nào có ngày kế hoạch" />
      </Card>
    );

  const min = Math.min(...dated.map((p) => +new Date(p.plannedStart!)));
  const max = Math.max(...dated.map((p) => +new Date(p.plannedEnd!)));
  const span = Math.max(1, max - min);
  const todayPos = Math.min(100, Math.max(0, ((Date.now() - min) / span) * 100));
  const ticks = monthTicks(min, max);

  return (
    <Card title={`Tiến độ ${phases.length} giai đoạn`}>
      <div className="grid grid-cols-[150px_1fr_56px] gap-2.5 text-[11px] text-muted pb-1 border-b border-grid mb-1 max-sm:grid-cols-[100px_1fr_44px]">
        <span>Giai đoạn</span>
        <div className="relative h-4">
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${t.pos}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
        <span className="text-right">Xong</span>
      </div>
      {phases.map((p) => {
        const hasDates = p.plannedStart && p.plannedEnd;
        const left = hasDates ? ((+new Date(p.plannedStart!) - min) / span) * 100 : 0;
        const width = hasDates
          ? ((+new Date(p.plannedEnd!) - +new Date(p.plannedStart!)) / span) * 100
          : 0;
        const hpPending = p.holdPoint && !["APPROVED", "AUTO_APPROVED"].includes(p.holdPoint.status);
        return (
          <div key={p.id} className="grid grid-cols-[150px_1fr_56px] gap-2.5 items-center py-[5px] max-sm:grid-cols-[100px_1fr_44px]">
            <div className="text-[13px] text-ink-2 truncate">
              {p.name}
              {p.holdPoint && (
                <span title={`Hold Point: ${p.holdPoint.name} — ${p.holdPoint.status}`}>
                  {" "}⛔{!hpPending && "✓"}
                </span>
              )}
            </div>
            <div className="relative h-3.5 rounded bg-grid">
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 w-px"
                  style={{ left: `${t.pos}%`, background: "var(--baseline)", opacity: 0.4 }}
                />
              ))}
              {hasDates && (
                <>
                  <div
                    className="absolute inset-y-0 rounded"
                    style={{ left: `${left}%`, width: `${width}%`, background: "var(--seq-150)" }}
                  />
                  <div
                    className="absolute inset-y-0 rounded"
                    style={{
                      left: `${left}%`,
                      width: `${(width * p.progressPct) / 100}%`,
                      background: "var(--series-1)",
                    }}
                  />
                </>
              )}
              <div
                className="absolute -top-1 -bottom-1 w-0.5 rounded"
                style={{ left: `${todayPos}%`, background: "var(--critical)" }}
              />
            </div>
            <div className="text-xs text-muted text-right money">{p.progressPct}%</div>
          </div>
        );
      })}
      <div className="flex gap-3.5 flex-wrap text-[12.5px] text-ink-2 mt-2.5">
        <span><span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--series-1)" }} />Đã hoàn thành</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--seq-150)" }} />Kế hoạch</span>
        <span><span className="inline-block w-0.5 h-3 mr-1 align-[-2px]" style={{ background: "var(--critical)" }} />Hôm nay</span>
        <span>⛔ Điểm dừng nghiệm thu</span>
      </div>
    </Card>
  );
}

/* ---------- Dòng tiền sắp tới ---------- */
export function CashflowTable({ cashflow }: { cashflow: DashboardData["cashflow"] }) {
  return (
    <Card title="Dòng tiền sắp tới (90 ngày)">
      {cashflow.length === 0 ? (
        <EmptyState title="Không có khoản chi nào sắp tới" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Hạn</th>
                <th className="py-1 pr-2 font-semibold">Khoản chi</th>
                <th className="py-1 pr-2 font-semibold text-right">Số tiền</th>
                <th className="py-1 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {cashflow.map((c, i) => (
                <tr key={i} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2 money">{c.due ? fmtDate(c.due) : "—"}</td>
                  <td className="py-2 pr-2">{c.item}</td>
                  <td className="py-2 pr-2 text-right money font-bold">{fmtVND(c.amount)}</td>
                  <td className="py-2"><StatusPill status={c.status === "warning" ? "warning" : c.status === "critical" ? "critical" : "good"} label={c.label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------- Rủi ro ---------- */
const SEV_ICON: Record<string, string> = { CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢" };

export function RiskPanel({ risks }: { risks: DashboardData["risks"] }) {
  return (
    <Card title="Rủi ro đang theo dõi">
      {risks.length === 0 ? (
        <EmptyState title="Chưa ghi nhận rủi ro nào" />
      ) : (
        risks.map((r, i) => (
          <div key={i} className="py-2 border-b border-grid last:border-0">
            <div className="font-semibold text-[13.5px] flex items-center gap-1.5">
              {SEV_ICON[r.severity] ?? "⚪"} {r.title}
            </div>
            {r.sub && <div className="text-[12.5px] text-ink-2 mt-0.5 ml-6">{r.sub}</div>}
          </div>
        ))
      )}
    </Card>
  );
}

/* ---------- Nhật ký hôm nay ---------- */
const WEATHER_LABEL: Record<string, string> = {
  SUNNY: "☀️ Nắng", CLOUDY: "⛅ Nhiều mây", LIGHT_RAIN: "🌦️ Mưa nhỏ",
  HEAVY_RAIN: "☔ Mưa lớn", STORM: "🌪️ Bão",
};

export function DailyStrip({ todayLog }: { todayLog: DashboardData["todayLog"] }) {
  return (
    <Card className="flex items-center gap-3.5 flex-wrap">
      <strong>Nhật ký hôm nay:</strong>
      {todayLog ? (
        <span className="text-ink-2 text-[13px]">
          {WEATHER_LABEL[todayLog.weather]}
          {todayLog.rainHours > 0 && ` ${todayLog.rainHours}h`}
          {todayLog.isForceMajeure && " (tính gia hạn hợp lệ)"} · {todayLog.workerCount} nhân công có mặt
        </span>
      ) : (
        <span className="text-muted text-[13px]">Chưa ghi nhật ký hôm nay</span>
      )}
      <Link
        href="/schedule/daily-log"
        className="ml-auto bg-brand text-white text-[13px] font-semibold rounded-lg px-3.5 py-1.5 hover:opacity-90"
      >
        + Ghi nhật ký
      </Link>
    </Card>
  );
}

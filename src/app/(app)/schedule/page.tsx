import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject, type GanttPhase } from "@/services/dashboard.service";
import { resolveExpiredHoldPoints } from "@/services/milestone.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { GanttChart } from "@/components/dashboard";
import { getSignedUrl } from "@/lib/storage";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { MILESTONE_STATUS, WEATHER, INSPECTION_METHOD, INSPECTION_RESULT } from "@/lib/labels";
import {
  CreatePhaseForm, UpdatePhaseForm, CreateMilestoneForm, EditMilestoneForm, CreateStandardMilestonesButton,
  CreateFullScheduleButton, ResetScheduleButton, RequestInspectionButton, RecordInspectionForm, DailyLogForm,
  EditDailyLogForm, DeleteDailyLogButton, DailyLogItemsView, DailyLogPhotos,
  ChecklistPanel,
} from "./forms";
import { ScheduleTabs } from "./ScheduleTabs";
import { PlanModeToggle } from "./PlanModeToggle";

export const dynamic = "force-dynamic";

const MS_SEV: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  PENDING: "neutral",
  AWAITING_INSPECTION: "warning",
  APPROVED: "good",
  AUTO_APPROVED: "good",
  REJECTED: "critical",
};

export default async function SchedulePage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  // Compute-on-read: quá 48h chưa xác nhận -> tự động thông qua
  await resolveExpiredHoldPoints(project.id);

  const [phases, dailyLogs, checklistTemplates] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
      include: {
        milestones: {
          include: {
            inspections: { orderBy: { confirmedAt: "desc" }, take: 1 },
            checklistItems: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    }),
    prisma.dailyLog.findMany({
      where: { projectId: project.id },
      orderBy: { logDate: "desc" },
      take: 14,
      include: {
        milestones: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: "asc" } },
        documents: { where: { docType: "SITE_PHOTO" }, orderBy: { uploadedAt: "asc" } },
      },
    }),
    prisma.checklistTemplate.findMany({
      where: { projectId: project.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { category: "asc" },
    }),
  ]);
  const templatesForForms = checklistTemplates.map((t) => ({
    category: t.category,
    items: t.items.map((i) => i.label),
  }));

  const now = Date.now();
  const phasesForDailyLog = phases.map((p) => ({
    name: p.name,
    milestones: p.milestones.map((m) => ({ id: m.id, name: m.name })),
  }));
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs.find((d) => d.logDate.toISOString().slice(0, 10) === todayStr);

  // Ảnh hiện trường: tạo signed URL (bucket private) cho mọi ảnh của 14 ngày đang hiện
  const photosByLog = new Map<string, { id: string; url: string; title: string }[]>();
  await Promise.all(
    dailyLogs.map(async (d) => {
      const urls = await Promise.all(d.documents.map((doc) => getSignedUrl(doc.fileUrl)));
      photosByLog.set(
        d.id,
        d.documents.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title })).filter((p) => p.url),
      );
    }),
  );

  const ganttPhases: GanttPhase[] = phases.map((p) => {
    const holdPoint = p.milestones.find((m) => m.isHoldPoint);
    return {
      id: p.id,
      name: p.name,
      sortOrder: p.sortOrder,
      plannedStart: p.plannedStart?.toISOString() ?? null,
      plannedEnd: p.plannedEnd?.toISOString() ?? null,
      progressPct: Number(p.progressPct),
      holdPoint: holdPoint ? { name: holdPoint.name, status: holdPoint.status } : null,
    };
  });

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📅 Tiến độ & Nghiệm thu</h1>
        <div className="ml-auto flex gap-2">
          <DailyLogForm
            projectId={project.id}
            phases={phasesForDailyLog}
            defaultMilestoneIds={todayLog?.milestones.map((m) => m.id) ?? []}
          />
          {phases.length === 0 && <CreateFullScheduleButton projectId={project.id} />}
          <CreatePhaseForm projectId={project.id} />
          {phases.length > 0 && <ResetScheduleButton projectId={project.id} />}
        </div>
      </header>

      {/* Nhật ký công trình */}
      <Card title="Nhật ký công trình (14 ngày gần nhất)">
        <div id="daily-log" />
        {dailyLogs.length === 0 ? (
          <EmptyState title="Chưa có nhật ký" sub="Ghi thời tiết & nhân công mỗi ngày — bằng chứng gia hạn tiến độ hợp lệ" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Ngày</th>
                <th className="py-1 pr-2 font-semibold">Thời tiết</th>
                <th className="py-1 pr-2 font-semibold">Nhân công</th>
                <th className="py-1 pr-2 font-semibold">Công việc</th>
                <th className="py-1 pr-2 font-semibold">Gia hạn hợp lệ</th>
                <th className="py-1 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {dailyLogs.map((d) => (
                <tr key={d.id} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2 money">{fmtDate(d.logDate)}</td>
                  <td className="py-2 pr-2">
                    {WEATHER[d.weather]}
                    {d.rainHours && Number(d.rainHours) > 0 ? ` (${Number(d.rainHours)}h)` : ""}
                  </td>
                  <td className="py-2 pr-2">{d.workerCount} người</td>
                  <td className="py-2 pr-2 text-ink-2">
                    {d.items.length > 0 ? (
                      <DailyLogItemsView items={d.items.map((it) => ({ id: it.id, label: it.label, isChecked: it.isChecked }))} />
                    ) : (
                      d.workDescription ?? "—"
                    )}
                    {d.items.length > 0 && d.workDescription && (
                      <div className="text-xs text-muted mt-1 italic">{d.workDescription}</div>
                    )}
                    {d.milestones.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.milestones.map((m) => (
                          <span key={m.id} className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2">
                            🔹 {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <DailyLogPhotos dailyLogId={d.id} projectId={project.id} photos={photosByLog.get(d.id) ?? []} />
                  </td>
                  <td className="py-2 pr-2">{d.isForceMajeure ? <Tag sev="warning">+1 ngày</Tag> : "—"}</td>
                  <td className="py-2">
                    <div className="flex gap-2 justify-end whitespace-nowrap">
                      <EditDailyLogForm
                        log={{
                          id: d.id,
                          logDate: d.logDate.toISOString(),
                          weather: d.weather,
                          rainHours: d.rainHours ? Number(d.rainHours) : null,
                          workerCount: d.workerCount,
                          isForceMajeure: d.isForceMajeure,
                          workDescription: d.workDescription,
                          milestoneIds: d.milestones.map((m) => m.id),
                          items: d.items.map((it) => ({ id: it.id, label: it.label, isChecked: it.isChecked })),
                        }}
                        phases={phasesForDailyLog}
                      />
                      <DeleteDailyLogButton id={d.id} logDate={d.logDate.toISOString()} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {phases.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có giai đoạn nào"
            sub="Bấm “🏗️ Tạo đầy đủ tiến độ chuẩn” để dựng cả 9 giai đoạn + milestone nghiệm thu chỉ trong 1 lần, hoặc tự thêm từng giai đoạn: Tìm thầu → Thiết kế → Xin phép → Ép cọc → Thô → Hoàn thiện → Nội thất → Hoàn công"
          />
        </Card>
      ) : (
        <PlanModeToggle
          master={<GanttChart phases={ganttPhases} />}
          detail={
            <>
              {phases.map((phase) => (
          <Card key={phase.id}>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="font-bold">
                {phase.sortOrder}. {phase.name}
              </h2>
              <span className="text-ink-2 text-[13px] money">
                {fmtDate(phase.plannedStart)} → {fmtDate(phase.plannedEnd)} · tỷ trọng {Number(phase.weight)}%
              </span>
              <div className="ml-auto flex gap-2 items-center">
                <CreateStandardMilestonesButton phaseId={phase.id} phaseType={phase.type} />
                <CreateMilestoneForm
                  phaseId={phase.id}
                  phaseName={phase.name}
                  defaultDate={phase.plannedEnd?.toISOString() ?? null}
                  templates={templatesForForms}
                />
                <UpdatePhaseForm
                  phase={{
                    id: phase.id,
                    name: phase.name,
                    progressPct: Number(phase.progressPct),
                    plannedStart: phase.plannedStart?.toISOString() ?? null,
                    plannedEnd: phase.plannedEnd?.toISOString() ?? null,
                  }}
                />
              </div>
            </div>

            {/* Thanh tiến độ */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2.5 rounded-full bg-grid overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Number(phase.progressPct)}%`, background: "var(--series-1)" }}
                />
              </div>
              <span className="text-[13px] font-bold money w-11 text-right">{Number(phase.progressPct)}%</span>
            </div>

            {/* Milestones — sắp theo ngày dự kiến, mốc chưa có ngày xếp cuối */}
            {phase.milestones.length > 0 && (
              <div className="space-y-2">
                {[...phase.milestones]
                  .sort((a, b) => {
                    if (!a.plannedDate && !b.plannedDate) return 0;
                    if (!a.plannedDate) return 1;
                    if (!b.plannedDate) return -1;
                    return a.plannedDate.getTime() - b.plannedDate.getTime();
                  })
                  .map((m) => {
                    const deadline = m.requestedAt
                      ? new Date(m.requestedAt.getTime() + m.confirmDeadlineHrs * 3_600_000)
                      : null;
                    const hoursLeft = deadline ? Math.max(0, Math.round((deadline.getTime() - now) / 3_600_000)) : null;
                    const lastInspection = m.inspections[0];
                    const isLate =
                      m.plannedDate && m.plannedDate.getTime() < now && !["APPROVED", "AUTO_APPROVED"].includes(m.status);
                    return (
                      <div key={m.id} className="border border-line rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span>{m.isHoldPoint ? "⛔" : "🔹"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[13.5px]">{m.name}</div>
                          <div className="text-xs text-ink-2">
                            <span style={{ color: isLate ? "var(--critical)" : undefined }}>
                              📅 Dự kiến: {m.plannedDate ? fmtDate(m.plannedDate) : "chưa đặt ngày"}
                              {isLate && " — đã trễ"}
                            </span>
                            {m.status === "AWAITING_INSPECTION" && hoursLeft != null && (
                              <span style={{ color: hoursLeft <= 12 ? "var(--critical)" : undefined }}>
                                {" "}· ⏰ Còn {hoursLeft}h để xác nhận (quá hạn tự động thông qua)
                              </span>
                            )}
                            {lastInspection && (
                              <>
                                {" "}· {INSPECTION_RESULT[lastInspection.result]} qua {INSPECTION_METHOD[lastInspection.method]}{" "}
                                lúc {fmtDateTime(lastInspection.confirmedAt)}
                                {lastInspection.notes && ` — "${lastInspection.notes}"`}
                              </>
                            )}
                          </div>
                        </div>
                        <Tag sev={MS_SEV[m.status]}>{MILESTONE_STATUS[m.status]}</Tag>
                        {m.status === "PENDING" && <RequestInspectionButton milestoneId={m.id} />}
                        {m.status === "REJECTED" && <RequestInspectionButton milestoneId={m.id} />}
                        {m.status === "AWAITING_INSPECTION" && (
                          <RecordInspectionForm
                            milestoneId={m.id}
                            milestoneName={m.name}
                            checklistItems={m.checklistItems.map((c) => ({ label: c.label, isChecked: c.isChecked }))}
                          />
                        )}
                        <EditMilestoneForm
                          milestone={{
                            id: m.id, name: m.name, isHoldPoint: m.isHoldPoint,
                            confirmDeadlineHrs: m.confirmDeadlineHrs,
                            plannedDate: m.plannedDate?.toISOString() ?? null,
                          }}
                        />
                      </div>
                      <ChecklistPanel
                        milestoneId={m.id}
                        milestoneName={m.name}
                        items={m.checklistItems.map((c) => ({ id: c.id, label: c.label, isChecked: c.isChecked }))}
                        templates={templatesForForms}
                      />
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
              ))}
            </>
          }
        />
      )}
    </div>
  );
}

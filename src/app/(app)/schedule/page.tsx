import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject, type GanttPhase } from "@/services/dashboard.service";
import { resolveExpiredHoldPoints } from "@/services/milestone.service";
import { Card, EmptyState } from "@/components/ui";
import { GanttChart } from "@/components/dashboard";
import {
  CreatePhaseForm, CreateFullScheduleButton, ResetScheduleButton,
  PhaseCard,
} from "./forms";
import { ScheduleTabs } from "./ScheduleTabs";
import { PlanModeToggle } from "./PlanModeToggle";
import { DetailGantt, type DetailGanttPhase } from "./DetailGantt";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  // Compute-on-read: quá 48h chưa xác nhận -> tự động thông qua
  await resolveExpiredHoldPoints(project.id);

  const [phases, checklistTemplates, stakeholders, contracts] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
      include: {
        milestones: {
          include: {
            inspections: { orderBy: { confirmedAt: "desc" }, take: 1 },
            checklistItems: { orderBy: { sortOrder: "asc" } },
            tasks: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    }),
    prisma.checklistTemplate.findMany({
      where: { projectId: project.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { category: "asc" },
    }),
    prisma.stakeholder.findMany({ where: { projectId: project.id }, select: { name: true } }),
    prisma.contract.findMany({ where: { projectId: project.id }, include: { vendor: { select: { name: true } } } }),
  ]);
  const templatesForForms = checklistTemplates.map((t) => ({
    category: t.category,
    items: t.items.map((i) => i.label),
  }));

  // Gợi ý PIC cho Gantt chi tiết: vai trò phổ biến + stakeholder + nhà thầu + tên đã gõ trong WBS — vẫn cho gõ tên mới (giống combobox PIC ở Nhật ký)
  const COMMON_PIC_ROLES = ["Chủ đầu tư", "Giám sát công trình", "Kỹ sư kết cấu", "Kỹ sư M&E", "Đơn vị thiết kế"];
  const ganttPicOptions = Array.from(
    new Set([
      ...COMMON_PIC_ROLES,
      ...stakeholders.map((s) => s.name),
      ...contracts.map((c) => c.vendor.name),
      ...phases.flatMap((p) => p.milestones.flatMap((m) => m.tasks.map((t) => t.responsible))).filter((p): p is string => !!p),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const now = Date.now();

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

  const detailGanttPhases: DetailGanttPhase[] = phases.map((p) => ({
    id: p.id,
    sortOrder: p.sortOrder,
    name: p.name,
    plannedStart: p.plannedStart?.toISOString() ?? null,
    plannedEnd: p.plannedEnd?.toISOString() ?? null,
    progressPct: Number(p.progressPct),
    milestones: p.milestones.map((m) => ({
      id: m.id,
      name: m.name,
      isHoldPoint: m.isHoldPoint,
      status: m.status,
      plannedDate: m.plannedDate?.toISOString() ?? null,
      tasks: m.tasks.map((t) => ({
        id: t.id, name: t.name, durationDays: t.durationDays, responsible: t.responsible, isDone: t.isDone,
        dueDate: t.dueDate?.toISOString() ?? null, percentComplete: t.percentComplete,
      })),
    })),
  }));

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📅 Tiến độ & Nghiệm thu</h1>
        <div className="ml-auto flex gap-2">
          {phases.length === 0 && <CreateFullScheduleButton projectId={project.id} />}
          <CreatePhaseForm projectId={project.id} />
          {phases.length > 0 && <ResetScheduleButton projectId={project.id} />}
        </div>
      </header>

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
          detailGantt={<DetailGantt phases={detailGanttPhases} picOptions={ganttPicOptions} />}
          detail={
            <>
              {phases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  now={now}
                  templates={templatesForForms}
                  phase={{
                    id: phase.id,
                    sortOrder: phase.sortOrder,
                    name: phase.name,
                    type: phase.type,
                    plannedStart: phase.plannedStart?.toISOString() ?? null,
                    plannedEnd: phase.plannedEnd?.toISOString() ?? null,
                    weight: Number(phase.weight),
                    progressPct: Number(phase.progressPct),
                    milestones: phase.milestones.map((m) => ({
                      id: m.id,
                      name: m.name,
                      isHoldPoint: m.isHoldPoint,
                      status: m.status,
                      plannedDate: m.plannedDate?.toISOString() ?? null,
                      requestedAt: m.requestedAt?.toISOString() ?? null,
                      confirmDeadlineHrs: m.confirmDeadlineHrs,
                      lastInspection: m.inspections[0]
                        ? {
                            result: m.inspections[0].result,
                            method: m.inspections[0].method,
                            confirmedAt: m.inspections[0].confirmedAt.toISOString(),
                            notes: m.inspections[0].notes,
                          }
                        : null,
                      checklistItems: m.checklistItems.map((c) => ({ id: c.id, label: c.label, isChecked: c.isChecked })),
                      tasks: m.tasks.map((t) => ({
                        id: t.id, name: t.name, durationDays: t.durationDays, responsible: t.responsible, isDone: t.isDone,
                        dueDate: t.dueDate?.toISOString() ?? null, percentComplete: t.percentComplete,
                      })),
                    })),
                  }}
                  picOptions={ganttPicOptions}
                />
              ))}
            </>
          }
        />
      )}
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject, type GanttPhase } from "@/services/dashboard.service";
import { resolveExpiredHoldPoints } from "@/services/milestone.service";
import { getPicOptions } from "@/services/pic.service";
import { getSignedUrl } from "@/lib/storage";
import { Card, EmptyState } from "@/components/ui";
import { GanttChart } from "@/components/dashboard";
import {
  CreatePhaseForm, CreateFullScheduleButton, ResetScheduleButton,
  PhaseCard,
} from "./forms";
import { ScheduleTabs } from "./ScheduleTabs";
import { PlanModeToggle } from "./PlanModeToggle";
import { DetailGantt, type DetailGanttPhase, type DependencyEdge } from "./DetailGantt";

export const dynamic = "force-dynamic";

/** Date -> ISO string, hoặc null nếu rỗng/hỏng (ví dụ ngày rác lỡ lọt vào DB) — tránh crash cả trang vì 1 dòng dữ liệu xấu */
const toIso = (d: Date | null | undefined) => (d && !isNaN(d.getTime()) ? d.toISOString() : null);

export default async function SchedulePage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  // Compute-on-read: quá 48h chưa xác nhận -> tự động thông qua
  await resolveExpiredHoldPoints(project.id);

  const [phases, checklistTemplates, dependencies] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
      include: {
        milestones: {
          include: {
            inspections: { orderBy: { confirmedAt: "desc" }, take: 1 },
            checklistItems: { orderBy: { sortOrder: "asc" } },
            tasks: { orderBy: { sortOrder: "asc" }, include: { documents: true } },
            documents: true,
          },
        },
      },
    }),
    prisma.checklistTemplate.findMany({
      where: { projectId: project.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { category: "asc" },
    }),
    prisma.taskDependency.findMany({ where: { projectId: project.id } }),
  ]);

  // Tra tên hiển thị cho mốc/việc theo id (dùng cho danh sách "Phụ thuộc vào") — gộp cả 2 cấp WBS
  const nameById = new Map<string, string>();
  for (const p of phases) {
    for (const m of p.milestones) {
      nameById.set(m.id, m.name);
      for (const t of m.tasks) nameById.set(t.id, t.name);
    }
  }
  const dependsOnBysuccessor = new Map<string, string[]>();
  for (const dep of dependencies) {
    const predName = nameById.get(dep.predecessorId);
    if (!predName) continue;
    const list = dependsOnBysuccessor.get(dep.successorId) ?? [];
    list.push(predName);
    dependsOnBysuccessor.set(dep.successorId, list);
  }
  // Ảnh công trường + ghi âm giọng nói (docType SITE_PHOTO/VOICE_NOTE) gắn vào công việc WBS/mốc —
  // tạo signed URL (bucket private) cho mọi file đang có, tách riêng 2 map theo loại.
  type DocRef = { id: string; docType: string; fileUrl: string; title: string };
  async function resolveDocs(docs: DocRef[]) {
    const urls = await Promise.all(docs.map((doc) => getSignedUrl(doc.fileUrl)));
    const resolved = docs.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title, docType: doc.docType })).filter((d) => d.url);
    return {
      photos: resolved.filter((d) => d.docType === "SITE_PHOTO"),
      voiceNotes: resolved.filter((d) => d.docType === "VOICE_NOTE"),
    };
  }

  const photosByTaskId = new Map<string, { id: string; url: string; title: string }[]>();
  const voiceNotesByTaskId = new Map<string, { id: string; url: string; title: string }[]>();
  await Promise.all(
    phases.flatMap((p) =>
      p.milestones.flatMap((m) =>
        m.tasks.map(async (t) => {
          const { photos, voiceNotes } = await resolveDocs(t.documents);
          photosByTaskId.set(t.id, photos);
          voiceNotesByTaskId.set(t.id, voiceNotes);
        }),
      ),
    ),
  );

  // Ảnh/ghi âm gắn thẳng vào mốc (không qua WBS con) — dùng cho mốc chưa có việc con nào
  const photosByMilestoneId = new Map<string, { id: string; url: string; title: string }[]>();
  const voiceNotesByMilestoneId = new Map<string, { id: string; url: string; title: string }[]>();
  await Promise.all(
    phases.flatMap((p) =>
      p.milestones.map(async (m) => {
        const { photos, voiceNotes } = await resolveDocs(m.documents);
        photosByMilestoneId.set(m.id, photos);
        voiceNotesByMilestoneId.set(m.id, voiceNotes);
      }),
    ),
  );

  const dependencyEdges: DependencyEdge[] = dependencies
    .filter((d) => nameById.has(d.predecessorId) && nameById.has(d.successorId))
    .map((d) => ({
      predType: d.predecessorType as "MILESTONE" | "MILESTONE_TASK",
      predId: d.predecessorId,
      succType: d.successorType as "MILESTONE" | "MILESTONE_TASK",
      succId: d.successorId,
    }));
  const templatesForForms = checklistTemplates.map((t) => ({
    category: t.category,
    items: t.items.map((i) => i.label),
  }));

  const ganttPicOptions = await getPicOptions(
    project.id,
    phases.flatMap((p) => p.milestones.flatMap((m) => m.tasks.map((t) => t.responsible))),
  );

  const now = Date.now();

  const ganttPhases: GanttPhase[] = phases.map((p) => {
    const holdPoint = p.milestones.find((m) => m.isHoldPoint);
    return {
      id: p.id,
      name: p.name,
      sortOrder: p.sortOrder,
      plannedStart: toIso(p.plannedStart),
      plannedEnd: toIso(p.plannedEnd),
      progressPct: Number(p.progressPct),
      holdPoint: holdPoint ? { name: holdPoint.name, status: holdPoint.status } : null,
    };
  });

  const detailGanttPhases: DetailGanttPhase[] = phases.map((p) => ({
    id: p.id,
    sortOrder: p.sortOrder,
    name: p.name,
    plannedStart: toIso(p.plannedStart),
    plannedEnd: toIso(p.plannedEnd),
    progressPct: Number(p.progressPct),
    milestones: p.milestones.map((m) => ({
      id: m.id,
      name: m.name,
      isHoldPoint: m.isHoldPoint,
      status: m.status,
      plannedDate: toIso(m.plannedDate),
      responsible: m.responsible,
      percentComplete: m.percentComplete,
      dependsOn: dependsOnBysuccessor.get(m.id),
      tasks: m.tasks.map((t) => ({
        id: t.id, name: t.name, durationDays: t.durationDays, responsible: t.responsible, isDone: t.isDone,
        dueDate: toIso(t.dueDate), percentComplete: t.percentComplete,
        dependsOn: dependsOnBysuccessor.get(t.id),
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
          detailGantt={<DetailGantt phases={detailGanttPhases} picOptions={ganttPicOptions} dependencyEdges={dependencyEdges} />}
          detail={
            <>
              {phases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  now={now}
                  templates={templatesForForms}
                  projectId={project.id}
                  phase={{
                    id: phase.id,
                    sortOrder: phase.sortOrder,
                    name: phase.name,
                    type: phase.type,
                    plannedStart: toIso(phase.plannedStart),
                    plannedEnd: toIso(phase.plannedEnd),
                    weight: Number(phase.weight),
                    progressPct: Number(phase.progressPct),
                    milestones: phase.milestones.map((m) => ({
                      id: m.id,
                      name: m.name,
                      isHoldPoint: m.isHoldPoint,
                      status: m.status,
                      plannedDate: toIso(m.plannedDate),
                      requestedAt: toIso(m.requestedAt),
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
                      photos: photosByMilestoneId.get(m.id) ?? [],
                      voiceNotes: voiceNotesByMilestoneId.get(m.id) ?? [],
                      tasks: m.tasks.map((t) => ({
                        id: t.id, name: t.name, durationDays: t.durationDays, responsible: t.responsible, isDone: t.isDone,
                        dueDate: toIso(t.dueDate), percentComplete: t.percentComplete,
                        photos: photosByTaskId.get(t.id) ?? [],
                        voiceNotes: voiceNotesByTaskId.get(t.id) ?? [],
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

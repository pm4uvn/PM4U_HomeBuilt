import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getTodoItems } from "@/services/todo.service";
import { Card, EmptyState } from "@/components/ui";
import { ScheduleTabs } from "../ScheduleTabs";
import { TodoList } from "./TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const user = await requireUser();
  const myEmail = user.email ?? "";
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [items, stakeholders, contracts, milestones, risks] = await Promise.all([
    getTodoItems(project.id, myEmail),
    prisma.stakeholder.findMany({ where: { projectId: project.id }, select: { name: true } }),
    prisma.contract.findMany({ where: { projectId: project.id }, include: { vendor: { select: { name: true } } } }),
    prisma.milestone.findMany({
      where: { phase: { projectId: project.id } },
      select: { id: true, name: true, phase: { select: { name: true, sortOrder: true } } },
      orderBy: [{ phase: { sortOrder: "asc" } }, { plannedDate: "asc" }],
    }),
    prisma.riskLog.findMany({ where: { projectId: project.id }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const milestoneOptions = milestones.map((m) => ({ id: m.id, name: m.name, phaseName: m.phase.name }));
  const riskOptions = risks.map((r) => ({ id: r.id, title: r.title }));

  // Gợi ý PIC cho ô sửa nhanh — cùng danh sách dùng ở Nhật ký/Gantt chi tiết, vẫn cho gõ tên mới
  const COMMON_PIC_ROLES = ["Chủ đầu tư", "Giám sát công trình", "Kỹ sư kết cấu", "Kỹ sư M&E", "Đơn vị thiết kế"];
  const picOptions = Array.from(
    new Set([
      ...COMMON_PIC_ROLES,
      ...stakeholders.map((s) => s.name),
      ...contracts.map((c) => c.vendor.name),
      ...items.map((it) => it.pic).filter((p): p is string => !!p),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const pendingCount = items.filter((it) => !it.isDone).length;

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">☑️ Việc cần làm</h1>
        <span className="text-ink-2 text-[13px]">
          Gộp từ Nhật ký, WBS tiến độ, Checklist mốc nghiệm thu, Rủi ro, Issue Log và Bảo hành — {pendingCount} việc chưa xong
        </span>
      </header>

      <TodoList
        items={items}
        picOptions={picOptions}
        myEmail={myEmail}
        projectId={project.id}
        milestoneOptions={milestoneOptions}
        riskOptions={riskOptions}
      />
    </div>
  );
}

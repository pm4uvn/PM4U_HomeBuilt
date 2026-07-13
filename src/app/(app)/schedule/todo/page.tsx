import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getTodoItems } from "@/services/todo.service";
import { Card, EmptyState } from "@/components/ui";
import { ScheduleTabs } from "../ScheduleTabs";
import { TodoList } from "./TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [items, stakeholders, contracts] = await Promise.all([
    getTodoItems(project.id),
    prisma.stakeholder.findMany({ where: { projectId: project.id }, select: { name: true } }),
    prisma.contract.findMany({ where: { projectId: project.id }, include: { vendor: { select: { name: true } } } }),
  ]);

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

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">☑️ Việc cần làm</h1>
        <span className="text-ink-2 text-[13px]">
          Gộp từ Nhật ký, WBS tiến độ, Checklist mốc nghiệm thu, và Hoạt động giảm thiểu rủi ro — {items.length} việc chưa xong
        </span>
      </header>

      {items.length === 0 ? (
        <Card><EmptyState title="Không còn việc nào chưa xong 🎉" sub="Mọi checklist, WBS, rủi ro đều đã hoàn thành" /></Card>
      ) : (
        <TodoList items={items} picOptions={picOptions} />
      )}
    </div>
  );
}

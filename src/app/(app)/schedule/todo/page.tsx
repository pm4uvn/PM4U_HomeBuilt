import { requireUser } from "@/lib/auth";
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

  const items = await getTodoItems(project.id);

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
        <TodoList items={items} />
      )}
    </div>
  );
}

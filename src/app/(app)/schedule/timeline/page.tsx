import { requireUser } from "@/lib/auth";
import { getDefaultProject } from "@/services/dashboard.service";
import { getProjectTimeline } from "@/services/timeline.service";
import { getTodoItems } from "@/services/todo.service";
import { Card, EmptyState } from "@/components/ui";
import { ScheduleTabs } from "../ScheduleTabs";
import { ShareControls } from "./ShareControls";
import { TimelineTabs } from "./TimelineTabs";
import { groupTodoItemsByDay } from "./dailyStory";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const user = await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [phaseData, todoItems] = await Promise.all([
    getProjectTimeline(project.id),
    getTodoItems(project.id, user.email ?? ""),
  ]);
  const { days, noDate } = groupTodoItemsByDay(todoItems);

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🖼️ Tiến độ trực quan</h1>
        <span className="text-ink-2 text-[13px]">Ảnh công trường + % tiến độ theo giai đoạn, hoặc story line từng ngày — gửi được link xem cho người thân</span>
      </header>

      <ShareControls projectId={project.id} shareToken={project.shareToken} />
      <TimelineTabs phaseData={phaseData} days={days} noDate={noDate} />
    </div>
  );
}

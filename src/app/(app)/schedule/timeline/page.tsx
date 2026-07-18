import { requireUser } from "@/lib/auth";
import { getDefaultProject } from "@/services/dashboard.service";
import { getProjectTimeline } from "@/services/timeline.service";
import { Card, EmptyState } from "@/components/ui";
import { TimelineView } from "@/components/Timeline";
import { ScheduleTabs } from "../ScheduleTabs";
import { ShareControls } from "./ShareControls";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const data = await getProjectTimeline(project.id);

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🖼️ Tiến độ trực quan</h1>
        <span className="text-ink-2 text-[13px]">Ảnh công trường + % tiến độ theo giai đoạn — gửi được link xem cho người thân</span>
      </header>

      <ShareControls projectId={project.id} shareToken={project.shareToken} />
      <TimelineView data={data} isPublic={false} />
    </div>
  );
}

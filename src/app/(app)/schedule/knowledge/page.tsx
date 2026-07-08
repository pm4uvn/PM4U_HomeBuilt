import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { KNOWLEDGE_BASE } from "@/lib/knowledge-base";
import { ScheduleTabs } from "../ScheduleTabs";
import { KnowledgeBaseList } from "./KnowledgeBaseList";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  await requireUser();

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📚 Kiến thức khởi công & nền móng</h1>
      </header>

      <Card>
        <p className="text-[13px] text-ink-2">
          Tài liệu tra cứu nhanh về {KNOWLEDGE_BASE.length} chủ đề trọng yếu trong giai đoạn khởi công và thi công nền
          móng — đúc kết theo kinh nghiệm quản lý dự án xây dựng nhà ở dân dụng thực tế.
        </p>
      </Card>

      <KnowledgeBaseList articles={KNOWLEDGE_BASE} />
    </div>
  );
}

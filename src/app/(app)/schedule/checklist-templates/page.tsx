import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState } from "@/components/ui";
import {
  CreateTemplateForm, SeedDefaultTemplatesButton, SeedPreConstructionTemplatesButton, DeleteTemplateButton,
  TemplateItemRow, AddTemplateItemForm,
} from "./forms";
import { ScheduleTabs } from "../ScheduleTabs";

export const dynamic = "force-dynamic";

export default async function ChecklistTemplatesPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const templates = await prisma.checklistTemplate.findMany({
    where: { projectId: project.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { category: "asc" },
  });

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">✅ Mẫu Checklist theo hạng mục</h1>
        <div className="ml-auto flex gap-2 flex-wrap">
          <SeedPreConstructionTemplatesButton projectId={project.id} />
          <SeedDefaultTemplatesButton projectId={project.id} />
          <CreateTemplateForm projectId={project.id} />
        </div>
      </header>

      <p className="text-[13px] text-ink-2">
        Mỗi hạng mục là 1 bộ checklist tái sử dụng — khi tạo milestone mới ở trang Tiến độ, bạn có thể
        chọn đúng mẫu để tự điền sẵn các mục cần kiểm tra, thay vì gõ tay từng lần.
      </p>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có mẫu checklist nào"
            sub="Bấm “Nạp mẫu mặc định” để có ngay bộ mẫu theo kinh nghiệm giám sát công trình, rồi tùy chỉnh lại theo ý bạn"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-bold text-[14px]">{t.category}</h2>
                <span className="text-xs text-muted">({t.items.length} mục)</span>
                <span className="ml-auto"><DeleteTemplateButton templateId={t.id} category={t.category} /></span>
              </div>
              {t.items.length === 0 ? (
                <p className="text-xs text-muted">Chưa có mục nào.</p>
              ) : (
                <div className="divide-y divide-grid">
                  {t.items.map((it) => (
                    <TemplateItemRow
                      key={it.id}
                      item={{
                        id: it.id, label: it.label, required: it.required, evidenceRequired: it.evidenceRequired,
                        evidenceType: it.evidenceType, riskIfMissing: it.riskIfMissing, suggestedModule: it.suggestedModule,
                      }}
                    />
                  ))}
                </div>
              )}
              <AddTemplateItemForm templateId={t.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

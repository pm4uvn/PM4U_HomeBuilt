import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { fmtVND, fmtDate } from "@/lib/format";
import { ISSUE_CATEGORY, ISSUE_SEVERITY, ISSUE_STATUS } from "@/lib/labels";
import { ALL_RISK_TEMPLATES } from "@/lib/risk-templates";
import { CreateIssueForm, EditIssueForm, DeleteIssueButton, IssueStatusSelect, IssueActionChecklist } from "./forms";

export const dynamic = "force-dynamic";

const SEV_TAG: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  LOW: "good", MEDIUM: "neutral", HIGH: "warning", CRITICAL: "critical",
};

const STATUS_TAG: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  OPEN: "critical", IN_PROGRESS: "warning", RESOLVED: "good", CLOSED: "neutral",
};

/** Date -> ISO string, hoặc null nếu rỗng/hỏng — tránh crash trang vì 1 dòng dữ liệu xấu */
const toIso = (d: Date | null | undefined) => (d && !isNaN(d.getTime()) ? d.toISOString() : null);

export default async function IssuesPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [issues, risks] = await Promise.all([
    prisma.issueLog.findMany({
      where: { projectId: project.id },
      include: { actions: { orderBy: { sortOrder: "asc" } }, relatedRisk: { select: { title: true } } },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { raisedDate: "desc" }],
    }),
    prisma.riskLog.findMany({
      where: { projectId: project.id },
      select: { id: true, title: true, category: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
  ]);

  // Mẫu rủi ro chưa được thêm vào sổ — vẫn cho chọn để liên kết, chọn xong tự tạo RiskLog thật (xem createIssue/updateIssue)
  const existingRiskTitles = new Set(risks.map((r) => r.title));
  const riskTemplates = ALL_RISK_TEMPLATES.filter((t) => !existingRiskTitles.has(t.title)).map((t) => ({
    title: t.title,
    category: t.category,
  }));

  const now = Date.now();
  const openCount = issues.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length;
  const overdueCount = issues.filter(
    (i) => i.dueDate && i.dueDate.getTime() < now && i.status !== "RESOLVED" && i.status !== "CLOSED",
  ).length;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🐞 Issue Log — Vấn đề phát sinh</h1>
        <div className="ml-auto flex gap-2 flex-wrap">
          <CreateIssueForm projectId={project.id} risks={risks} riskTemplates={riskTemplates} />
        </div>
      </header>

      <p className="text-xs text-muted -mt-1.5">
        Ghi nhận vấn đề <b>đã thực sự xảy ra</b> cần xử lý (giao sai vật tư, lỗi thi công, khiếu nại...) —
        khác với trang <b>⚠️ Rủi ro</b> là dự đoán những gì <b>có thể</b> xảy ra. Có thể liên kết 1 vấn đề tới rủi ro đã ghi nhận trước đó nếu vấn đề là hệ quả của rủi ro đó.
      </p>

      <div className="flex gap-3 flex-wrap">
        <Card className="flex-1 min-w-[160px]">
          <div className="text-xs text-muted">Đang mở/xử lý</div>
          <div className="text-2xl font-bold">{openCount}</div>
        </Card>
        <Card className="flex-1 min-w-[160px]">
          <div className="text-xs text-muted">Quá hạn xử lý</div>
          <div className="text-2xl font-bold" style={{ color: overdueCount > 0 ? "var(--critical)" : undefined }}>{overdueCount}</div>
        </Card>
        <Card className="flex-1 min-w-[160px]">
          <div className="text-xs text-muted">Tổng số</div>
          <div className="text-2xl font-bold">{issues.length}</div>
        </Card>
      </div>

      <Card title={`Sổ vấn đề (${issues.length})`}>
        {issues.length === 0 ? (
          <EmptyState title="Chưa ghi nhận vấn đề nào" sub="Bấm “+ Vấn đề” để ghi nhận vấn đề vừa phát sinh" />
        ) : (
          <div className="space-y-2">
            {issues.map((i) => {
              const isOverdue = i.dueDate && i.dueDate.getTime() < now && i.status !== "RESOLVED" && i.status !== "CLOSED";
              return (
                <div key={i.id} className="flex items-start gap-3 flex-wrap border border-line rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13.5px] flex items-center gap-2 flex-wrap">
                      {isOverdue && "⚠️ "}
                      {i.title}
                      <Tag sev={SEV_TAG[i.priority]}>{ISSUE_SEVERITY[i.priority]}</Tag>
                      <span className="text-xs text-muted font-normal">{ISSUE_CATEGORY[i.category]}</span>
                    </div>
                    <div className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Phát hiện: <b className="text-ink-2">{fmtDate(i.raisedDate)}</b></span>
                      {i.dueDate && (
                        <span style={{ color: isOverdue ? "var(--critical)" : undefined }}>
                          · Hạn xử lý: <b>{fmtDate(i.dueDate)}</b>{isOverdue && " — quá hạn"}
                        </span>
                      )}
                      {i.raisedBy && <span>· Báo cáo bởi: <b className="text-ink-2">{i.raisedBy}</b></span>}
                      {i.owner && <span>· Phụ trách: <b className="text-ink-2">{i.owner}</b></span>}
                      {i.relatedRisk && <span>· Liên kết rủi ro: <b className="text-ink-2">{i.relatedRisk.title}</b></span>}
                    </div>
                    {i.description && <div className="text-[12.5px] text-ink-2 mt-0.5">{i.description}</div>}
                    {i.costImpact != null && (
                      <div className="text-xs text-muted mt-0.5">
                        Ước tính ảnh hưởng: <b>{fmtVND(Number(i.costImpact))}</b>
                      </div>
                    )}
                    {i.resolution && (
                      <div className="text-xs text-muted mt-0.5 whitespace-pre-wrap">Đã xử lý: {i.resolution}</div>
                    )}
                    <IssueActionChecklist
                      issueId={i.id}
                      actions={i.actions.map((a) => ({ id: a.id, label: a.label, isDone: a.isDone }))}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Tag sev={STATUS_TAG[i.status]}>{ISSUE_STATUS[i.status]}</Tag>
                    <IssueStatusSelect issueId={i.id} current={i.status} />
                    <div className="flex gap-1.5">
                      <EditIssueForm
                        issue={{
                          id: i.id,
                          category: i.category,
                          title: i.title,
                          description: i.description,
                          priority: i.priority,
                          raisedBy: i.raisedBy,
                          owner: i.owner,
                          raisedDate: toIso(i.raisedDate),
                          dueDate: toIso(i.dueDate),
                          costImpact: i.costImpact != null ? Number(i.costImpact) : null,
                          resolution: i.resolution,
                          relatedRiskId: i.relatedRiskId,
                        }}
                        risks={risks}
                        riskTemplates={riskTemplates}
                      />
                      <DeleteIssueButton issueId={i.id} title={i.title} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

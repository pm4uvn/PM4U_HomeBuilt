import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getPicOptions } from "@/services/pic.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { DEFECT_CATEGORY, DEFECT_SEVERITY, DEFECT_STATUS } from "@/lib/labels";
import { CreateDefectForm, EditDefectForm, DeleteDefectButton, DefectStatusSelect, DefectActionChecklist } from "./forms";

export const dynamic = "force-dynamic";

const SEV_TAG: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  LOW: "good", MEDIUM: "neutral", HIGH: "warning", CRITICAL: "critical",
};

const STATUS_TAG: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  OPEN: "critical", IN_PROGRESS: "warning", FIXED: "good", CLOSED: "neutral",
};

/** Date -> ISO string, hoặc null nếu rỗng/hỏng — tránh crash trang vì 1 dòng dữ liệu xấu */
const toIso = (d: Date | null | undefined) => (d && !isNaN(d.getTime()) ? d.toISOString() : null);

export default async function DefectsPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [defects, contractRows] = await Promise.all([
    prisma.defectLog.findMany({
      where: { projectId: project.id },
      include: { actions: { orderBy: { sortOrder: "asc" } }, contract: { select: { code: true, vendor: { select: { name: true } } } } },
      orderBy: [{ status: "asc" }, { severity: "desc" }, { reportedDate: "desc" }],
    }),
    prisma.contract.findMany({ where: { projectId: project.id }, include: { vendor: { select: { name: true } } }, orderBy: { code: "asc" } }),
  ]);
  const contracts = contractRows.map((c) => ({ id: c.id, label: `${c.code} — ${c.vendor.name}` }));
  const picOptions = await getPicOptions(project.id, defects.map((d) => d.owner));

  const now = Date.now();
  const WARRANTY_WARN_DAYS = 30;
  const openCount = defects.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS").length;
  const overdueCount = defects.filter(
    (d) => d.dueDate && d.dueDate.getTime() < now && d.status !== "FIXED" && d.status !== "CLOSED",
  ).length;
  const warrantyExpiringCount = defects.filter(
    (d) => d.warrantyEndAt && d.warrantyEndAt.getTime() > now &&
      (d.warrantyEndAt.getTime() - now) / 86_400_000 <= WARRANTY_WARN_DAYS &&
      d.status !== "FIXED" && d.status !== "CLOSED",
  ).length;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🔧 Sổ khiếm khuyết & Bảo hành</h1>
        <div className="ml-auto flex gap-2 flex-wrap">
          <CreateDefectForm projectId={project.id} contracts={contracts} defaultWarrantyStart={null} picOptions={picOptions} />
        </div>
      </header>

      <p className="text-xs text-muted -mt-1.5">
        Ghi nhận khiếm khuyết phát hiện lúc nghiệm thu bàn giao hoặc trong thời hạn bảo hành, theo dõi
        tới khi xử lý xong — kèm đếm ngược ngày hết hạn khiếu nại nhà thầu để không bị bỏ quên sau bàn giao.
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
          <div className="text-xs text-muted">Sắp hết hạn bảo hành (≤30 ngày)</div>
          <div className="text-2xl font-bold" style={{ color: warrantyExpiringCount > 0 ? "var(--warning)" : undefined }}>{warrantyExpiringCount}</div>
        </Card>
        <Card className="flex-1 min-w-[160px]">
          <div className="text-xs text-muted">Tổng số</div>
          <div className="text-2xl font-bold">{defects.length}</div>
        </Card>
      </div>

      <Card title={`Sổ khiếm khuyết (${defects.length})`}>
        {defects.length === 0 ? (
          <EmptyState title="Chưa ghi nhận khiếm khuyết nào" sub="Bấm “+ Khiếm khuyết” để ghi nhận lỗi phát hiện lúc bàn giao" />
        ) : (
          <div className="space-y-2">
            {defects.map((d) => {
              const isOverdue = d.dueDate && d.dueDate.getTime() < now && d.status !== "FIXED" && d.status !== "CLOSED";
              const warrantyDaysLeft = d.warrantyEndAt ? Math.ceil((d.warrantyEndAt.getTime() - now) / 86_400_000) : null;
              const warrantyExpired = warrantyDaysLeft != null && warrantyDaysLeft < 0;
              const warrantyExpiring = warrantyDaysLeft != null && warrantyDaysLeft >= 0 && warrantyDaysLeft <= WARRANTY_WARN_DAYS;
              return (
                <div key={d.id} className="flex items-start gap-3 flex-wrap border border-line rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13.5px] flex items-center gap-2 flex-wrap">
                      {isOverdue && "⚠️ "}
                      {d.title}
                      <Tag sev={SEV_TAG[d.severity]}>{DEFECT_SEVERITY[d.severity]}</Tag>
                      <span className="text-xs text-muted font-normal">{DEFECT_CATEGORY[d.category]}</span>
                      {d.location && <span className="text-xs text-muted font-normal">· {d.location}</span>}
                    </div>
                    <div className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Phát hiện: <b className="text-ink-2">{fmtDate(d.reportedDate)}</b></span>
                      {d.dueDate && (
                        <span style={{ color: isOverdue ? "var(--critical)" : undefined }}>
                          · Hạn xử lý: <b>{fmtDate(d.dueDate)}</b>{isOverdue && " — quá hạn"}
                        </span>
                      )}
                      {d.reportedBy && <span>· Báo cáo bởi: <b className="text-ink-2">{d.reportedBy}</b></span>}
                      {d.owner && <span>· Phụ trách: <b className="text-ink-2">{d.owner}</b></span>}
                      {d.contract && <span>· Nhà thầu: <b className="text-ink-2">{d.contract.vendor.name}</b></span>}
                    </div>
                    {d.warrantyEndAt && (
                      <div className="text-xs mt-0.5" style={{ color: warrantyExpired ? "var(--muted)" : warrantyExpiring ? "var(--warning)" : undefined }}>
                        {warrantyExpired
                          ? `🔒 Đã hết hạn bảo hành (${fmtDate(d.warrantyEndAt)})`
                          : warrantyExpiring
                            ? `⏰ Còn ${warrantyDaysLeft} ngày là hết hạn bảo hành (${fmtDate(d.warrantyEndAt)})`
                            : `Bảo hành đến ${fmtDate(d.warrantyEndAt)}`}
                      </div>
                    )}
                    {d.description && <div className="text-[12.5px] text-ink-2 mt-0.5">{d.description}</div>}
                    {d.resolution && (
                      <div className="text-xs text-muted mt-0.5 whitespace-pre-wrap">Đã xử lý: {d.resolution}</div>
                    )}
                    <DefectActionChecklist
                      defectId={d.id}
                      actions={d.actions.map((a) => ({ id: a.id, label: a.label, isDone: a.isDone }))}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Tag sev={STATUS_TAG[d.status]}>{DEFECT_STATUS[d.status]}</Tag>
                    <DefectStatusSelect defectId={d.id} current={d.status} />
                    <div className="flex gap-1.5">
                      <EditDefectForm
                        defect={{
                          id: d.id,
                          category: d.category,
                          title: d.title,
                          description: d.description,
                          severity: d.severity,
                          location: d.location,
                          reportedBy: d.reportedBy,
                          owner: d.owner,
                          reportedDate: toIso(d.reportedDate),
                          dueDate: toIso(d.dueDate),
                          contractId: d.contractId,
                          warrantyMonths: d.warrantyMonths,
                          warrantyStartAt: toIso(d.warrantyStartAt),
                          resolution: d.resolution,
                        }}
                        contracts={contracts}
                        picOptions={picOptions}
                      />
                      <DeleteDefectButton defectId={d.id} title={d.title} />
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

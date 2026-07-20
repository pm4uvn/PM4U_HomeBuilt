import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getPicOptions } from "@/services/pic.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { fmtVND, fmtDate, daysBetween } from "@/lib/format";
import { RISK_CATEGORY, RISK_SEVERITY, RISK_PROBABILITY, RISK_RESPONSE_STRATEGY, IDLE_CAUSE } from "@/lib/labels";
import {
  CreateRiskForm, EditRiskForm, DeleteRiskButton, RiskStatusSelect, CreateNeighborSurveyForm,
  StartIdleWaitForm, StopIdleWaitButton, CreatePilingRecordForm, AddPileItemForm, PileTableToggle,
  RiskTemplateLibrary, ActionMenu, RiskMitigationChecklist, AutoRiskAlerts,
} from "./forms";
import { computePreConstructionRiskAlerts } from "@/services/preconstruction.service";

export const dynamic = "force-dynamic";

const SEV_TAG: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  LOW: "good", MEDIUM: "neutral", HIGH: "warning", CRITICAL: "critical",
};

export default async function RisksPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [risks, surveys, idleLogs, pilingRecords, contracts, autoAlerts] = await Promise.all([
    prisma.riskLog.findMany({
      where: { projectId: project.id },
      include: { mitigationActions: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ status: "asc" }, { severity: "desc" }],
    }),
    prisma.neighborSurvey.findMany({ where: { projectId: project.id }, orderBy: { surveyDate: "desc" } }),
    prisma.idleWaitLog.findMany({
      where: { contract: { projectId: project.id } },
      include: { contract: { include: { vendor: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.pilingRecord.findMany({
      where: { projectId: project.id },
      include: { piles: { orderBy: { pileNo: "asc" } } },
    }),
    prisma.contract.findMany({ where: { projectId: project.id }, include: { vendor: true } }),
    computePreConstructionRiskAlerts(project.id),
  ]);

  const now = new Date();
  const picOptions = await getPicOptions(project.id, risks.map((r) => r.owner));

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">⚠️ Quản lý rủi ro</h1>
        <div className="ml-auto flex gap-2 flex-wrap">
          <ActionMenu label="+ Ghi nhận khác">
            <CreateNeighborSurveyForm projectId={project.id} />
            {contracts.length > 0 && (
              <StartIdleWaitForm
                contracts={contracts.map((c) => ({ id: c.id, label: `${c.code} — ${c.vendor.name}` }))}
              />
            )}
            <CreatePilingRecordForm projectId={project.id} />
          </ActionMenu>
          <CreateRiskForm projectId={project.id} picOptions={picOptions} />
        </div>
      </header>

      <AutoRiskAlerts projectId={project.id} alerts={autoAlerts} />

      <RiskTemplateLibrary projectId={project.id} existingTitles={risks.map((r) => r.title)} />

      {/* Sổ rủi ro */}
      <Card title={`Sổ rủi ro (${risks.length})`}>
        {risks.length === 0 ? (
          <EmptyState title="Chưa ghi nhận rủi ro" />
        ) : (
          <div className="space-y-2">
            {risks.map((r) => (
              <div key={r.id} className="flex items-start gap-3 flex-wrap border border-line rounded-lg px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13.5px] flex items-center gap-2 flex-wrap">
                    {r.title}
                    <Tag sev={SEV_TAG[r.severity]}>{RISK_SEVERITY[r.severity]}</Tag>
                    <span className="text-xs text-muted font-normal">{RISK_CATEGORY[r.category]}</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Xác suất: <b className="text-ink-2">{RISK_PROBABILITY[r.probability]}</b></span>
                    <span>· Ứng phó: <b className="text-ink-2">{RISK_RESPONSE_STRATEGY[r.responseStrategy]}</b></span>
                    {r.owner && <span>· Phụ trách: <b className="text-ink-2">{r.owner}</b></span>}
                  </div>
                  {r.description && <div className="text-[12.5px] text-ink-2 mt-0.5">{r.description}</div>}
                  <div className="text-xs text-muted mt-0.5">
                    {r.estimatedCostImpact != null && <>Ước tính ảnh hưởng: <b>{fmtVND(Number(r.estimatedCostImpact))}</b></>}
                    {r.actualCostImpact != null && <> · Thực tế: <b style={{ color: "var(--critical)" }}>{fmtVND(Number(r.actualCostImpact))}</b></>}
                  </div>
                  {r.mitigationActions.length > 0 ? (
                    <RiskMitigationChecklist
                      actions={r.mitigationActions.map((a) => ({ id: a.id, label: a.label, isDone: a.isDone }))}
                    />
                  ) : (
                    r.mitigationPlan && (
                      <div className="text-xs text-muted mt-0.5 whitespace-pre-wrap">Xử lý: {r.mitigationPlan}</div>
                    )
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <RiskStatusSelect riskId={r.id} current={r.status} />
                  <div className="flex gap-1.5">
                    <EditRiskForm
                      risk={{
                        id: r.id,
                        category: r.category,
                        title: r.title,
                        description: r.description,
                        probability: r.probability,
                        severity: r.severity,
                        responseStrategy: r.responseStrategy,
                        owner: r.owner,
                        estimatedCostImpact: r.estimatedCostImpact != null ? Number(r.estimatedCostImpact) : null,
                        actualCostImpact: r.actualCostImpact != null ? Number(r.actualCostImpact) : null,
                        mitigationPlan: r.mitigationPlan,
                      }}
                      picOptions={picOptions}
                    />
                    <DeleteRiskButton riskId={r.id} title={r.title} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        {/* Khảo sát lân cận */}
        <Card title={`Khảo sát hiện trạng nhà lân cận (${surveys.length})`}>
          <p className="text-xs text-muted mb-3">
            📸 Chụp ảnh/video hiện trạng TRƯỚC khi ép cọc/đào móng — bằng chứng pháp lý khi có khiếu nại lún nứt.
            File ảnh lưu ở trang Hồ sơ với loại &quot;Ảnh/video khảo sát&quot;.
          </p>
          {surveys.length === 0 ? (
            <EmptyState title="Chưa khảo sát nhà nào" />
          ) : (
            <ul className="space-y-2 text-[13px]">
              {surveys.map((s) => (
                <li key={s.id} className="border-b border-grid last:border-0 pb-2">
                  <div className="font-semibold">{s.neighborAddress}</div>
                  <div className="text-ink-2 text-xs">
                    {s.neighborName && `${s.neighborName} · `}
                    {s.neighborPhone && `${s.neighborPhone} · `}
                    khảo sát {fmtDate(s.surveyDate)} ·{" "}
                    {s.hasExistingCracks ? "⚠️ CÓ vết nứt sẵn" : "✅ không có vết nứt sẵn"}
                  </div>
                  {s.notes && <div className="text-xs text-muted">{s.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Phạt chờ việc */}
        <Card title={`Tracker phạt chờ việc (${idleLogs.length})`}>
          {idleLogs.length === 0 ? (
            <EmptyState title="Không có sự kiện chờ việc" sub="VD: dàn máy ép cọc đứng chờ vì chưa dọn mặt bằng — 4tr/ngày" />
          ) : (
            <div className="space-y-2">
              {idleLogs.map((log) => {
                const running = !log.endDate;
                const days = Math.max(1, daysBetween(log.startDate, log.endDate ?? now) + (running ? 1 : 0));
                const total = days * Number(log.dailyPenalty);
                return (
                  <div key={log.id} className="border border-line rounded-lg px-3 py-2.5 text-[13px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b>{log.contract.vendor.name}</b>
                      <span className="text-muted text-xs">{IDLE_CAUSE[log.cause]}</span>
                      {running ? <Tag sev="critical">ĐANG CHẠY — ngày {days}</Tag> : <Tag sev="neutral">Đã dừng</Tag>}
                      {running && <StopIdleWaitButton idleLogId={log.id} />}
                    </div>
                    <div className="text-ink-2 text-xs mt-1 money">
                      {fmtDate(log.startDate)} → {log.endDate ? fmtDate(log.endDate) : "nay"} ·{" "}
                      {fmtVND(Number(log.dailyPenalty))}/ngày ·{" "}
                      lũy kế <b style={{ color: "var(--critical)" }}>{fmtVND(total)}</b>
                    </div>
                    {log.note && <div className="text-xs text-muted mt-0.5">{log.note}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Đối soát cọc ép */}
      {pilingRecords.map((rec) => {
        const totalSurplus = rec.piles.reduce((s, p) => s + Number(p.cutOffLength ?? 0), 0);
        const surplusCost = totalSurplus * Number(rec.unitPricePerMeter);
        const avgActual =
          rec.piles.filter((p) => p.actualDepth != null).length > 0
            ? rec.piles.reduce((s, p) => s + Number(p.actualDepth ?? 0), 0) /
              rec.piles.filter((p) => p.actualDepth != null).length
            : 0;
        return (
          <Card key={rec.id} title="Đối soát cọc: ép thử vs đại trà">
            <div className="flex gap-4 flex-wrap text-[13px] mb-3">
              <span>Cọc thử: <b>{rec.testPileCount} cây · sâu TB {Number(rec.testPileAvgDepth)}m</b></span>
              <span>Đặt hàng: <b>{Number(rec.designPileLength)}m/cây</b></span>
              <span>Đại trà: <b>{rec.piles.length} cây · sâu TB {avgActual.toFixed(1)}m</b></span>
              {totalSurplus > 0 && (
                <span style={{ color: "var(--critical)" }}>
                  Dư <b>{totalSurplus.toFixed(1)}m ≈ {fmtVND(Math.round(surplusCost))}</b>
                  {rec.returnFreightFee && ` + phí trả ${fmtVND(Number(rec.returnFreightFee))}`}
                </span>
              )}
              <span className="ml-auto">
                <AddPileItemForm
                  pilingRecordId={rec.id}
                  nextPileNo={rec.piles.length + 1}
                  designLength={Number(rec.designPileLength)}
                />
              </span>
            </div>
            <PileTableToggle
              piles={rec.piles.map((p) => ({
                id: p.id,
                pileNo: p.pileNo,
                plannedLength: Number(p.plannedLength),
                actualDepth: p.actualDepth != null ? Number(p.actualDepth) : null,
                cutOffLength: p.cutOffLength != null ? Number(p.cutOffLength) : null,
                pressedAt: p.pressedAt?.toISOString() ?? null,
              }))}
            />
          </Card>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextDisbursement } from "@/services/disbursement.service";
import { syncStagesWithApprovedMilestones } from "@/services/milestone.service";
import { getSignedUrl } from "@/lib/storage";
import { computeStageGrossAmount } from "@/lib/payment-calc";
import { Card, Tag, StatusPill, EmptyState } from "@/components/ui";
import { PreviewButton } from "@/components/FilePreview";
import { fmtVND, fmtDate } from "@/lib/format";
import {
  VENDOR_TYPE, CONTRACT_STATUS, PAYMENT_STATUS, PENALTY_TYPE, PENALTY_BASIS,
  DISCOUNT_TYPE, VARIATION_REASON, VARIATION_STATUS, MILESTONE_STATUS, DOC_TYPE,
} from "@/lib/labels";
import {
  AddStageForm, EditStageForm, AddPaymentForm, PaymentTransactionList,
  AddPenaltyRuleForm, RecordPenaltyEventForm,
  AddDiscountForm, CreateVariationForm, VariationDecision, UploadContractFileForm, EditContractForm,
} from "../forms";

export const dynamic = "force-dynamic";

const PAY_SEV: Record<string, "good" | "warning" | "serious" | "critical" | "neutral"> = {
  UPCOMING: "neutral", DUE: "warning", OVERDUE: "critical", PARTIAL: "serious", PAID: "good",
} as const;
const VAR_SEV: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  DRAFT: "neutral", SUBMITTED: "warning", APPROVED: "good", REJECTED: "critical",
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      vendor: true,
      paymentStages: {
        orderBy: { stageNo: "asc" },
        include: {
          triggerMilestone: true,
          transactions: { orderBy: { paidDate: "desc" }, include: { paidFromAccount: true } },
        },
      },
      penaltyRules: true,
      penaltyEvents: { include: { rule: true }, orderBy: { startDate: "desc" } },
      discountsReceived: { include: { conditionContract: true } },
      variations: { orderBy: { code: "asc" } },
    },
  });
  if (!contract) notFound();

  // Đợt kẹt ở UPCOMING dù milestone trigger đã nghiệm thu xong (vd: đợt thêm sau khi đã duyệt) -> kích hoạt ngay
  await syncStagesWithApprovedMilestones(contract.projectId);
  contract.paymentStages = await prisma.paymentStage.findMany({
    where: { contractId: id },
    orderBy: { stageNo: "asc" },
    include: {
      triggerMilestone: true,
      transactions: { orderBy: { paidDate: "desc" }, include: { paidFromAccount: true } },
    },
  });

  const [milestones, otherContracts, disbursement, documents, vendors, bankAccounts] = await Promise.all([
    prisma.milestone.findMany({
      where: { phase: { projectId: contract.projectId } },
      orderBy: { phase: { sortOrder: "asc" } },
      include: { phase: { select: { name: true } } },
    }),
    prisma.contract.findMany({
      where: { projectId: contract.projectId, id: { not: id } },
      include: { vendor: true },
    }),
    getNextDisbursement(id).catch(() => null),
    prisma.document.findMany({ where: { contractId: id }, orderBy: { uploadedAt: "desc" } }),
    prisma.vendor.findMany({ where: { projectId: contract.projectId } }),
    prisma.bankAccount.findMany({ where: { projectId: contract.projectId } }),
  ]);
  const documentUrls = await Promise.all(documents.map((d) => getSignedUrl(d.fileUrl)));

  const value = Number(contract.contractValue);
  const totalPenalties = contract.penaltyEvents.reduce((s, e) => s + Number(e.computedAmount), 0);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <Link href="/contracts" className="text-muted hover:text-ink">←</Link>
        <h1 className="text-xl font-bold">{contract.code}</h1>
        <Tag sev={contract.status === "IN_PROGRESS" ? "good" : "neutral"}>
          {CONTRACT_STATUS[contract.status]}
        </Tag>
        <div className="ml-auto">
          <EditContractForm
            contract={{
              id: contract.id,
              vendorId: contract.vendorId,
              code: contract.code,
              title: contract.title,
              status: contract.status,
              contractValue: Number(contract.contractValue),
              vatRate: Number(contract.vatRate),
              retentionPct: Number(contract.retentionPct),
              signedDate: contract.signedDate?.toISOString() ?? null,
              startDate: contract.startDate?.toISOString() ?? null,
              plannedEndDate: contract.plannedEndDate?.toISOString() ?? null,
            }}
            vendors={vendors.map((v) => ({ id: v.id, name: v.name, type: v.type }))}
          />
        </div>
      </header>

      {/* Thông tin chung */}
      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        <Card title="Thông tin hợp đồng">
          <dl className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted">Nhà thầu</dt><dd className="font-semibold">{contract.vendor.name} ({VENDOR_TYPE[contract.vendor.type]})</dd></div>
            {contract.vendor.taxCode && (
              <div className="flex justify-between"><dt className="text-muted">Mã số thuế</dt><dd>{contract.vendor.taxCode}</dd></div>
            )}
            {contract.vendor.address && (
              <div className="flex justify-between"><dt className="text-muted">Địa chỉ</dt><dd>{contract.vendor.address}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted">Nội dung</dt><dd>{contract.title}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Giá trị (trước VAT)</dt><dd className="font-bold money">{fmtVND(value)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">VAT / Giữ bảo hành</dt><dd className="money">{Number(contract.vatRate)}% / {Number(contract.retentionPct)}%</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Tổng giá trị (đã gồm VAT)</dt><dd className="font-bold money" style={{ color: "var(--good-text)" }}>{fmtVND(value * (1 + Number(contract.vatRate) / 100))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Ký / Khởi công / Hoàn thành</dt><dd className="money">{fmtDate(contract.signedDate)} · {fmtDate(contract.startDate)} · {fmtDate(contract.plannedEndDate)}</dd></div>
            {contract.vendor.bankName && contract.vendor.bankAccountNumber && (
              <div className="flex justify-between">
                <dt className="text-muted">TK nhận tiền</dt>
                <dd>{contract.vendor.bankName} · {contract.vendor.bankAccountNumber}{contract.vendor.bankAccountHolder && ` · ${contract.vendor.bankAccountHolder}`}</dd>
              </div>
            )}
            {totalPenalties > 0 && (
              <div className="flex justify-between"><dt className="text-muted">Tổng phạt đã ghi nhận</dt><dd className="font-bold money" style={{ color: "var(--critical)" }}>{fmtVND(totalPenalties)}</dd></div>
            )}
          </dl>
        </Card>

        {/* Giải ngân đợt kế tiếp */}
        <Card title="💸 Đợt giải ngân kế tiếp">
          {!disbursement ? (
            <EmptyState title="Đã thanh toán đủ các đợt" />
          ) : (
            <div className="text-[13px] space-y-1">
              <div className="font-semibold">
                Đợt {disbursement.stageNo}: {disbursement.stageName}{" "}
                {disbursement.isReadyToPay ? (
                  <Tag sev="warning">Sẵn sàng chi</Tag>
                ) : (
                  <Tag sev="neutral">Chưa đủ điều kiện</Tag>
                )}
              </div>
              {disbursement.blockedReason && (
                <p className="text-ink-2">⛔ {disbursement.blockedReason}</p>
              )}
              <div className="border-t border-grid mt-2 pt-2 space-y-1 money">
                <Row l="Tiền gốc đợt" v={disbursement.breakdown.baseAmount} />
                <Row l="VAT" v={disbursement.breakdown.vat} />
                {disbursement.breakdown.approvedVariations !== "0" && <Row l="Phát sinh đã duyệt" v={disbursement.breakdown.approvedVariations} />}
                {disbursement.breakdown.discounts !== "0" && <Row l="Giảm trừ" v={String(-Number(disbursement.breakdown.discounts))} />}
                <Row l={Number(disbursement.breakdown.retentionHeld) >= 0 ? "Giữ lại bảo hành" : "Hoàn tiền bảo hành"} v={String(-Number(disbursement.breakdown.retentionHeld))} />
                {disbursement.breakdown.lateProgressPenalty !== "0" && <Row l="Phạt trễ tiến độ (trừ thầu)" v={disbursement.breakdown.lateProgressPenalty} />}
                {disbursement.breakdown.idleWaitPenalty !== "0" && <Row l="Phạt chờ việc (CĐT trả)" v={`+${disbursement.breakdown.idleWaitPenalty}`} />}
                {disbursement.breakdown.alreadyPaid !== "0" && <Row l="Đã trả một phần" v={disbursement.breakdown.alreadyPaid} />}
                <div className="flex justify-between border-t border-grid pt-1.5 font-bold text-sm">
                  <span>SỐ TIỀN CẦN CHUẨN BỊ</span>
                  <span>{fmtVND(disbursement.netPayable)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Tài liệu đính kèm — tải trực tiếp hoặc gắn từ trang Hồ sơ */}
      <Card title={`📎 Tài liệu đính kèm (${documents.length})`}>
        <div className="mb-3">
          <UploadContractFileForm contractId={id} projectId={contract.projectId} contractCode={contract.code} />
        </div>
        {documents.length === 0 ? (
          <EmptyState title="Chưa có file nào" sub="Bấm “+ Tải file hợp đồng” ở trên để đính kèm bản scan, biên bản..." />
        ) : (
          <ul className="divide-y divide-grid">
            {documents.map((d, i) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <div className="min-w-0">
                  <span className="font-semibold">{d.title}</span>
                  <span className="text-muted"> · {DOC_TYPE[d.docType]}</span>
                </div>
                {documentUrls[i] ? (
                  <PreviewButton url={documentUrls[i]!} mimeType={d.mimeType} title={d.title} />
                ) : (
                  <span className="text-muted text-xs">—</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Đợt thanh toán */}
      <Card title={`Đợt thanh toán (${contract.paymentStages.length})`}>
        <div className="mb-3">
          <AddStageForm
            contractId={id}
            contractValue={value}
            vatRate={Number(contract.vatRate)}
            nextStageNo={contract.paymentStages.length + 1}
            existingPercentTotal={contract.paymentStages.reduce((s, p) => s + Number(p.percent), 0)}
            milestones={milestones.map((m) => ({ id: m.id, name: m.name, phaseName: m.phase.name }))}
          />
        </div>
        {contract.paymentStages.length === 0 ? (
          <EmptyState title="Chưa cấu hình đợt thanh toán" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Đợt</th>
                <th className="py-1 pr-2 font-semibold">%</th>
                <th className="py-1 pr-2 font-semibold text-right">≈ Số tiền (gồm VAT)</th>
                <th className="py-1 pr-2 font-semibold">Điều kiện (milestone)</th>
                <th className="py-1 pr-2 font-semibold">Hạn</th>
                <th className="py-1 pr-2 font-semibold">Trạng thái</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {contract.paymentStages.map((s) => {
                // Nhất quán với khối "Đợt giải ngân kế tiếp": gốc + VAT, trừ/hoàn giữ lại bảo hành
                const baseAmount = (value * Number(s.percent)) / 100;
                const gross = Math.round(
                  computeStageGrossAmount({
                    contractValue: value,
                    vatRate: Number(contract.vatRate),
                    retentionPct: Number(contract.retentionPct),
                    percent: Number(s.percent),
                    isFinal: s.isFinal,
                  }),
                );
                const paidSoFar = s.paidAmount != null ? Number(s.paidAmount) : 0;
                const remaining = Math.max(0, gross - paidSoFar);
                const canPay = s.status === "DUE" || s.status === "OVERDUE" || s.status === "PARTIAL";
                return (
                  <Fragment key={s.id}>
                    <tr className="border-b border-grid last:border-0 text-[13px]">
                      <td className="py-2 pr-2 font-semibold align-top">Đợt {s.stageNo}: {s.name}{s.isFinal && " 🏁"}</td>
                      <td className="py-2 pr-2 money align-top">{Number(s.percent).toFixed(2)}%</td>
                      <td className="py-2 pr-2 text-right money align-top">
                        {fmtVND(gross)}
                        <div className="text-muted text-xs font-normal">({fmtVND(Math.round(baseAmount))} + VAT)</div>
                        {s.status === "PARTIAL" && (
                          <div className="text-xs font-normal" style={{ color: "var(--serious)" }}>
                            Đã trả {fmtVND(paidSoFar)} — còn {fmtVND(remaining)}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-ink-2 align-top">
                        {s.triggerMilestone
                          ? `${s.triggerMilestone.name} (${MILESTONE_STATUS[s.triggerMilestone.status]})`
                          : "—"}
                      </td>
                      <td className="py-2 pr-2 money align-top">
                        {s.dueDate ? (
                          fmtDate(s.dueDate)
                        ) : s.triggerMilestone?.plannedDate ? (
                          <span className="text-muted italic" title="Dự kiến — chỉ chính thức sau khi milestone nghiệm thu đạt">
                            ~{fmtDate(s.triggerMilestone.plannedDate)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <StatusPill
                          status={PAY_SEV[s.status]}
                          label={PAYMENT_STATUS[s.status] + (s.status === "PAID" && s.paidAmount ? ` (${fmtVND(Number(s.paidAmount))})` : "")}
                        />
                      </td>
                      <td className="py-2 text-right whitespace-nowrap align-top">
                        {canPay && (
                          <AddPaymentForm
                            stageId={s.id}
                            remainingAmount={remaining}
                            vendorBank={{
                              bankName: contract.vendor.bankName,
                              bankAccountNumber: contract.vendor.bankAccountNumber,
                              bankAccountHolder: contract.vendor.bankAccountHolder,
                            }}
                            bankAccounts={bankAccounts.map((a) => ({
                              id: a.id, nickname: a.nickname, bankName: a.bankName, accountNumber: a.accountNumber,
                            }))}
                          />
                        )}
                        <span className="ml-1.5">
                          <EditStageForm
                            stage={{
                              id: s.id, stageNo: s.stageNo, name: s.name, percent: Number(s.percent), status: s.status,
                              triggerMilestoneId: s.triggerMilestoneId, dueDaysAfterTrigger: s.dueDaysAfterTrigger,
                              dueDate: s.dueDate?.toISOString() ?? null,
                              isFinal: s.isFinal,
                              paidAmount: s.paidAmount != null ? Number(s.paidAmount) : null,
                              paidDate: s.paidDate?.toISOString() ?? null,
                              paidFromAccountId: s.paidFromAccountId,
                            }}
                            contractValue={value}
                            vatRate={Number(contract.vatRate)}
                            otherStagesPercentTotal={contract.paymentStages
                              .filter((p) => p.id !== s.id)
                              .reduce((sum, p) => sum + Number(p.percent), 0)}
                            milestones={milestones.map((m) => ({ id: m.id, name: m.name, phaseName: m.phase.name }))}
                            bankAccounts={bankAccounts.map((a) => ({
                              id: a.id, nickname: a.nickname, bankName: a.bankName, accountNumber: a.accountNumber,
                            }))}
                          />
                        </span>
                      </td>
                    </tr>
                    {s.transactions.length > 0 && (
                      <tr className="border-b border-grid last:border-0">
                        <td colSpan={7} className="pb-2 pt-0 pl-2">
                          <PaymentTransactionList
                            transactions={s.transactions.map((t) => ({
                              id: t.id,
                              amount: Number(t.amount),
                              paidDate: t.paidDate.toISOString(),
                              accountNickname: t.paidFromAccount?.nickname ?? null,
                              note: t.note,
                            }))}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Phạt + Giảm trừ */}
      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        <Card title="Điều khoản phạt & vi phạm">
          <div className="flex gap-2 mb-3 flex-wrap">
            <AddPenaltyRuleForm contractId={id} />
            {contract.penaltyRules.length > 0 && (
              <RecordPenaltyEventForm
                contractId={id}
                rules={contract.penaltyRules.map((r) => ({
                  id: r.id,
                  label: `${PENALTY_TYPE[r.type]} — ${Number(r.rate)}${r.basis === "FIXED_PER_DAY" ? "₫" : "%"}${r.basis.includes("PER_DAY") ? "/ngày" : ""}`,
                }))}
              />
            )}
          </div>
          {contract.penaltyRules.length === 0 ? (
            <EmptyState title="Chưa khai báo điều khoản phạt" sub="Nhập theo đúng hợp đồng đã ký" />
          ) : (
            <ul className="text-[13px] space-y-1.5">
              {contract.penaltyRules.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>{PENALTY_TYPE[r.type]}</span>
                  <span className="text-ink-2 money">
                    {r.basis === "FIXED_PER_DAY" ? fmtVND(Number(r.rate)) : `${Number(r.rate)}%`}
                    {r.basis.includes("PER_DAY") && "/ngày"}
                    {r.capPct && ` (trần ${Number(r.capPct)}%)`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {contract.penaltyEvents.length > 0 && (
            <>
              <h3 className="text-[11px] font-semibold uppercase text-muted mt-4 mb-2">Vi phạm đã ghi nhận</h3>
              <ul className="text-[13px] space-y-1.5">
                {contract.penaltyEvents.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span>
                      {PENALTY_TYPE[e.rule.type]}{" "}
                      <span className="text-muted">({fmtDate(e.startDate)}{e.endDate ? ` → ${fmtDate(e.endDate)}` : " → đang chạy"})</span>
                    </span>
                    <span className="font-bold money" style={{ color: "var(--critical)" }}>
                      {fmtVND(Number(e.computedAmount))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Giảm trừ / Khuyến mãi">
          <div className="mb-3">
            <AddDiscountForm
              contractId={id}
              otherContracts={otherContracts.map((c) => ({ id: c.id, label: `${c.code} — ${c.vendor.name}` }))}
            />
          </div>
          {contract.discountsReceived.length === 0 ? (
            <EmptyState title="Không có giảm trừ" />
          ) : (
            <ul className="text-[13px] space-y-2">
              {contract.discountsReceived.map((d) => {
                const conditionMet =
                  !d.conditionContractId ||
                  ["SIGNED", "IN_PROGRESS", "COMPLETED"].includes(d.conditionContract!.status);
                return (
                  <li key={d.id}>
                    <div className="flex justify-between gap-2">
                      <span>{d.description || DISCOUNT_TYPE[d.type]}</span>
                      <span className="font-bold money" style={{ color: "var(--good-text)" }}>
                        {d.percent ? `-${Number(d.percent)}%` : d.amount ? `-${fmtVND(Number(d.amount))}` : ""}
                      </span>
                    </div>
                    {d.conditionContractId && (
                      <div className="text-xs text-muted">
                        Điều kiện: ký {d.conditionContract!.code} —{" "}
                        {conditionMet ? "✅ đã thỏa, đang hiệu lực" : "⏳ chưa thỏa"}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Phát sinh */}
      <Card title={`Phát sinh — Variations (${contract.variations.length})`}>
        <div className="mb-3"><CreateVariationForm contractId={id} /></div>
        {contract.variations.length === 0 ? (
          <EmptyState title="Chưa có phát sinh nào" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Mã</th>
                <th className="py-1 pr-2 font-semibold">Nội dung</th>
                <th className="py-1 pr-2 font-semibold">Lý do</th>
                <th className="py-1 pr-2 font-semibold text-right">Chi phí ±</th>
                <th className="py-1 pr-2 font-semibold">Gia hạn</th>
                <th className="py-1 pr-2 font-semibold">Trạng thái</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {contract.variations.map((v) => (
                <tr key={v.id} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2 font-semibold">{v.code}</td>
                  <td className="py-2 pr-2">{v.title}</td>
                  <td className="py-2 pr-2 text-ink-2">{VARIATION_REASON[v.reason]}</td>
                  <td className="py-2 pr-2 text-right money font-bold" style={{ color: Number(v.costDelta) >= 0 ? undefined : "var(--good-text)" }}>
                    {Number(v.costDelta) >= 0 ? "+" : ""}{fmtVND(Number(v.costDelta))}
                  </td>
                  <td className="py-2 pr-2">{v.timeExtensionDays > 0 ? `+${v.timeExtensionDays} ngày` : "—"}</td>
                  <td className="py-2 pr-2"><Tag sev={VAR_SEV[v.status]}>{VARIATION_STATUS[v.status]}</Tag></td>
                  <td className="py-2 text-right">
                    {v.status === "SUBMITTED" && <VariationDecision variationId={v.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-muted">{l}</span>
      <span>{fmtVND(v)}</span>
    </div>
  );
}

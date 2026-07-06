/**
 * API cốt lõi: GET /api/projects/:id/dashboard/disbursement
 *
 * Trả về:
 *  1. Tổng % hoàn thành dự án (bình quân gia quyền theo weight của Phase)
 *  2. Với mỗi hợp đồng đang chạy: đợt thanh toán kế tiếp + SỐ TIỀN THỰC GIẢI NGÂN
 *     sau khi cộng/trừ đầy đủ business rules:
 *       + Phát sinh (Variation) đã duyệt   -> cộng vào đợt cuối
 *       - Giảm trừ có điều kiện (Discount) -> chỉ áp khi HĐ điều kiện đã ký
 *       - Phạt trễ tiến độ 0.05%/ngày (trừ ngày gia hạn hợp lệ: mưa bão,
 *         phát sinh được duyệt, ngày chờ việc do lỗi CĐT), trần 8%
 *       + Phạt chờ việc CĐT phải trả (vd 4tr/ngày)   -> cộng vào số phải trả
 *       - Giữ lại retention (% bảo hành) ở các đợt giữa, hoàn ở đợt cuối
 */

import { Prisma, MilestoneStatus, PaymentStageStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

const MS_PER_DAY = 86_400_000;
const daysBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY));

// ---------------------------------------------------------------------------
// 1. TỔNG % HOÀN THÀNH DỰ ÁN
//    progress = Σ(phase.weight × phase.progressPct) / Σ(phase.weight)
// ---------------------------------------------------------------------------
export async function getProjectProgress(projectId: string): Promise<number> {
  const phases = await prisma.phase.findMany({ where: { projectId } });
  if (phases.length === 0) return 0;

  let weighted = new D(0);
  let totalWeight = new D(0);
  for (const p of phases) {
    weighted = weighted.add(new D(p.weight).mul(p.progressPct));
    totalWeight = totalWeight.add(p.weight);
  }
  return totalWeight.isZero() ? 0 : weighted.div(totalWeight).toDecimalPlaces(1).toNumber();
}

// ---------------------------------------------------------------------------
// 2. SỐ NGÀY GIA HẠN HỢP LỆ của 1 hợp đồng
//    = ngày mưa bão (DailyLog.isForceMajeure)
//    + gia hạn từ phát sinh đã duyệt (Variation.timeExtensionDays)
//    + ngày chờ việc do lỗi CĐT (IdleWaitLog)
// ---------------------------------------------------------------------------
async function getValidExtensionDays(contract: {
  id: string; projectId: string; startDate: Date | null;
}): Promise<number> {
  const [forceMajeureDays, variations, idleLogs] = await Promise.all([
    prisma.dailyLog.count({
      where: {
        projectId: contract.projectId,
        isForceMajeure: true,
        ...(contract.startDate && { logDate: { gte: contract.startDate } }),
      },
    }),
    prisma.variation.aggregate({
      where: { contractId: contract.id, status: "APPROVED" },
      _sum: { timeExtensionDays: true },
    }),
    prisma.idleWaitLog.findMany({ where: { contractId: contract.id } }),
  ]);

  const idleDays = idleLogs.reduce(
    (sum, log) => sum + daysBetween(log.startDate, log.endDate ?? new Date()),
    0,
  );
  return forceMajeureDays + (variations._sum.timeExtensionDays ?? 0) + idleDays;
}

// ---------------------------------------------------------------------------
// 3. PHẠT TRỄ TIẾN ĐỘ (nhà thầu) — 0.05%/ngày × giá trị HĐ, trần capPct (8%)
//    Ngày trễ = (hôm nay − plannedEndDate) − ngày gia hạn hợp lệ
// ---------------------------------------------------------------------------
async function computeLateProgressPenalty(contract: {
  id: string; projectId: string; contractValue: Decimal;
  startDate: Date | null; plannedEndDate: Date | null; actualEndDate: Date | null;
}): Promise<{ lateDays: number; amount: Decimal }> {
  if (!contract.plannedEndDate) return { lateDays: 0, amount: new D(0) };

  const rule = await prisma.penaltyRule.findFirst({
    where: { contractId: contract.id, type: "CONTRACTOR_LATE_PROGRESS" },
  });
  if (!rule) return { lateDays: 0, amount: new D(0) };

  const asOf = contract.actualEndDate ?? new Date();
  const rawLateDays = daysBetween(contract.plannedEndDate, asOf);
  const extensionDays = await getValidExtensionDays(contract);
  const lateDays = Math.max(0, rawLateDays - extensionDays - rule.graceDays);
  if (lateDays === 0) return { lateDays: 0, amount: new D(0) };

  // 0.05%/ngày: rate=0.05 (đơn vị %)
  let penalty = new D(contract.contractValue).mul(rule.rate).div(100).mul(lateDays);

  // Trần phạt (Điều 301 Luật Thương mại: tối đa 8% phần nghĩa vụ vi phạm)
  if (rule.capPct) {
    const cap = new D(contract.contractValue).mul(rule.capPct).div(100);
    if (penalty.gt(cap)) penalty = cap;
  }
  return { lateDays, amount: penalty.toDecimalPlaces(0) };
}

// ---------------------------------------------------------------------------
// 4. PHẠT CHỜ VIỆC CĐT PHẢI TRẢ (vd: 4tr/ngày dàn máy ép cọc đứng chờ)
// ---------------------------------------------------------------------------
async function computeIdleWaitPenalty(contractId: string): Promise<Decimal> {
  const logs = await prisma.idleWaitLog.findMany({ where: { contractId } });
  return logs.reduce(
    (sum, log) =>
      sum.add(new D(log.dailyPenalty).mul(daysBetween(log.startDate, log.endDate ?? new Date()))),
    new D(0),
  );
}

// ---------------------------------------------------------------------------
// 5. ĐỢT GIẢI NGÂN KẾ TIẾP CỦA 1 HỢP ĐỒNG
// ---------------------------------------------------------------------------
export interface NextDisbursement {
  contractId: string;
  contractCode: string;
  vendorName: string;
  stageNo: number;
  stageName: string;
  /** Milestone kích hoạt đã được nghiệm thu chưa (hold point cleared) */
  isReadyToPay: boolean;
  blockedReason?: string;
  dueDate?: Date;
  breakdown: {
    baseAmount: string;           // % đợt × giá trị HĐ
    vat: string;
    approvedVariations: string;   // chỉ cộng ở đợt cuối
    discounts: string;            // giảm trừ đang hiệu lực
    retentionHeld: string;        // giữ lại bảo hành (âm ở đợt giữa, hoàn ở đợt cuối)
    lateProgressPenalty: string;  // trừ vào tiền trả thầu
    idleWaitPenalty: string;      // CĐT phải trả thêm cho thầu
    alreadyPaid: string;          // đã trả một phần (PARTIAL) — trừ vào số còn cần chuẩn bị
  };
  netPayable: string; // SỐ TIỀN CĐT CẦN CHUẨN BỊ
}

export async function getNextDisbursement(contractId: string): Promise<NextDisbursement | null> {
  const contract = await prisma.contract.findUniqueOrThrow({
    where: { id: contractId },
    include: {
      vendor: true,
      paymentStages: { orderBy: { stageNo: "asc" }, include: { triggerMilestone: true } },
      discountsReceived: { include: { conditionContract: true } },
    },
  });

  const nextStage = contract.paymentStages.find((s) => s.status !== PaymentStageStatus.PAID);
  if (!nextStage) return null; // đã thanh toán hết

  // --- HOLD POINT: milestone kích hoạt phải APPROVED / AUTO_APPROVED ---
  let isReadyToPay = true;
  let blockedReason: string | undefined;
  const ms = nextStage.triggerMilestone;
  if (ms && ms.status !== MilestoneStatus.APPROVED && ms.status !== MilestoneStatus.AUTO_APPROVED) {
    isReadyToPay = false;
    blockedReason =
      ms.status === MilestoneStatus.AWAITING_INSPECTION
        ? `Chờ CĐT nghiệm thu "${ms.name}" (hạn ${ms.confirmDeadlineHrs}h)`
        : ms.status === MilestoneStatus.REJECTED
          ? `Nghiệm thu "${ms.name}" KHÔNG ĐẠT — thầu đang khắc phục`
          : `Chưa tới milestone "${ms.name}"`;
  }

  const contractValue = new D(contract.contractValue);

  // (a) Tiền gốc của đợt = % × giá trị HĐ
  const baseAmount = contractValue.mul(nextStage.percent).div(100);
  const vat = baseAmount.mul(contract.vatRate).div(100);

  // (b) Phát sinh đã duyệt — quyết toán ở đợt cuối
  let approvedVariations = new D(0);
  if (nextStage.isFinal) {
    const agg = await prisma.variation.aggregate({
      where: { contractId, status: "APPROVED" },
      _sum: { costDelta: true },
    });
    approvedVariations = new D(agg._sum.costDelta ?? 0);
  }

  // (c) Giảm trừ có điều kiện: chỉ hiệu lực khi HĐ điều kiện đã ký
  //     (vd: miễn 100% phí thiết kế vì đã ký HĐ thi công)
  let discounts = new D(0);
  for (const dc of contract.discountsReceived) {
    const conditionMet =
      !dc.conditionContractId ||
      ["SIGNED", "IN_PROGRESS", "COMPLETED"].includes(dc.conditionContract!.status);
    if (!conditionMet) continue;
    discounts = discounts.add(
      dc.amount ?? contractValue.mul(dc.percent ?? 0).div(100).mul(nextStage.percent).div(100),
    );
  }

  // (d) Retention: giữ % bảo hành ở đợt giữa, hoàn toàn bộ ở đợt cuối
  const retentionHeld = nextStage.isFinal
    ? contractValue.mul(contract.retentionPct).div(100).neg() // hoàn lại (cộng cho thầu)
    : baseAmount.mul(contract.retentionPct).div(100);          // giữ lại (trừ đi)

  // (e) Phạt trễ tiến độ — khấu trừ vào đợt thanh toán
  const latePenalty = await computeLateProgressPenalty(contract);

  // (f) Phạt chờ việc — CĐT trả thêm cho thầu
  const idlePenalty = await computeIdleWaitPenalty(contractId);

  // (g) Đã trả một phần (PARTIAL) — trừ vào số còn cần chuẩn bị
  const alreadyPaid = nextStage.status === "PARTIAL" ? new D(nextStage.paidAmount ?? 0) : new D(0);

  const netPayable = baseAmount
    .add(vat)
    .add(approvedVariations)
    .sub(discounts)
    .sub(retentionHeld)
    .sub(latePenalty.amount)
    .add(idlePenalty)
    .sub(alreadyPaid)
    .toDecimalPlaces(0);

  return {
    contractId,
    contractCode: contract.code,
    vendorName: contract.vendor.name,
    stageNo: nextStage.stageNo,
    stageName: nextStage.name,
    isReadyToPay,
    blockedReason,
    dueDate: nextStage.dueDate ?? undefined,
    breakdown: {
      baseAmount: baseAmount.toFixed(0),
      vat: vat.toFixed(0),
      approvedVariations: approvedVariations.toFixed(0),
      discounts: discounts.toFixed(0),
      retentionHeld: retentionHeld.toFixed(0),
      lateProgressPenalty: latePenalty.amount.neg().toFixed(0),
      idleWaitPenalty: idlePenalty.toFixed(0),
      alreadyPaid: alreadyPaid.neg().toFixed(0),
    },
    netPayable: netPayable.toFixed(0),
  };
}

// ---------------------------------------------------------------------------
// 6. ENDPOINT TỔNG HỢP CHO DASHBOARD (Express/NestJS handler)
// ---------------------------------------------------------------------------
export async function getDashboardDisbursement(projectId: string) {
  const [progressPct, contracts] = await Promise.all([
    getProjectProgress(projectId),
    prisma.contract.findMany({
      where: { projectId, status: { in: ["SIGNED", "IN_PROGRESS"] } },
      select: { id: true },
    }),
  ]);

  const disbursements = (
    await Promise.all(contracts.map((c) => getNextDisbursement(c.id)))
  ).filter((d): d is NextDisbursement => d !== null);

  // Tổng tiền CĐT cần chuẩn bị cho các đợt đã sẵn sàng giải ngân
  const totalReadyToPay = disbursements
    .filter((d) => d.isReadyToPay)
    .reduce((sum, d) => sum.add(d.netPayable), new D(0));

  return {
    projectId,
    overallProgressPct: progressPct,
    nextDisbursements: disbursements,
    totalReadyToPay: totalReadyToPay.toFixed(0),
    asOf: new Date().toISOString(),
  };
}

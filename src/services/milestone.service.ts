/**
 * Nghiệp vụ Hold Point (Điểm dừng nghiệm thu):
 * - Thầu yêu cầu nghiệm thu -> đồng hồ confirmDeadlineHrs (mặc định 48h) bắt đầu chạy
 * - CĐT nghiệm thu PASS -> APPROVED -> kích hoạt các đợt thanh toán gắn milestone
 * - Quá hạn không phản hồi -> AUTO_APPROVED (điều khoản HĐ) -> vẫn kích hoạt thanh toán
 * - FAIL -> REJECTED, thầu khắc phục rồi yêu cầu lại
 */
import { prisma } from "@/lib/prisma";
import {
  MilestoneStatus,
  PaymentStageStatus,
  type InspectionMethod,
  type InspectionResult,
  type Prisma,
} from "@prisma/client";

const HOUR = 3_600_000;

/** Thầu/CĐT bấm "Yêu cầu nghiệm thu" */
export async function requestInspection(milestoneId: string) {
  return prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: MilestoneStatus.AWAITING_INSPECTION, requestedAt: new Date() },
  });
}

/** Kích hoạt các đợt thanh toán do milestone này làm trigger */
async function activatePaymentStages(
  tx: Prisma.TransactionClient,
  milestoneId: string,
) {
  const stages = await tx.paymentStage.findMany({
    where: { triggerMilestoneId: milestoneId, status: PaymentStageStatus.UPCOMING },
  });
  for (const s of stages) {
    await tx.paymentStage.update({
      where: { id: s.id },
      data: {
        status: PaymentStageStatus.DUE,
        dueDate: new Date(Date.now() + s.dueDaysAfterTrigger * 24 * HOUR),
      },
    });
  }
}

/** CĐT nghiệm thu (App/Zalo/biên bản giấy) */
export async function recordInspection(input: {
  milestoneId: string;
  method: InspectionMethod;
  result: InspectionResult;
  notes?: string;
}) {
  const pass = input.result === "PASS" || input.result === "PASS_WITH_NOTES";
  return prisma.$transaction(async (tx) => {
    await tx.inspectionRecord.create({
      data: {
        milestoneId: input.milestoneId,
        method: input.method,
        result: input.result,
        notes: input.notes,
      },
    });
    const milestone = await tx.milestone.update({
      where: { id: input.milestoneId },
      data: { status: pass ? MilestoneStatus.APPROVED : MilestoneStatus.REJECTED },
    });
    if (pass) await activatePaymentStages(tx, input.milestoneId);
    return milestone;
  });
}

/**
 * Compute-on-read: quá hạn xác nhận -> AUTO_APPROVED + kích hoạt thanh toán.
 * Gọi ở đầu dashboard / trang tiến độ.
 */
export async function resolveExpiredHoldPoints(projectId: string) {
  const waiting = await prisma.milestone.findMany({
    where: {
      status: MilestoneStatus.AWAITING_INSPECTION,
      requestedAt: { not: null },
      phase: { projectId },
    },
  });
  const now = Date.now();
  let resolved = 0;
  for (const m of waiting) {
    if (now - m.requestedAt!.getTime() > m.confirmDeadlineHrs * HOUR) {
      await prisma.$transaction(async (tx) => {
        await tx.milestone.update({
          where: { id: m.id },
          data: { status: MilestoneStatus.AUTO_APPROVED },
        });
        await activatePaymentStages(tx, m.id);
      });
      resolved++;
    }
  }
  return resolved;
}

/** Compute-on-read: đợt DUE quá hạn -> OVERDUE (bắt đầu tính phạt CĐT chậm thanh toán) */
export async function refreshOverduePayments(projectId: string) {
  await prisma.paymentStage.updateMany({
    where: {
      contract: { projectId },
      status: PaymentStageStatus.DUE,
      dueDate: { lt: new Date() },
    },
    data: { status: PaymentStageStatus.OVERDUE },
  });
}

/**
 * Compute-on-read: đợt vẫn UPCOMING nhưng milestone trigger đã APPROVED/AUTO_APPROVED
 * (thường do đợt được thêm SAU khi milestone đã nghiệm thu xong) -> kích hoạt ngay.
 * Chạy ở đầu dashboard và trang chi tiết hợp đồng.
 */
export async function syncStagesWithApprovedMilestones(projectId: string) {
  const stuck = await prisma.paymentStage.findMany({
    where: {
      contract: { projectId },
      status: PaymentStageStatus.UPCOMING,
      triggerMilestone: { status: { in: [MilestoneStatus.APPROVED, MilestoneStatus.AUTO_APPROVED] } },
    },
  });
  for (const s of stuck) {
    await prisma.paymentStage.update({
      where: { id: s.id },
      data: {
        status: PaymentStageStatus.DUE,
        dueDate: new Date(Date.now() + s.dueDaysAfterTrigger * 24 * HOUR),
      },
    });
  }
  return stuck.length;
}

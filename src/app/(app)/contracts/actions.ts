"use server";

/* Server Actions — Module 1: Hợp đồng & Nhà thầu */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computeStageGrossAmount } from "@/lib/payment-calc";
import { logAudit } from "@/lib/audit";
import type {
  VendorType, ContractStatus, PenaltyType, PenaltyBasis,
  DiscountType, VariationReason, PaymentStageStatus,
} from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[.,\s]/g, "");
  return v === "" ? null : Number(v);
};
const dateOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v ? new Date(v) : null;
};

export async function createProject(fd: FormData) {
  const user = await requireUser();
  // User bảng app: đồng bộ theo email đăng nhập
  const appUser = await prisma.user.upsert({
    where: { email: user.email! },
    create: { email: user.email!, fullName: user.email!.split("@")[0], role: "OWNER" },
    update: {},
  });
  await prisma.project.create({
    data: {
      ownerId: appUser.id,
      name: str(fd, "name"),
      address: str(fd, "address"),
      budgetPlanned: numOrNull(fd, "budgetPlanned") ?? 0,
      landArea: numOrNull(fd, "landArea"),
      grossFloorArea: numOrNull(fd, "grossFloorArea"),
    },
  });
  revalidatePath("/");
  revalidatePath("/contracts");
}

export async function createVendor(projectId: string, fd: FormData) {
  await requireUser();
  await prisma.vendor.create({
    data: {
      projectId,
      type: str(fd, "type") as VendorType,
      name: str(fd, "name"),
      taxCode: str(fd, "taxCode") || null,
      address: str(fd, "address") || null,
      contactName: str(fd, "contactName") || null,
      phone: str(fd, "phone") || null,
      bankName: str(fd, "bankName") || null,
      bankAccountNumber: str(fd, "bankAccountNumber") || null,
      bankAccountHolder: str(fd, "bankAccountHolder") || null,
    },
  });
  revalidatePath("/contracts");
}

export async function updateVendor(vendorId: string, fd: FormData) {
  await requireUser();
  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      type: str(fd, "type") as VendorType,
      name: str(fd, "name"),
      taxCode: str(fd, "taxCode") || null,
      address: str(fd, "address") || null,
      contactName: str(fd, "contactName") || null,
      phone: str(fd, "phone") || null,
      bankName: str(fd, "bankName") || null,
      bankAccountNumber: str(fd, "bankAccountNumber") || null,
      bankAccountHolder: str(fd, "bankAccountHolder") || null,
    },
  });
  revalidatePath("/contracts");
}

export async function deleteVendor(vendorId: string) {
  await requireUser();
  const contractCount = await prisma.contract.count({ where: { vendorId } });
  if (contractCount > 0) {
    throw new Error(
      `Không thể xóa — nhà thầu này đang có ${contractCount} hợp đồng. Xóa hợp đồng liên quan trước.`,
    );
  }
  await prisma.vendor.delete({ where: { id: vendorId } });
  revalidatePath("/contracts");
}

export async function createContract(projectId: string, fd: FormData) {
  const user = await requireUser();
  const contract = await prisma.contract.create({
    data: {
      projectId,
      vendorId: str(fd, "vendorId"),
      code: str(fd, "code"),
      title: str(fd, "title"),
      contractValue: numOrNull(fd, "contractValue") ?? 0,
      vatRate: Number(str(fd, "vatRate") || 8),
      retentionPct: Number(str(fd, "retentionPct") || 5),
      signedDate: dateOrNull(fd, "signedDate"),
      startDate: dateOrNull(fd, "startDate"),
      plannedEndDate: dateOrNull(fd, "plannedEndDate"),
      status: (str(fd, "status") || "SIGNED") as ContractStatus,
    },
  });
  await logAudit({
    projectId,
    actorEmail: user.email,
    action: "CONTRACT_CREATED",
    entityType: "Contract",
    entityId: contract.id,
    summary: `Tạo hợp đồng ${contract.code} — ${contract.title}`,
  });
  revalidatePath("/contracts");
}

export async function updateContract(contractId: string, fd: FormData) {
  await requireUser();
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      vendorId: str(fd, "vendorId"),
      code: str(fd, "code"),
      title: str(fd, "title"),
      contractValue: numOrNull(fd, "contractValue") ?? 0,
      vatRate: Number(str(fd, "vatRate") || 8),
      retentionPct: Number(str(fd, "retentionPct") || 5),
      signedDate: dateOrNull(fd, "signedDate"),
      startDate: dateOrNull(fd, "startDate"),
      plannedEndDate: dateOrNull(fd, "plannedEndDate"),
      status: str(fd, "status") as ContractStatus,
    },
  });
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
  revalidatePath("/");
}

export async function deleteContract(contractId: string) {
  const user = await requireUser();
  const paidCount = await prisma.paymentStage.count({ where: { contractId, status: "PAID" } });
  if (paidCount > 0) {
    throw new Error(
      `Không thể xóa — hợp đồng đã có ${paidCount} đợt thanh toán đã trả. Việc xóa sẽ làm mất lịch sử tài chính.`,
    );
  }
  const contract = await prisma.contract.findUniqueOrThrow({ where: { id: contractId } });
  await prisma.$transaction([
    prisma.document.updateMany({ where: { contractId }, data: { contractId: null } }),
    prisma.paymentStage.deleteMany({ where: { contractId } }),
    prisma.penaltyEvent.deleteMany({ where: { contractId } }),
    prisma.penaltyRule.deleteMany({ where: { contractId } }),
    prisma.discount.deleteMany({ where: { contractId } }),
    prisma.variation.deleteMany({ where: { contractId } }),
    prisma.idleWaitLog.deleteMany({ where: { contractId } }),
    prisma.contract.delete({ where: { id: contractId } }),
  ]);
  await logAudit({
    projectId: contract.projectId,
    actorEmail: user.email,
    action: "CONTRACT_DELETED",
    entityType: "Contract",
    entityId: contractId,
    summary: `Xóa hợp đồng ${contract.code} — ${contract.title}`,
  });
  revalidatePath("/contracts");
  revalidatePath("/");
}

export async function addPaymentStage(contractId: string, fd: FormData) {
  await requireUser();
  const triggerMilestoneId = str(fd, "triggerMilestoneId") || null;
  const dueDaysAfterTrigger = Number(str(fd, "dueDaysAfterTrigger") || 3);

  // Không có milestone -> tới hạn ngay. Có milestone nhưng ĐÃ nghiệm thu từ trước
  // (đợt được thêm sau khi duyệt) -> cũng tới hạn ngay, tránh kẹt ở "Chưa tới" vĩnh viễn.
  let activation: { status: "DUE"; dueDate: Date } | Record<string, never> = {};
  if (!triggerMilestoneId) {
    activation = { status: "DUE", dueDate: new Date(Date.now() + 3 * 86_400_000) };
  } else {
    const milestone = await prisma.milestone.findUnique({ where: { id: triggerMilestoneId } });
    if (milestone && (milestone.status === "APPROVED" || milestone.status === "AUTO_APPROVED")) {
      activation = { status: "DUE", dueDate: new Date(Date.now() + dueDaysAfterTrigger * 86_400_000) };
    }
  }

  await prisma.paymentStage.create({
    data: {
      contractId,
      stageNo: Number(str(fd, "stageNo")),
      name: str(fd, "name"),
      percent: Number(str(fd, "percent")),
      triggerMilestoneId,
      dueDaysAfterTrigger,
      isFinal: fd.get("isFinal") === "on",
      ...activation,
    },
  });
  revalidatePath(`/contracts/${contractId}`);
}

export async function updatePaymentStage(stageId: string, fd: FormData) {
  await requireUser();
  const status = str(fd, "status") as PaymentStageStatus | "";

  await prisma.paymentStage.update({
    where: { id: stageId },
    data: {
      stageNo: Number(str(fd, "stageNo")),
      name: str(fd, "name"),
      percent: Number(str(fd, "percent")),
      triggerMilestoneId: str(fd, "triggerMilestoneId") || null,
      dueDaysAfterTrigger: Number(str(fd, "dueDaysAfterTrigger") || 3),
      // "Chưa tới" không có hạn (tránh mâu thuẫn trạng thái/hạn); DUE/OVERDUE/PARTIAL/PAID lấy ngày người dùng nhập
      dueDate: status === "UPCOMING" ? null : dateOrNull(fd, "dueDate"),
      isFinal: fd.get("isFinal") === "on",
      ...(status ? { status } : {}),
    },
  });

  // Đổi trạng thái thanh toán qua form Sửa -> thay lịch sử giao dịch bằng 1 mục điều chỉnh
  // (nguồn dữ liệu chính là "+ Trả thêm"; sửa ở đây coi như ghi đè lại toàn bộ cho khớp trạng thái mới chọn)
  if (status === "PAID" || status === "PARTIAL") {
    await prisma.paymentTransaction.deleteMany({ where: { paymentStageId: stageId } });
    await prisma.paymentTransaction.create({
      data: {
        paymentStageId: stageId,
        amount: numOrNull(fd, "paidAmount") ?? 0,
        paidDate: dateOrNull(fd, "paidDate") ?? new Date(),
        paidFromAccountId: str(fd, "paidFromAccountId") || null,
        note: "Điều chỉnh qua Sửa đợt",
      },
    });
    await recomputeStageAggregate(stageId);
  } else if (status) {
    await prisma.paymentTransaction.deleteMany({ where: { paymentStageId: stageId } });
    await prisma.paymentStage.update({
      where: { id: stageId },
      data: { paidAmount: null, paidDate: null, paidFromAccountId: null },
    });
  }

  const stage = await prisma.paymentStage.findUniqueOrThrow({ where: { id: stageId } });
  revalidatePath(`/contracts/${stage.contractId}`);
  revalidatePath("/cashflow");
  revalidatePath("/accounts");
  revalidatePath("/");
}

/** Xóa đợt thanh toán — kể cả đợt đã trả (CĐT chủ động xóa nhầm/nhập lại), có xác nhận phía client */
export async function deletePaymentStage(stageId: string) {
  await requireUser();
  const stage = await prisma.paymentStage.findUniqueOrThrow({ where: { id: stageId } });
  await prisma.paymentStage.delete({ where: { id: stageId } });
  revalidatePath(`/contracts/${stage.contractId}`);
  revalidatePath("/cashflow");
  revalidatePath("/accounts");
  revalidatePath("/");
}

/** Tính lại paidAmount/paidDate/paidFromAccountId (cache) + trạng thái từ danh sách giao dịch thật */
async function recomputeStageAggregate(stageId: string) {
  const stage = await prisma.paymentStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { contract: true, transactions: { orderBy: { paidDate: "desc" } } },
  });
  const total = stage.transactions.reduce((s, t) => s + Number(t.amount), 0);
  const grossOwed = computeStageGrossAmount({
    contractValue: Number(stage.contract.contractValue),
    vatRate: Number(stage.contract.vatRate),
    retentionPct: Number(stage.contract.retentionPct),
    percent: Number(stage.percent),
    isFinal: stage.isFinal,
  });
  const latest = stage.transactions[0];

  let status = stage.status;
  if (stage.status !== "UPCOMING") {
    if (total <= 0) status = stage.dueDate && stage.dueDate < new Date() ? "OVERDUE" : "DUE";
    else if (total >= grossOwed - 1) status = "PAID";
    else status = "PARTIAL";
  }

  await prisma.paymentStage.update({
    where: { id: stageId },
    data: {
      paidAmount: total > 0 ? total : null,
      paidDate: latest?.paidDate ?? null,
      paidFromAccountId: latest?.paidFromAccountId ?? null,
      status,
    },
  });
}

/** Ghi nhận 1 lần chuyển tiền cho 1 đợt — hỗ trợ trả nhiều lần cho cùng 1 đợt */
export async function addPaymentTransaction(stageId: string, fd: FormData) {
  const user = await requireUser();
  const amount = numOrNull(fd, "amount") ?? 0;
  await prisma.paymentTransaction.create({
    data: {
      paymentStageId: stageId,
      amount,
      paidDate: dateOrNull(fd, "paidDate") ?? new Date(),
      paidFromAccountId: str(fd, "paidFromAccountId") || null,
      note: str(fd, "note") || null,
    },
  });
  await recomputeStageAggregate(stageId);
  const stage = await prisma.paymentStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { contract: { include: { vendor: true } } },
  });
  await logAudit({
    projectId: stage.contract.projectId,
    actorEmail: user.email,
    action: "PAYMENT_RECORDED",
    entityType: "PaymentStage",
    entityId: stageId,
    summary: `Ghi nhận trả ${amount.toLocaleString("vi-VN")}₫ cho đợt ${stage.stageNo} — ${stage.contract.vendor.name}`,
  });
  revalidatePath(`/contracts/${stage.contractId}`);
  revalidatePath("/cashflow");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function deletePaymentTransaction(transactionId: string) {
  await requireUser();
  const tx = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
  await prisma.paymentTransaction.delete({ where: { id: transactionId } });
  await recomputeStageAggregate(tx.paymentStageId);
  const stage = await prisma.paymentStage.findUniqueOrThrow({ where: { id: tx.paymentStageId } });
  revalidatePath(`/contracts/${stage.contractId}`);
  revalidatePath("/cashflow");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function addPenaltyRule(contractId: string, fd: FormData) {
  await requireUser();
  await prisma.penaltyRule.create({
    data: {
      contractId,
      type: str(fd, "type") as PenaltyType,
      basis: str(fd, "basis") as PenaltyBasis,
      rate: Number(str(fd, "rate")),
      capPct: str(fd, "capPct") ? Number(str(fd, "capPct")) : null,
      graceDays: Number(str(fd, "graceDays") || 0),
    },
  });
  revalidatePath(`/contracts/${contractId}`);
}

export async function recordPenaltyEvent(contractId: string, fd: FormData) {
  await requireUser();
  const rule = await prisma.penaltyRule.findUniqueOrThrow({
    where: { id: str(fd, "ruleId") },
    include: { contract: true },
  });
  const startDate = dateOrNull(fd, "startDate") ?? new Date();
  const endDate = dateOrNull(fd, "endDate");
  const baseAmount = numOrNull(fd, "baseAmount");

  // Tính computedAmount theo basis (sự kiện theo ngày còn chạy -> cập nhật khi kết thúc)
  let computed = 0;
  const days = endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000))
    : 0;
  const contractValue = Number(rule.contract.contractValue);
  switch (rule.basis) {
    case "PCT_OF_CONTRACT":
      computed = (contractValue * Number(rule.rate)) / 100;
      break;
    case "PCT_OF_ITEM_VALUE":
      computed = ((baseAmount ?? 0) * Number(rule.rate)) / 100;
      break;
    case "PCT_OF_CONTRACT_PER_DAY":
      computed = (contractValue * Number(rule.rate) * days) / 100;
      break;
    case "FIXED_PER_DAY":
      computed = Number(rule.rate) * days;
      break;
  }
  if (rule.capPct) computed = Math.min(computed, (contractValue * Number(rule.capPct)) / 100);

  await prisma.penaltyEvent.create({
    data: {
      contractId,
      ruleId: rule.id,
      startDate,
      endDate,
      baseAmount,
      computedAmount: Math.round(computed),
      status: endDate ? "SETTLED" : "RUNNING",
      note: str(fd, "note") || null,
    },
  });
  revalidatePath(`/contracts/${contractId}`);
}

export async function addDiscount(contractId: string, fd: FormData) {
  await requireUser();
  await prisma.discount.create({
    data: {
      contractId,
      type: str(fd, "type") as DiscountType,
      percent: str(fd, "percent") ? Number(str(fd, "percent")) : null,
      amount: numOrNull(fd, "amount"),
      conditionContractId: str(fd, "conditionContractId") || null,
      description: str(fd, "description") || null,
    },
  });
  revalidatePath(`/contracts/${contractId}`);
}

export async function createVariation(contractId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.variation.count({ where: { contractId } });
  await prisma.variation.create({
    data: {
      contractId,
      code: str(fd, "code") || `VO-${String(count + 1).padStart(3, "0")}`,
      title: str(fd, "title"),
      reason: str(fd, "reason") as VariationReason,
      costDelta: numOrNull(fd, "costDelta") ?? 0,
      timeExtensionDays: Number(str(fd, "timeExtensionDays") || 0),
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/");
}

export async function decideVariation(variationId: string, approve: boolean) {
  const user = await requireUser();
  const v = await prisma.variation.update({
    where: { id: variationId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      approvedAt: approve ? new Date() : null,
    },
    include: { contract: { select: { projectId: true, vendor: { select: { name: true } } } } },
  });
  await logAudit({
    projectId: v.contract.projectId,
    actorEmail: user.email,
    action: approve ? "VARIATION_APPROVED" : "VARIATION_REJECTED",
    entityType: "Variation",
    entityId: v.id,
    summary: `${approve ? "Duyệt" : "Từ chối"} phát sinh ${v.code} — ${v.title} (${v.contract.vendor.name})`,
  });
  revalidatePath(`/contracts/${v.contractId}`);
  revalidatePath("/");
}

export async function updateContractStatus(contractId: string, status: ContractStatus) {
  await requireUser();
  await prisma.contract.update({ where: { id: contractId }, data: { status } });
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
}

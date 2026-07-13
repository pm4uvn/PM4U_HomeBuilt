/**
 * Hệ thống cảnh báo — compute-on-read, idempotent:
 * mỗi lần gọi computeAlerts() xóa alert cũ của dự án rồi sinh lại từ trạng thái hiện tại.
 */
import { prisma } from "@/lib/prisma";
import { daysBetween } from "@/lib/format";
import { computeStageGrossAmount } from "@/lib/payment-calc";
import { computePreConstructionRiskAlerts } from "./preconstruction.service";
import type { AlertType, RiskSeverity } from "@prisma/client";

const CONTRACT_DEADLINE_WARN_DAYS = 14;

const HOUR = 3_600_000;

interface NewAlert {
  type: AlertType;
  severity: RiskSeverity;
  title: string;
  message: string;
  dueAt?: Date;
  refTable?: string;
  refId?: string;
}

export async function computeAlerts(projectId: string) {
  const alerts: NewAlert[] = [];
  const now = new Date();

  const [stages, milestones, idleLogs, pilingRecords, project, purchases, undergroundRisks, nearDeadlineContracts, preconAlerts] =
    await Promise.all([
      prisma.paymentStage.findMany({
        where: { contract: { projectId }, status: { in: ["DUE", "OVERDUE", "PARTIAL"] } },
        include: { contract: { include: { vendor: true, penaltyRules: true } } },
      }),
      prisma.milestone.findMany({
        where: { phase: { projectId }, status: "AWAITING_INSPECTION", requestedAt: { not: null } },
      }),
      prisma.idleWaitLog.findMany({
        where: { contract: { projectId }, endDate: null },
        include: { contract: { include: { vendor: true } } },
      }),
      prisma.pilingRecord.findMany({ where: { projectId }, include: { piles: true } }),
      prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      prisma.paymentStage.aggregate({
        where: { contract: { projectId }, status: { in: ["PAID", "PARTIAL"] } },
        _sum: { paidAmount: true },
      }),
      prisma.riskLog.findMany({
        where: { projectId, category: "UNDERGROUND_OBSTACLE", status: { in: ["OPEN", "MONITORING"] } },
      }),
      prisma.contract.findMany({
        where: { projectId, status: { in: ["SIGNED", "IN_PROGRESS"] }, plannedEndDate: { not: null }, actualEndDate: null },
        include: { vendor: true },
      }),
      computePreConstructionRiskAlerts(projectId),
    ]);

  // 1. Thanh toán tới hạn / quá hạn / đã trả một phần
  for (const s of stages) {
    const gross = computeStageGrossAmount({
      contractValue: Number(s.contract.contractValue),
      vatRate: Number(s.contract.vatRate),
      retentionPct: Number(s.contract.retentionPct),
      percent: Number(s.percent),
      isFinal: s.isFinal,
    });
    const remaining = gross - (s.status === "PARTIAL" ? Number(s.paidAmount ?? 0) : 0);
    const lateRule = s.contract.penaltyRules.find((r) => r.type === "OWNER_LATE_PAYMENT");
    if (s.status === "OVERDUE") {
      const lateDays = s.dueDate ? daysBetween(s.dueDate, now) : 0;
      const penaltyPerDay = lateRule ? (gross * Number(lateRule.rate)) / 100 : 0;
      alerts.push({
        type: "PAYMENT_OVERDUE",
        severity: "CRITICAL",
        title: `QUÁ HẠN đợt ${s.stageNo} — ${s.contract.vendor.name}`,
        message: `Trễ ${lateDays} ngày. Còn cần chuẩn bị ≈ ${Math.round(remaining).toLocaleString("vi-VN")}₫. ${lateRule ? `Phạt ${Number(lateRule.rate)}%/ngày ≈ ${Math.round(penaltyPerDay).toLocaleString("vi-VN")}₫/ngày.` : ""}`,
        dueAt: s.dueDate ?? undefined,
        refTable: "PaymentStage",
        refId: s.id,
      });
    } else if (s.status === "PARTIAL") {
      alerts.push({
        type: "PAYMENT_DUE",
        severity: "MEDIUM",
        title: `Đợt ${s.stageNo} (${s.name}) — ${s.contract.vendor.name} — đã trả một phần`,
        message: `Đã trả ${Number(s.paidAmount ?? 0).toLocaleString("vi-VN")}₫, còn cần chuẩn bị ≈ ${Math.round(remaining).toLocaleString("vi-VN")}₫${lateRule ? `. Quá hạn sẽ bị phạt ${Number(lateRule.rate)}%/ngày` : ""}`,
        dueAt: s.dueDate ?? undefined,
        refTable: "PaymentStage",
        refId: s.id,
      });
    } else {
      alerts.push({
        type: "PAYMENT_DUE",
        severity: "MEDIUM",
        title: `Đợt ${s.stageNo} (${s.name}) — ${s.contract.vendor.name}`,
        message: `Cần chuẩn bị ≈ ${Math.round(gross).toLocaleString("vi-VN")}₫${lateRule ? `. Quá hạn sẽ bị phạt ${Number(lateRule.rate)}%/ngày` : ""}`,
        dueAt: s.dueDate ?? undefined,
        refTable: "PaymentStage",
        refId: s.id,
      });
    }
  }

  // 2. Hold point đang chờ CĐT xác nhận (đồng hồ 48h)
  for (const m of milestones) {
    const deadline = new Date(m.requestedAt!.getTime() + m.confirmDeadlineHrs * HOUR);
    const hoursLeft = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / HOUR));
    alerts.push({
      type: hoursLeft <= 12 ? "HOLD_POINT_EXPIRING" : "HOLD_POINT_REQUESTED",
      severity: hoursLeft <= 12 ? "CRITICAL" : "HIGH",
      title: `Nghiệm thu "${m.name}"`,
      message:
        hoursLeft <= 12
          ? `⏰ Còn ${hoursLeft}h là TỰ ĐỘNG THÔNG QUA (điều khoản ${m.confirmDeadlineHrs}h)!`
          : `Thầu đã yêu cầu nghiệm thu — còn ${hoursLeft}h để xác nhận qua App/Zalo.`,
      dueAt: deadline,
      refTable: "Milestone",
      refId: m.id,
    });
  }

  // 3. Phạt chờ việc đang chạy
  for (const log of idleLogs) {
    const days = Math.max(1, daysBetween(log.startDate, now) + 1);
    const total = days * Number(log.dailyPenalty);
    alerts.push({
      type: "IDLE_PENALTY_RUNNING",
      severity: "CRITICAL",
      title: `Chờ việc — ${log.contract.vendor.name} (ngày thứ ${days})`,
      message: `Phạt lũy kế ${total.toLocaleString("vi-VN")}₫ (${Number(log.dailyPenalty).toLocaleString("vi-VN")}₫/ngày). Xử lý nguyên nhân để dừng đồng hồ!`,
      refTable: "IdleWaitLog",
      refId: log.id,
    });
  }

  // 4. Chênh lệch cọc ép thử vs đại trà
  for (const rec of pilingRecords) {
    const surplus = rec.piles.reduce((s, p) => s + Number(p.cutOffLength ?? 0), 0);
    if (surplus > 0) {
      const surplusCost = surplus * Number(rec.unitPricePerMeter);
      alerts.push({
        type: "PILE_VARIANCE",
        severity: "HIGH",
        title: `Cọc dư ${surplus.toLocaleString("vi-VN")}m so với ép thử`,
        message: `Giá trị ≈ ${Math.round(surplusCost).toLocaleString("vi-VN")}₫${rec.returnFreightFee ? ` + phí vận chuyển trả ${Number(rec.returnFreightFee).toLocaleString("vi-VN")}₫` : ""}. Cần chốt phương án với thầu.`,
        refTable: "PilingRecord",
        refId: rec.id,
      });
    }
  }

  // 5. Vượt ngân sách
  const ownerPaid = await prisma.ownerPurchaseItem.aggregate({
    where: { projectId },
    _sum: { actualCost: true },
  });
  const totalSpent =
    Number(purchases._sum.paidAmount ?? 0) + Number(ownerPaid._sum.actualCost ?? 0);
  if (totalSpent > Number(project.budgetPlanned)) {
    alerts.push({
      type: "BUDGET_OVERRUN",
      severity: "HIGH",
      title: "Chi tiêu vượt ngân sách dự kiến",
      message: `Đã chi ${totalSpent.toLocaleString("vi-VN")}₫ / ngân sách ${Number(project.budgetPlanned).toLocaleString("vi-VN")}₫`,
    });
  }

  // 6. Chướng ngại vật ngầm — rủi ro đã ghi nhận ở Sổ rủi ro, đưa vào Action Queue để không bị bỏ sót
  for (const r of undergroundRisks) {
    alerts.push({
      type: "UNDERGROUND_OBSTACLE",
      severity: r.severity,
      title: `Chướng ngại ngầm: ${r.title}`,
      message: r.description ?? "Cần khảo sát/xử lý trước khi tiếp tục đào/ép cọc khu vực liên quan.",
      refTable: "RiskLog",
      refId: r.id,
    });
  }

  // 7. Hợp đồng sắp/đã quá hạn hoàn thành theo plannedEndDate mà chưa nghiệm thu xong (actualEndDate)
  for (const c of nearDeadlineContracts) {
    const diffDays = Math.floor((c.plannedEndDate!.getTime() - now.getTime()) / 86_400_000);
    if (diffDays > CONTRACT_DEADLINE_WARN_DAYS) continue;
    const overdue = diffDays < 0;
    alerts.push({
      type: "CONTRACT_DEADLINE_NEAR",
      severity: overdue ? "CRITICAL" : diffDays <= 3 ? "HIGH" : "MEDIUM",
      title: overdue
        ? `QUÁ HẠN hoàn thành HĐ ${c.code} — ${c.vendor.name}`
        : `Sắp tới hạn hoàn thành HĐ ${c.code} — ${c.vendor.name}`,
      message: overdue
        ? `Đã quá hạn hoàn thành theo hợp đồng ${Math.abs(diffDays)} ngày (hạn ${c.plannedEndDate!.toLocaleDateString("vi-VN")}) mà chưa xác nhận hoàn thành.`
        : `Còn ${diffDays} ngày tới hạn hoàn thành theo hợp đồng (${c.plannedEndDate!.toLocaleDateString("vi-VN")}).`,
      dueAt: c.plannedEndDate!,
      refTable: "Contract",
      refId: c.id,
    });
  }

  // 8. Rủi ro tiền khởi công & nền móng chưa xử lý (7 rule compute-on-read) — nối vào Action Queue thay vì chỉ hiện ở trang Rủi ro
  for (const a of preconAlerts) {
    alerts.push({
      type: "PRECONSTRUCTION_RISK",
      severity: a.severity,
      title: a.title,
      message: a.description,
      refTable: "PreConstructionRule",
      refId: a.ruleId,
    });
  }

  // Idempotent: xóa cũ, ghi mới
  await prisma.$transaction([
    prisma.alert.deleteMany({ where: { projectId } }),
    prisma.alert.createMany({
      data: alerts.map((a) => ({ ...a, projectId, status: "ACTIVE" as const })),
    }),
  ]);

  return prisma.alert.findMany({
    where: { projectId, status: "ACTIVE" },
    orderBy: [{ severity: "desc" }, { dueAt: "asc" }],
  });
}

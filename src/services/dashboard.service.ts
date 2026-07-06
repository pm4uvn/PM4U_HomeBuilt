/**
 * Gom toàn bộ dữ liệu cho màn hình Dashboard CĐT.
 * Chạy pipeline compute-on-read trước khi đọc:
 *   auto-approve hold point quá 48h -> chuyển đợt DUE quá hạn thành OVERDUE -> sinh alerts
 */
import { prisma } from "@/lib/prisma";
import { getProjectProgress } from "./disbursement.service";
import { resolveExpiredHoldPoints, refreshOverduePayments, syncStagesWithApprovedMilestones } from "./milestone.service";
import { computeAlerts } from "./alert.service";
import { getBudgetSummary, type BudgetSummary } from "./budget.service";
import { daysBetween } from "@/lib/format";
import { computeStageGrossAmount } from "@/lib/payment-calc";

export interface ActionItem {
  icon: string;
  sev: "critical" | "warning" | "good";
  title: string;
  sub: string;
  tag: string;
  href: string;
}

export interface GanttPhase {
  id: string;
  name: string;
  sortOrder: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  progressPct: number;
  holdPoint: { name: string; status: string } | null;
}

export interface CashflowItem {
  due: string | null; // ISO
  item: string;
  amount: number;
  status: "good" | "warning" | "critical";
  label: string;
}

export interface DashboardData {
  project: { id: string; name: string; status: string };
  progress: { pct: number; lateDays: number; forceMajeureDays: number };
  budget: BudgetSummary;
  actions: ActionItem[];
  phases: GanttPhase[];
  cashflow: CashflowItem[];
  risks: { severity: string; title: string; sub: string }[];
  todayLog: { weather: string; rainHours: number; workerCount: number; isForceMajeure: boolean } | null;
}

const ALERT_HREF: Record<string, string> = {
  PAYMENT_DUE: "/cashflow",
  PAYMENT_OVERDUE: "/cashflow",
  HOLD_POINT_REQUESTED: "/schedule",
  HOLD_POINT_EXPIRING: "/schedule",
  IDLE_PENALTY_RUNNING: "/risks",
  PILE_VARIANCE: "/risks",
  BUDGET_OVERRUN: "/cashflow",
  UNDERGROUND_OBSTACLE: "/risks",
  CONTRACT_DEADLINE_NEAR: "/contracts",
};
const ALERT_ICON: Record<string, string> = {
  PAYMENT_DUE: "💰", PAYMENT_OVERDUE: "🚨",
  HOLD_POINT_REQUESTED: "⛔", HOLD_POINT_EXPIRING: "⏰",
  IDLE_PENALTY_RUNNING: "🛑", PILE_VARIANCE: "📏",
  BUDGET_OVERRUN: "📈", UNDERGROUND_OBSTACLE: "⚠️", CONTRACT_DEADLINE_NEAR: "📅",
};

export async function getDashboardData(projectId: string): Promise<DashboardData> {
  // Pipeline nghiệp vụ trước khi đọc
  await resolveExpiredHoldPoints(projectId);
  await syncStagesWithApprovedMilestones(projectId);
  await refreshOverduePayments(projectId);
  const alerts = await computeAlerts(projectId);

  const [project, pct, budget, phasesRaw, pendingVariations, dueStages, purchases, risksRaw, todayLogRaw, vatTuDuAnAll] =
    await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      getProjectProgress(projectId),
      getBudgetSummary(projectId),
      prisma.phase.findMany({
        where: { projectId },
        orderBy: { sortOrder: "asc" },
        include: { milestones: { where: { isHoldPoint: true } } },
      }),
      prisma.variation.findMany({
        where: { contract: { projectId }, status: "SUBMITTED" },
        include: { contract: { include: { vendor: true } } },
      }),
      prisma.paymentStage.findMany({
        where: { contract: { projectId }, status: { in: ["DUE", "OVERDUE", "PARTIAL"] } },
        include: { contract: { include: { vendor: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.ownerPurchaseItem.findMany({
        where: {
          projectId,
          status: { in: ["PLANNED", "ORDERED"] },
          neededByDate: { not: null, lte: new Date(Date.now() + 90 * 86_400_000) },
        },
        orderBy: { neededByDate: "asc" },
      }),
      prisma.riskLog.findMany({
        where: { projectId, status: { in: ["OPEN", "MONITORING"] } },
        orderBy: { severity: "desc" },
        take: 5,
      }),
      prisma.dailyLog.findFirst({
        where: {
          projectId,
          logDate: { gte: new Date(new Date().toDateString()) },
        },
      }),
      // Module vật tư (bảng riêng ngoài Prisma migrate, app single-project nên không lọc theo projectId)
      prisma.vatTuDuAn.findMany({
        select: {
          ngayCanChotMau: true, ngayCanDatHang: true, ngayCanGiaoHang: true, ngayCanThiCong: true,
          trangThaiChotMau: true, trangThaiDatHang: true, trangThaiGiaoHang: true, trangThaiThiCong: true,
        },
      }),
    ]);

  // --- Tiến độ: số ngày trễ đã trừ gia hạn mưa bão hợp lệ ---
  const currentPhase = phasesRaw.find((p) => Number(p.progressPct) < 100);
  const forceMajeureDays = await prisma.dailyLog.count({
    where: { projectId, isForceMajeure: true },
  });
  let lateDays = 0;
  if (currentPhase?.plannedEnd && new Date() > currentPhase.plannedEnd) {
    lateDays = Math.max(0, daysBetween(currentPhase.plannedEnd, new Date()) - forceMajeureDays);
  }

  // --- Action queue: alerts + phát sinh chờ duyệt ---
  const actions: ActionItem[] = [
    ...alerts.map((a) => ({
      icon: ALERT_ICON[a.type] ?? "🔔",
      sev: (a.severity === "CRITICAL" ? "critical" : "warning") as ActionItem["sev"],
      title: a.title,
      sub: a.message,
      tag: a.dueAt
        ? new Date(a.dueAt) < new Date()
          ? "quá hạn"
          : `còn ${daysBetween(new Date(), a.dueAt)} ngày`
        : "đang chạy",
      href: ALERT_HREF[a.type] ?? "/",
    })),
    ...pendingVariations.map((v) => ({
      icon: "📝",
      sev: "warning" as const,
      title: `Duyệt phát sinh ${v.code}: ${v.title}`,
      sub: `${v.contract.vendor.name} — ${Number(v.costDelta) >= 0 ? "+" : ""}${Number(v.costDelta).toLocaleString("vi-VN")}₫${v.timeExtensionDays ? `, gia hạn ${v.timeExtensionDays} ngày` : ""}`,
      tag: "chờ duyệt",
      href: `/contracts/${v.contractId}`,
    })),
  ];

  // --- Cashflow 90 ngày: đợt thanh toán + hạng mục CĐT tự mua ---
  const cashflow: CashflowItem[] = [
    ...dueStages.map((s) => {
      // Nhất quán với chi tiết hợp đồng: gốc + VAT, trừ/hoàn giữ lại bảo hành, trừ đã trả một phần
      const gross = computeStageGrossAmount({
        contractValue: Number(s.contract.contractValue),
        vatRate: Number(s.contract.vatRate),
        retentionPct: Number(s.contract.retentionPct),
        percent: Number(s.percent),
        isFinal: s.isFinal,
      });
      const remaining = gross - (s.status === "PARTIAL" ? Number(s.paidAmount ?? 0) : 0);
      return {
        due: s.dueDate?.toISOString() ?? null,
        item: `Đợt ${s.stageNo} — ${s.name} (${s.contract.vendor.name})${s.status === "PARTIAL" ? " — còn thiếu" : ""}`,
        amount: Math.round(remaining),
        status: (s.status === "OVERDUE" ? "critical" : "warning") as CashflowItem["status"],
        label: s.status === "OVERDUE" ? "Quá hạn" : s.status === "PARTIAL" ? "Trả 1 phần" : "Tới hạn",
      };
    }),
    ...purchases.map((p) => ({
      due: p.neededByDate?.toISOString() ?? null,
      item: `${p.name} (CĐT tự mua)`,
      amount: Number(p.plannedCost),
      status: "good" as const,
      label: p.status === "ORDERED" ? "Đã đặt" : "Kế hoạch",
    })),
  ].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  // --- Giai đoạn "Vật tư hoàn thiện" tổng hợp từ vat_tu_du_an để hiện chung trên Gantt ---
  const vatTuDates = vatTuDuAnAll
    .flatMap((r) => [r.ngayCanChotMau, r.ngayCanDatHang, r.ngayCanGiaoHang, r.ngayCanThiCong])
    .filter((d): d is Date => d !== null);
  let vatTuPhase: GanttPhase | null = null;
  if (vatTuDates.length > 0) {
    const vatTuStart = new Date(Math.min(...vatTuDates.map((d) => +d)));
    const vatTuEnd = new Date(Math.max(...vatTuDates.map((d) => +d)));
    const doneRatios = vatTuDuAnAll.map((r) => {
      let done = 0;
      if (r.trangThaiChotMau === "da_chot") done++;
      if (["da_dat", "da_mua"].includes(r.trangThaiDatHang)) done++;
      if (r.trangThaiGiaoHang === "da_giao") done++;
      if (["da_thi_cong", "dang_nghiem_thu", "da_nghiem_thu"].includes(r.trangThaiThiCong)) done++;
      return (done / 4) * 100;
    });
    vatTuPhase = {
      id: "vat-tu-hoan-thien",
      name: "Vật tư hoàn thiện",
      sortOrder: 999,
      plannedStart: vatTuStart.toISOString(),
      plannedEnd: vatTuEnd.toISOString(),
      progressPct: Math.round(doneRatios.reduce((a, b) => a + b, 0) / doneRatios.length),
      holdPoint: null,
    };
  }

  return {
    project: { id: project.id, name: project.name, status: project.status },
    progress: { pct, lateDays, forceMajeureDays },
    budget,
    actions,
    phases: [
      ...phasesRaw.map((p) => ({
        id: p.id,
        name: p.name,
        sortOrder: p.sortOrder,
        plannedStart: p.plannedStart?.toISOString() ?? null,
        plannedEnd: p.plannedEnd?.toISOString() ?? null,
        progressPct: Number(p.progressPct),
        holdPoint: p.milestones[0]
          ? { name: p.milestones[0].name, status: p.milestones[0].status }
          : null,
      })),
      ...(vatTuPhase ? [vatTuPhase] : []),
    ],
    cashflow: cashflow.slice(0, 8),
    risks: risksRaw.map((r) => ({
      severity: r.severity,
      title: r.title,
      sub: r.description ?? "",
    })),
    todayLog: todayLogRaw
      ? {
          weather: todayLogRaw.weather,
          rainHours: Number(todayLogRaw.rainHours ?? 0),
          workerCount: todayLogRaw.workerCount,
          isForceMajeure: todayLogRaw.isForceMajeure,
        }
      : null,
  };
}

/** Lấy dự án đầu tiên (app hiện single-project; sẵn sàng mở rộng multi-project) */
export async function getDefaultProject() {
  return prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
}

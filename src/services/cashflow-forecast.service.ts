/**
 * Dự báo dòng tiền theo tháng — dùng để lập kế hoạch tài chính trước,
 * không đợi milestone nghiệm thu chính thức mới biết cần bao nhiêu tiền tháng nào.
 * Ưu tiên hạn CHÍNH THỨC (PaymentStage.dueDate) nếu đã có; nếu chưa, dùng
 * ngày DỰ KIẾN của milestone kích hoạt (Milestone.plannedDate) làm ước tính.
 */
import { prisma } from "@/lib/prisma";
import { computeStageGrossAmount } from "@/lib/payment-calc";
import { tinhThanhTien } from "@/lib/vattu-calc";

export interface ForecastItem {
  date: string; // ISO — ngày chính thức hoặc dự kiến
  isEstimated: boolean;
  label: string;
  amount: number;
  type: "contractor" | "owner" | "materials" | "other";
  /** Nhóm vật tư (chỉ có khi type === "materials") — dùng để gộp hiển thị theo danh mục */
  category?: string;
}

export interface MonthlyForecast {
  monthKey: string; // "2026-07"
  monthLabel: string; // "T7/2026"
  total: number;
  items: ForecastItem[];
}

export interface CashflowForecast {
  months: MonthlyForecast[];
  /** Đợt thanh toán chưa có cả hạn chính thức lẫn milestone dự kiến -> không lập kế hoạch được */
  undated: { label: string; contractCode: string }[];
}

export async function getMonthlyForecast(projectId: string): Promise<CashflowForecast> {
  const [stages, purchases, vatTuChuaXongList, otherExpenses] = await Promise.all([
    prisma.paymentStage.findMany({
      where: { contract: { projectId }, status: { not: "PAID" } },
      include: { contract: true, triggerMilestone: true },
    }),
    prisma.ownerPurchaseItem.findMany({
      where: { projectId, status: { not: "INSTALLED" } },
    }),
    // Module vật tư (bảng riêng ngoài Prisma migrate, app single-project nên không lọc theo projectId)
    prisma.vatTuDuAn.findMany({
      where: { trangThaiThiCong: { notIn: ["da_thi_cong", "dang_nghiem_thu", "da_nghiem_thu"] } },
      include: { vatTu: { include: { nhom: true } } },
    }),
    prisma.otherExpense.findMany({
      where: { projectId, status: { not: "PAID" } },
    }),
  ]);

  const items: ForecastItem[] = [];
  const undated: { label: string; contractCode: string }[] = [];

  for (const s of stages) {
    const effectiveDate = s.dueDate ?? s.triggerMilestone?.plannedDate ?? null;
    if (!effectiveDate) {
      undated.push({ label: `Đợt ${s.stageNo}: ${s.name}`, contractCode: s.contract.code });
      continue;
    }
    const gross = computeStageGrossAmount({
      contractValue: Number(s.contract.contractValue),
      vatRate: Number(s.contract.vatRate),
      retentionPct: Number(s.contract.retentionPct),
      percent: Number(s.percent),
      isFinal: s.isFinal,
    });
    const remaining = Math.round(gross - (s.status === "PARTIAL" ? Number(s.paidAmount ?? 0) : 0));
    items.push({
      date: effectiveDate.toISOString(),
      isEstimated: !s.dueDate,
      label: `Đợt ${s.stageNo}: ${s.name} (${s.contract.code})`,
      amount: remaining,
      type: "contractor",
    });
  }

  for (const p of purchases) {
    if (!p.neededByDate) continue;
    items.push({
      date: p.neededByDate.toISOString(),
      isEstimated: false,
      label: p.name,
      amount: Number(p.actualCost ?? p.plannedCost),
      type: "owner",
    });
  }

  for (const v of vatTuChuaXongList) {
    const effectiveDate = v.ngayCanDatHang ?? v.ngayCanGiaoHang ?? v.ngayCanThiCong ?? v.ngayCanChotMau;
    if (!effectiveDate) continue;
    const amount = tinhThanhTien(
      v.khoiLuongThucTe ? Number(v.khoiLuongThucTe) : null,
      v.donGiaChot ? Number(v.donGiaChot) : null,
      v.thanhTienChot ? Number(v.thanhTienChot) : null,
    ) ?? tinhThanhTien(
      v.khoiLuongDuKien ? Number(v.khoiLuongDuKien) : null,
      v.donGiaDuKien ? Number(v.donGiaDuKien) : null,
      v.thanhTienDuKien ? Number(v.thanhTienDuKien) : null,
    );
    if (!amount) continue;
    items.push({
      date: effectiveDate.toISOString(),
      isEstimated: true, // ngày cần là mục tiêu tự đặt, không phải hạn hợp đồng chính thức
      label: v.vatTu.tenVatTu,
      amount,
      type: "materials",
      category: v.vatTu.nhom.tenNhomVatTu,
    });
  }

  for (const e of otherExpenses) {
    if (!e.expenseDate) continue;
    items.push({
      date: e.expenseDate.toISOString(),
      isEstimated: false,
      label: e.title,
      amount: Number(e.actualCost ?? e.plannedCost),
      type: "other",
    });
  }

  const groups = new Map<string, ForecastItem[]>();
  for (const it of items) {
    const d = new Date(it.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  const months = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, its]) => {
      const [y, m] = monthKey.split("-");
      return {
        monthKey,
        monthLabel: `T${Number(m)}/${y}`,
        total: its.reduce((s, i) => s + i.amount, 0),
        items: its.sort((a, b) => a.date.localeCompare(b.date)),
      };
    });

  return { months, undated };
}

/**
 * Tổng hợp ngân sách: tách 3 dòng tiền
 *  (1) Trả nhà thầu theo đợt hợp đồng (PaymentStage đã PAID/PARTIAL)
 *  (2) Hạng mục CĐT tự mua (OwnerPurchaseItem)
 *  (3) Vật tư hoàn thiện gắn vào dự án (VatTuDuAn — bảng riêng ngoài Prisma migrate)
 * + Phát sinh đã duyệt (Variation APPROVED)
 */
import { prisma } from "@/lib/prisma";
import { tinhThanhTien } from "@/lib/vattu-calc";

export interface BudgetSummary {
  planned: number;            // tổng ngân sách dự kiến của dự án
  contractorPaid: number;     // đã trả nhà thầu
  ownerPaid: number;          // CĐT đã tự chi
  ownerPlanned: number;       // kế hoạch hạng mục CĐT tự mua
  materialsPlanned: number;   // kế hoạch vật tư hoàn thiện (thành tiền dự kiến)
  materialsSpent: number;     // vật tư đã chốt giá (thành tiền chốt)
  approvedVariations: number; // tổng phát sinh đã duyệt (+/-)
  totalSpent: number;
  overrun: boolean;
}

export async function getBudgetSummary(projectId: string): Promise<BudgetSummary> {
  const [project, paidAgg, purchases, variationAgg, vatTuDuAnAll] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    prisma.paymentStage.aggregate({
      where: { contract: { projectId }, status: { in: ["PAID", "PARTIAL"] } },
      _sum: { paidAmount: true },
    }),
    prisma.ownerPurchaseItem.aggregate({
      where: { projectId },
      _sum: { actualCost: true, plannedCost: true },
    }),
    prisma.variation.aggregate({
      where: { contract: { projectId }, status: "APPROVED" },
      _sum: { costDelta: true },
    }),
    // Module vật tư (bảng riêng ngoài Prisma migrate, app single-project nên không lọc theo projectId)
    prisma.vatTuDuAn.findMany({
      select: {
        khoiLuongDuKien: true, donGiaDuKien: true, thanhTienDuKien: true,
        khoiLuongThucTe: true, donGiaChot: true, thanhTienChot: true,
      },
    }),
  ]);

  const planned = Number(project.budgetPlanned);
  const contractorPaid = Number(paidAgg._sum.paidAmount ?? 0);
  const ownerPaid = Number(purchases._sum.actualCost ?? 0);

  const materialsPlanned = vatTuDuAnAll.reduce(
    (s, r) =>
      s +
      (tinhThanhTien(
        r.khoiLuongDuKien ? Number(r.khoiLuongDuKien) : null,
        r.donGiaDuKien ? Number(r.donGiaDuKien) : null,
        r.thanhTienDuKien ? Number(r.thanhTienDuKien) : null,
      ) ?? 0),
    0,
  );
  const materialsSpent = vatTuDuAnAll.reduce(
    (s, r) =>
      s +
      (tinhThanhTien(
        r.khoiLuongThucTe ? Number(r.khoiLuongThucTe) : null,
        r.donGiaChot ? Number(r.donGiaChot) : null,
        r.thanhTienChot ? Number(r.thanhTienChot) : null,
      ) ?? 0),
    0,
  );

  const totalSpent = contractorPaid + ownerPaid + materialsSpent;

  return {
    planned,
    contractorPaid,
    ownerPaid,
    ownerPlanned: Number(purchases._sum.plannedCost ?? 0),
    materialsPlanned,
    materialsSpent,
    approvedVariations: Number(variationAgg._sum.costDelta ?? 0),
    totalSpent,
    overrun: totalSpent > planned,
  };
}

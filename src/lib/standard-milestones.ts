/**
 * Bộ mốc nghiệm thu chuẩn theo thực tế thi công nhà ở Việt Nam (tham chiếu TCVN
 * nghiệm thu công tác xây dựng + thông lệ giám sát công trình dân dụng).
 * isHoldPoint = true: bắt buộc nghiệm thu đạt mới được thi công bước tiếp theo.
 */
import type { PhaseType } from "@prisma/client";

export interface MilestoneTemplate {
  name: string;
  isHoldPoint: boolean;
}

/**
 * Rải đều ngày dự kiến cho N mốc trong khoảng [start, end] của giai đoạn —
 * để mỗi mốc có ngày cụ thể ngay khi tạo, thay vì chỉ nằm chung chung trong cả giai đoạn.
 * Mốc cuối cùng luôn trùng plannedEnd (ngày hoàn thành giai đoạn).
 */
export function spreadDates(start: Date, end: Date, count: number): Date[] {
  if (count <= 0) return [];
  if (count === 1) return [new Date(end)];
  const span = end.getTime() - start.getTime();
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + (span * (i + 1)) / count));
}

/** Tên 2 mốc "cổng kiểm soát" (stage gate) — dùng khớp chính xác khi chặn đóng giai đoạn, xem updatePhase() */
export const PRE_CONSTRUCTION_GATE_NAME = "Chuẩn bị khởi công — Cổng kiểm soát";
export const PILING_GATE_NAME = "Ép cọc / nền móng — Cổng kiểm soát";

export const STANDARD_MILESTONES: Partial<Record<PhaseType, MilestoneTemplate[]>> = {
  TENDERING: [
    { name: "Duyệt hồ sơ năng lực nhà thầu", isHoldPoint: false },
    { name: "Ký hợp đồng thi công", isHoldPoint: false },
  ],
  DESIGN_CONCEPT: [
    { name: "Duyệt phương án mặt bằng công năng", isHoldPoint: false },
    { name: "Duyệt phối cảnh 3D mặt tiền", isHoldPoint: false },
  ],
  DESIGN_TECHNICAL: [
    { name: "Duyệt hồ sơ thiết kế kết cấu", isHoldPoint: false },
    { name: "Duyệt hồ sơ thiết kế điện nước (M&E)", isHoldPoint: false },
    { name: "Duyệt bản vẽ xin phép xây dựng", isHoldPoint: false },
  ],
  PERMIT: [
    { name: "Nộp hồ sơ xin phép xây dựng", isHoldPoint: false },
    { name: "Nhận Giấy phép xây dựng", isHoldPoint: true },
    { name: PRE_CONSTRUCTION_GATE_NAME, isHoldPoint: true },
  ],
  PILING: [
    { name: "Nghiệm thu cọc ép thử", isHoldPoint: true },
    { name: "Nghiệm thu cọc ép đại trà", isHoldPoint: true },
    { name: PILING_GATE_NAME, isHoldPoint: true },
  ],
  // STRUCTURE xử lý riêng theo số tầng — xem buildStructureMilestones()
  FINISHING: [
    { name: "Duyệt báo giá vật tư & nhân công hoàn thiện", isHoldPoint: false },
    { name: "Nghiệm thu ốp lát gạch nền, tường", isHoldPoint: false },
    { name: "Nghiệm thu bả matit, sơn nước hoàn thiện", isHoldPoint: false },
    { name: "Nghiệm thu lắp đặt cửa, cửa sổ", isHoldPoint: false },
    { name: "Nghiệm thu lắp đặt thiết bị vệ sinh", isHoldPoint: false },
    { name: "Nghiệm thu hệ thống điện nước hoàn thiện", isHoldPoint: true },
    { name: "Thử nước chống thấm ban công, sân thượng (ngâm 24h)", isHoldPoint: true },
  ],
  INTERIOR_INSTALL: [
    { name: "Duyệt thiết kế nội thất (bản vẽ, phối cảnh 3D)", isHoldPoint: false },
    { name: "Nghiệm thu lắp đặt tủ bếp, nội thất gắn liền", isHoldPoint: false },
    { name: "Nghiệm thu lắp đặt đèn, rèm trang trí", isHoldPoint: false },
    { name: "Vệ sinh công nghiệp trước bàn giao", isHoldPoint: false },
  ],
  AS_BUILT: [
    { name: "Nghiệm thu tổng thể trước bàn giao", isHoldPoint: true },
    { name: "Hoàn thiện bản vẽ hoàn công", isHoldPoint: false },
    { name: "Nghiệm thu bàn giao công trình", isHoldPoint: true },
  ],
};

/**
 * Thi công thô — sinh động theo số tầng thực tế (VD "1 trệt 3 lầu" -> floorsAboveGround=3),
 * vì đây là giai đoạn có nhiều Hold Point nhất và phụ thuộc số tầng của từng nhà.
 */
export function buildStructureMilestones(floorsAboveGround: number, hasTum = false): MilestoneTemplate[] {
  const floorLabels = ["Tầng trệt", ...Array.from({ length: floorsAboveGround }, (_, i) => `Tầng ${i + 1}`)];
  return [
    { name: "Nghiệm thu định vị tim trục, cốt nền", isHoldPoint: true },
    { name: "Nghiệm thu đào đất hố móng", isHoldPoint: true },
    { name: "Nghiệm thu cốt thép móng", isHoldPoint: true },
    { name: "Nghiệm thu đổ bê tông móng", isHoldPoint: true },
    { name: "Nghiệm thu cốt thép giằng móng", isHoldPoint: true },
    ...floorLabels.map((label) => ({
      name: `Nghiệm thu cốt thép + đổ bê tông cột, sàn ${label}`,
      isHoldPoint: true,
    })),
    // Sân thượng (mái BTCT) luôn có; tầng tum (phòng nhỏ trên sân thượng: cầu thang, bồn nước, kho) tùy nhà
    { name: "Nghiệm thu cốt thép + đổ bê tông sàn sân thượng", isHoldPoint: true },
    ...(hasTum
      ? [
          { name: "Nghiệm thu cốt thép + đổ bê tông cột, sàn tầng tum", isHoldPoint: true },
          { name: "Nghiệm thu chống thấm sàn tum, mái tum", isHoldPoint: true },
        ]
      : []),
    { name: "Nghiệm thu cốt thép + đổ bê tông mái (mái tum/mái BTCT trên cùng)", isHoldPoint: true },
    { name: "Nghiệm thu hệ thống điện nước âm sàn/âm tường (trước khi tô trát)", isHoldPoint: true },
    { name: "Nghiệm thu xây tô tường bao che", isHoldPoint: false },
    { name: "Nghiệm thu chống thấm sàn mái, sân thượng, WC", isHoldPoint: true },
  ];
}

/**
 * Công thức tính số tiền 1 đợt thanh toán (gốc + VAT, trừ/hoàn giữ lại bảo hành) —
 * dùng chung ở bảng đợt thanh toán (chi tiết hợp đồng, Dòng tiền, Dashboard) để
 * luôn khớp với khối "Đợt giải ngân kế tiếp" (không tính discount/phạt/phát sinh,
 * những khoản đó chỉ áp cho đúng "đợt kế tiếp" trong disbursement.service).
 */
export function computeStageGrossAmount(params: {
  contractValue: number;
  vatRate: number;
  retentionPct: number;
  percent: number;
  isFinal: boolean;
}): number {
  const { contractValue, vatRate, retentionPct, percent, isFinal } = params;
  const baseAmount = (contractValue * percent) / 100;
  const vatAmt = (baseAmount * vatRate) / 100;
  const retentionAmt = isFinal ? -(contractValue * retentionPct) / 100 : (baseAmount * retentionPct) / 100;
  return baseAmount + vatAmt - retentionAmt;
}

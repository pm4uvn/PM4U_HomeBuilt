/** Số ngày lùi trước ngày lắp đặt (plannedDate của milestone) cho từng mốc — tính trực tiếp từ ngày lắp đặt, không cộng dồn */
export const TB_LEAD_DAYS = {
  chonModel: 21, // chọn model trước ngày lắp đặt 3 tuần
  datHang: 10, // đặt hàng sau khi chọn model, đủ thời gian giao hàng
  giaoHang: 3, // giao hàng trước ngày lắp đặt — đủ thời gian kiểm tra
} as const;

const DAY = 86_400_000;

/** dịch lùi n ngày so với ngày mốc (định dạng yyyy-MM-dd cho input type="date") */
function minusDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * DAY).toISOString().slice(0, 10);
}

/**
 * Gợi ý 4 mốc ngày (chọn model / đặt hàng / giao hàng / lắp đặt) lùi từ ngày dự kiến
 * của milestone liên quan — milestone chính là lúc thiết bị phải lắp đặt xong.
 */
export function suggestThietBiDates(milestonePlannedDate: string) {
  const ngayLapDat = milestonePlannedDate.slice(0, 10);
  return {
    ngayCanChonModel: minusDays(ngayLapDat, TB_LEAD_DAYS.chonModel),
    ngayCanDatHang: minusDays(ngayLapDat, TB_LEAD_DAYS.datHang),
    ngayCanGiaoHang: minusDays(ngayLapDat, TB_LEAD_DAYS.giaoHang),
    ngayCanLapDat: ngayLapDat,
  };
}

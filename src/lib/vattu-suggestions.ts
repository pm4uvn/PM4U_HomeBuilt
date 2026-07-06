/** Số ngày lùi trước ngày thi công (plannedDate của milestone) cho từng mốc — tính trực tiếp từ ngày thi công, không cộng dồn */
export const VT_LEAD_DAYS = {
  chotMau: 21, // chốt mẫu trước ngày thi công 3 tuần
  datHang: 10, // đặt hàng sau khi chốt mẫu, đủ thời gian sản xuất/vận chuyển trước khi giao
  giaoHang: 3, // giao hàng trước ngày thi công — đủ thời gian kiểm tra
} as const;

const DAY = 86_400_000;

/** dịch lùi n ngày so với ngày mốc (định dạng yyyy-MM-dd cho input type="date") */
function minusDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * DAY).toISOString().slice(0, 10);
}

/**
 * Gợi ý 4 mốc ngày (chốt mẫu / đặt hàng / giao hàng / thi công) lùi từ ngày dự kiến
 * của milestone liên quan — milestone chính là lúc vật tư phải thi công xong.
 */
export function suggestVatTuDates(milestonePlannedDate: string) {
  const ngayThiCong = milestonePlannedDate.slice(0, 10);
  return {
    ngayCanChotMau: minusDays(ngayThiCong, VT_LEAD_DAYS.chotMau),
    ngayCanDatHang: minusDays(ngayThiCong, VT_LEAD_DAYS.datHang),
    ngayCanGiaoHang: minusDays(ngayThiCong, VT_LEAD_DAYS.giaoHang),
    ngayCanThiCong: ngayThiCong,
  };
}

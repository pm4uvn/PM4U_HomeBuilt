/** Thành tiền vật tư: ưu tiên số đã lưu tay, nếu trống thì tự nhân khối lượng x đơn giá */
export function tinhThanhTien(
  khoiLuong: number | null,
  donGia: number | null,
  thanhTienDaLuu: number | null,
): number | null {
  if (thanhTienDaLuu != null) return thanhTienDaLuu;
  if (khoiLuong != null && donGia != null) return khoiLuong * donGia;
  return null;
}

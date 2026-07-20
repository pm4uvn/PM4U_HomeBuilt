/**
 * Danh sách gợi ý PIC dùng chung cho MỌI ô chọn PIC/phụ trách khắp app (WBS, Nhật ký, Issue Log,
 * Rủi ro, Bảo hành...) — gộp vai trò phổ biến + bảng Pic (danh sách PIC quản lý ở Điều lệ dự án) +
 * Stakeholder + tên nhà thầu trong hợp đồng. Trước đây mỗi trang tự lặp lại logic gộp này, giờ gom
 * về 1 hàm duy nhất để mọi nơi luôn nhất quán và tự động có PIC mới ngay khi thêm ở /charter/pic.
 */
import { prisma } from "@/lib/prisma";

export const COMMON_PIC_ROLES = ["Chủ đầu tư", "Giám sát công trình", "Kỹ sư kết cấu", "Kỹ sư M&E", "Đơn vị thiết kế"];

/** extra: các giá trị PIC đã từng gõ tay lưu trong dữ liệu hiện có (VD owner/pic đã lưu ở các bản ghi cũ) — vẫn giữ gợi ý dù không còn khớp Pic/Stakeholder/Vendor nào */
export async function getPicOptions(projectId: string, extra: (string | null | undefined)[] = []): Promise<string[]> {
  const [pics, stakeholders, contracts] = await Promise.all([
    prisma.pic.findMany({ where: { projectId }, select: { name: true } }),
    prisma.stakeholder.findMany({ where: { projectId }, select: { name: true } }),
    prisma.contract.findMany({ where: { projectId }, include: { vendor: { select: { name: true } } } }),
  ]);
  return Array.from(
    new Set([
      ...COMMON_PIC_ROLES,
      ...pics.map((p) => p.name),
      ...stakeholders.map((s) => s.name),
      ...contracts.map((c) => c.vendor.name),
      ...extra.filter((p): p is string => !!p),
    ]),
  ).sort((a, b) => a.localeCompare(b, "vi"));
}

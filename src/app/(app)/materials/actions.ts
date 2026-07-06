"use server";

/* Server Actions — Module 6: Vật tư hoàn thiện */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { suggestVatTuDates } from "@/lib/vattu-suggestions";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => (str(fd, k) ? Number(str(fd, k)) : null);
const bigIntOrNull = (fd: FormData, k: string) => (str(fd, k) ? BigInt(str(fd, k)) : null);
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);

/**
 * Mặc định của app: nếu chọn milestone mà không tự nhập ngày cần (form UI vốn đã tự điền gợi ý
 * khi chọn milestone, đây là lớp bảo hiểm cho mọi đường ghi dữ liệu khác), tự tính 4 ngày cần
 * theo công thức lùi ngày từ ngày dự kiến của milestone.
 */
async function resolveNgayCan(fd: FormData) {
  const idMilestone = str(fd, "idMilestone") || null;
  const manual = {
    ngayCanChotMau: dateOrNull(fd, "ngayCanChotMau"),
    ngayCanDatHang: dateOrNull(fd, "ngayCanDatHang"),
    ngayCanGiaoHang: dateOrNull(fd, "ngayCanGiaoHang"),
    ngayCanThiCong: dateOrNull(fd, "ngayCanThiCong"),
  };
  if (!idMilestone || Object.values(manual).some((d) => d !== null)) return manual;

  const milestone = await prisma.milestone.findUnique({ where: { id: idMilestone } });
  if (!milestone?.plannedDate) return manual;

  const s = suggestVatTuDates(milestone.plannedDate.toISOString());
  return {
    ngayCanChotMau: new Date(s.ngayCanChotMau),
    ngayCanDatHang: new Date(s.ngayCanDatHang),
    ngayCanGiaoHang: new Date(s.ngayCanGiaoHang),
    ngayCanThiCong: new Date(s.ngayCanThiCong),
  };
}

function revalidate() {
  revalidatePath("/materials");
  revalidatePath("/materials/catalog");
}

const CONG_VIEC_MAU = [
  { ma: "CHOT_MAU", ten: "Chốt mẫu", thuTu: 1 },
  { ma: "DUYET_GIA", ten: "Duyệt giá", thuTu: 2 },
  { ma: "DAT_HANG", ten: "Đặt hàng", thuTu: 3 },
  { ma: "GIAO_HANG", ten: "Giao hàng", thuTu: 4 },
  { ma: "KIEM_TRA", ten: "Kiểm tra vật tư", thuTu: 5 },
  { ma: "THI_CONG", ten: "Thi công", thuTu: 6 },
  { ma: "NGHIEM_THU", ten: "Nghiệm thu", thuTu: 7 },
] as const;

/** Thêm 1 vật tư (chọn từ danh mục chuẩn) vào dự án — tự sinh 7 công việc theo dõi tiến độ */
export async function addVatTuDuAn(idDuAn: string, fd: FormData) {
  await requireUser();

  const idVatTu = BigInt(str(fd, "idVatTu"));
  const khoiLuongDuKien = numOrNull(fd, "khoiLuongDuKien");
  const donGiaDuKien = numOrNull(fd, "donGiaDuKien");
  const ngayCan = await resolveNgayCan(fd);

  const vtda = await prisma.vatTuDuAn.create({
    data: {
      idDuAn: BigInt(idDuAn),
      idVatTu,
      idNhaCungCap: bigIntOrNull(fd, "idNhaCungCap"),
      idMilestone: str(fd, "idMilestone") || null,
      khuVucSuDung: str(fd, "khuVucSuDung") || null,
      khoiLuongDuKien,
      donViTinh: str(fd, "donViTinh") || null,
      donGiaDuKien,
      thanhTienDuKien: khoiLuongDuKien != null && donGiaDuKien != null ? khoiLuongDuKien * donGiaDuKien : null,
      nguoiMua: str(fd, "nguoiMua") || "chua_xac_dinh",
      ...ngayCan,
    },
  });

  await prisma.congViecVatTu.createMany({
    data: CONG_VIEC_MAU.map((c) => ({
      idVatTuDuAn: vtda.id,
      maCongViec: c.ma,
      tenCongViec: c.ten,
      thuTu: c.thuTu,
    })),
  });

  revalidate();
}

/** Sửa thông tin 1 vật tư trong dự án: khu vực, khối lượng, đơn giá, NCC, người mua, ghi chú */
export async function updateVatTuDuAn(id: string, fd: FormData) {
  await requireUser();

  const khoiLuongDuKien = numOrNull(fd, "khoiLuongDuKien");
  const khoiLuongThucTe = numOrNull(fd, "khoiLuongThucTe");
  const donGiaDuKien = numOrNull(fd, "donGiaDuKien");
  const donGiaChot = numOrNull(fd, "donGiaChot");
  const ngayCan = await resolveNgayCan(fd);

  await prisma.vatTuDuAn.update({
    where: { id: BigInt(id) },
    data: {
      idNhaCungCap: bigIntOrNull(fd, "idNhaCungCap"),
      idMilestone: str(fd, "idMilestone") || null,
      khuVucSuDung: str(fd, "khuVucSuDung") || null,
      khoiLuongDuKien,
      khoiLuongThucTe,
      donGiaDuKien,
      donGiaChot,
      thanhTienDuKien: khoiLuongDuKien != null && donGiaDuKien != null ? khoiLuongDuKien * donGiaDuKien : null,
      thanhTienChot: khoiLuongThucTe != null && donGiaChot != null ? khoiLuongThucTe * donGiaChot : null,
      nguoiMua: str(fd, "nguoiMua") || "chua_xac_dinh",
      ghiChu: str(fd, "ghiChu") || null,
      ...ngayCan,
    },
  });

  revalidate();
}

/** Cập nhật nhanh 1 trong 4 trạng thái (chốt mẫu / đặt hàng / giao hàng / thi công) — chọn là lưu ngay */
export async function updateVatTuTrangThai(
  id: string,
  field: "trangThaiChotMau" | "trangThaiDatHang" | "trangThaiGiaoHang" | "trangThaiThiCong",
  value: string,
) {
  await requireUser();
  await prisma.vatTuDuAn.update({ where: { id: BigInt(id) }, data: { [field]: value } });
  revalidate();
}

/**
 * Ánh xạ công việc -> trạng thái vật tư tương ứng: tick xong 1 công việc thì tự chuyển dropdown
 * trạng thái liên quan, khỏi phải chọn tay 2 lần cho cùng 1 việc (checklist + dropdown).
 * DUYET_GIA và KIEM_TRA là bước phụ (không có dropdown riêng) nên không map.
 */
const CONG_VIEC_TRANG_THAI_MAP: Record<
  string,
  { field: "trangThaiChotMau" | "trangThaiDatHang" | "trangThaiGiaoHang" | "trangThaiThiCong"; hoanThanh: string; chuaXong: string }
> = {
  CHOT_MAU: { field: "trangThaiChotMau", hoanThanh: "da_chot", chuaXong: "chua_chot" },
  DAT_HANG: { field: "trangThaiDatHang", hoanThanh: "da_dat", chuaXong: "chua_dat" },
  GIAO_HANG: { field: "trangThaiGiaoHang", hoanThanh: "da_giao", chuaXong: "chua_giao" },
  THI_CONG: { field: "trangThaiThiCong", hoanThanh: "da_thi_cong", chuaXong: "chua_thi_cong" },
  NGHIEM_THU: { field: "trangThaiThiCong", hoanThanh: "da_nghiem_thu", chuaXong: "da_thi_cong" },
};

/** Đánh dấu / bỏ đánh dấu hoàn thành 1 công việc trong tiến độ vật tư — tự đồng bộ dropdown trạng thái liên quan */
export async function toggleCongViecVatTu(id: string, hoanThanh: boolean) {
  await requireUser();
  const congViec = await prisma.congViecVatTu.update({
    where: { id: BigInt(id) },
    data: {
      trangThai: hoanThanh ? "hoan_thanh" : "chua_lam",
      ngayThucTe: hoanThanh ? new Date() : null,
    },
  });

  const map = CONG_VIEC_TRANG_THAI_MAP[congViec.maCongViec];
  if (map) {
    await prisma.vatTuDuAn.update({
      where: { id: congViec.idVatTuDuAn },
      data: { [map.field]: hoanThanh ? map.hoanThanh : map.chuaXong },
    });
  }

  revalidate();
}

/**
 * Đồng bộ lại 4 ngày cần theo ngày dự kiến HIỆN TẠI của milestone đã liên kết — dùng khi mốc
 * bên trang Tiến độ đã đổi ngày. Đây là hành động CHỦ ĐỘNG của người dùng (không tự chạy ngầm),
 * vì ngày cần có thể đã được sửa tay và không nên bị ghi đè nếu không được yêu cầu.
 */
export async function dongBoNgayCanTheoMilestone(id: string) {
  await requireUser();
  const vtda = await prisma.vatTuDuAn.findUniqueOrThrow({ where: { id: BigInt(id) }, include: { milestone: true } });
  if (!vtda.milestone?.plannedDate) return;

  const s = suggestVatTuDates(vtda.milestone.plannedDate.toISOString());
  await prisma.vatTuDuAn.update({
    where: { id: BigInt(id) },
    data: {
      ngayCanChotMau: new Date(s.ngayCanChotMau),
      ngayCanDatHang: new Date(s.ngayCanDatHang),
      ngayCanGiaoHang: new Date(s.ngayCanGiaoHang),
      ngayCanThiCong: new Date(s.ngayCanThiCong),
    },
  });
  revalidate();
}

/** Xóa 1 vật tư khỏi dự án (xóa luôn các công việc theo dõi tiến độ liên quan) */
export async function deleteVatTuDuAn(id: string) {
  await requireUser();
  await prisma.congViecVatTu.deleteMany({ where: { idVatTuDuAn: BigInt(id) } });
  await prisma.vatTuDuAn.delete({ where: { id: BigInt(id) } });
  revalidate();
}

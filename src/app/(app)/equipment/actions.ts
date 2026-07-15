"use server";

/* Server Actions — Thiết bị điện tử: Thiết bị dự án (theo dõi thực tế) + Danh mục tham khảo */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { suggestThietBiDates } from "@/lib/thietbi-suggestions";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[.,\s]/g, "");
  return v === "" ? null : Number(v);
};
const intOrNull = (fd: FormData, k: string) => (str(fd, k) ? parseInt(str(fd, k), 10) : null);
const bigIntOrNull = (fd: FormData, k: string) => (str(fd, k) ? BigInt(str(fd, k)) : null);
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);

function revalidate() {
  revalidatePath("/equipment");
  revalidatePath("/equipment/catalog");
}

/**
 * Mặc định của app: nếu chọn milestone mà không tự nhập ngày cần (form UI vốn đã tự điền gợi ý
 * khi chọn milestone, đây là lớp bảo hiểm cho mọi đường ghi dữ liệu khác), tự tính 4 ngày cần
 * theo công thức lùi ngày từ ngày dự kiến của milestone — cùng cơ chế với module Vật tư.
 */
async function resolveNgayCan(fd: FormData) {
  const idMilestone = str(fd, "idMilestone") || null;
  const manual = {
    ngayCanChonModel: dateOrNull(fd, "ngayCanChonModel"),
    ngayCanDatHang: dateOrNull(fd, "ngayCanDatHang"),
    ngayCanGiaoHang: dateOrNull(fd, "ngayCanGiaoHang"),
    ngayCanLapDat: dateOrNull(fd, "ngayCanLapDat"),
  };
  if (!idMilestone || Object.values(manual).some((d) => d !== null)) return manual;

  const milestone = await prisma.milestone.findUnique({ where: { id: idMilestone } });
  if (!milestone?.plannedDate) return manual;

  const s = suggestThietBiDates(milestone.plannedDate.toISOString());
  return {
    ngayCanChonModel: new Date(s.ngayCanChonModel),
    ngayCanDatHang: new Date(s.ngayCanDatHang),
    ngayCanGiaoHang: new Date(s.ngayCanGiaoHang),
    ngayCanLapDat: new Date(s.ngayCanLapDat),
  };
}

const CONG_VIEC_MAU = [
  { ma: "CHON_MODEL", ten: "Chọn model", thuTu: 1 },
  { ma: "DUYET_GIA", ten: "Duyệt giá", thuTu: 2 },
  { ma: "DAT_HANG", ten: "Đặt hàng", thuTu: 3 },
  { ma: "GIAO_HANG", ten: "Giao hàng", thuTu: 4 },
  { ma: "KIEM_TRA", ten: "Kiểm tra thiết bị", thuTu: 5 },
  { ma: "LAP_DAT", ten: "Lắp đặt", thuTu: 6 },
  { ma: "NGHIEM_THU", ten: "Nghiệm thu", thuTu: 7 },
] as const;

/** Thêm 1 thiết bị (chọn từ danh mục tham khảo) vào dự án — tự sinh 7 công việc theo dõi tiến độ */
export async function addThietBiDuAn(idDuAn: string, fd: FormData) {
  await requireUser();

  const idThietBi = str(fd, "idThietBi");
  const soLuongDuKien = numOrNull(fd, "soLuongDuKien");
  const donGiaDuKien = numOrNull(fd, "donGiaDuKien");
  const ngayCan = await resolveNgayCan(fd);

  const tbda = await prisma.thietBiDuAn.create({
    data: {
      idDuAn: BigInt(idDuAn),
      idThietBi,
      idNhaCungCap: bigIntOrNull(fd, "idNhaCungCap"),
      idMilestone: str(fd, "idMilestone") || null,
      viTriLapDat: str(fd, "viTriLapDat") || null,
      soLuongDuKien,
      donViTinh: str(fd, "donViTinh") || null,
      donGiaDuKien,
      thanhTienDuKien: soLuongDuKien != null && donGiaDuKien != null ? soLuongDuKien * donGiaDuKien : null,
      nguoiMua: str(fd, "nguoiMua") || "chua_xac_dinh",
      ...ngayCan,
    },
  });

  await prisma.congViecThietBi.createMany({
    data: CONG_VIEC_MAU.map((c) => ({
      idThietBiDuAn: tbda.id,
      maCongViec: c.ma,
      tenCongViec: c.ten,
      thuTu: c.thuTu,
    })),
  });

  revalidate();
}

/**
 * Thêm nhanh 1 hạng mục thẳng từ Danh mục tham khảo vào dự án — số lượng mặc định 1, đơn giá lấy
 * theo mức giá người dùng chọn (thấp/trung bình/cao), không cần mở form. Người dùng chỉnh chi tiết
 * (vị trí, số lượng, NCC, milestone...) sau ở tab Thiết bị dự án qua nút Sửa — giống nút "+ Thêm vào sổ" ở trang Rủi ro.
 */
export async function quickAddThietBiDuAn(
  idDuAn: string,
  idThietBi: string,
  priceTier: "thap" | "trung_binh" | "cao" = "trung_binh",
) {
  await requireUser();
  const tb = await prisma.thietBi.findUniqueOrThrow({ where: { id: idThietBi } });
  const gia = priceTier === "thap" ? tb.giaThap : priceTier === "cao" ? tb.giaCao : tb.giaTrungBinh;
  const donGiaDuKien = gia != null ? Number(gia) : null;

  const tbda = await prisma.thietBiDuAn.create({
    data: {
      idDuAn: BigInt(idDuAn),
      idThietBi,
      soLuongDuKien: 1,
      donViTinh: tb.donViTinh,
      donGiaDuKien,
      thanhTienDuKien: donGiaDuKien,
      nguoiMua: "chua_xac_dinh",
    },
  });

  await prisma.congViecThietBi.createMany({
    data: CONG_VIEC_MAU.map((c) => ({
      idThietBiDuAn: tbda.id,
      maCongViec: c.ma,
      tenCongViec: c.ten,
      thuTu: c.thuTu,
    })),
  });

  revalidate();
}

/**
 * Thêm hàng loạt thiết bị vào dự án cùng lúc — dùng cho tính năng "Tự động thêm theo quy mô nhà"
 * (người dùng đã xem trước và bỏ chọn ở modal, đây là bước ghi thật sau khi xác nhận).
 */
export async function bulkAddThietBiDuAn(
  idDuAn: string,
  items: { idThietBi: string; soLuong: number; priceTier: "thap" | "trung_binh" | "cao" }[],
) {
  await requireUser();
  if (items.length === 0) return;

  const thietBiList = await prisma.thietBi.findMany({ where: { id: { in: items.map((i) => i.idThietBi) } } });
  const byId = new Map(thietBiList.map((t) => [t.id, t]));

  for (const item of items) {
    const tb = byId.get(item.idThietBi);
    if (!tb) continue;
    const gia = item.priceTier === "thap" ? tb.giaThap : item.priceTier === "cao" ? tb.giaCao : tb.giaTrungBinh;
    const donGiaDuKien = gia != null ? Number(gia) : null;
    const soLuongDuKien = item.soLuong > 0 ? item.soLuong : 1;

    const tbda = await prisma.thietBiDuAn.create({
      data: {
        idDuAn: BigInt(idDuAn),
        idThietBi: tb.id,
        soLuongDuKien,
        donViTinh: tb.donViTinh,
        donGiaDuKien,
        thanhTienDuKien: donGiaDuKien != null ? donGiaDuKien * soLuongDuKien : null,
        nguoiMua: "chua_xac_dinh",
      },
    });

    await prisma.congViecThietBi.createMany({
      data: CONG_VIEC_MAU.map((c) => ({
        idThietBiDuAn: tbda.id,
        maCongViec: c.ma,
        tenCongViec: c.ten,
        thuTu: c.thuTu,
      })),
    });
  }

  revalidate();
}

/** Sửa thông tin 1 thiết bị trong dự án: vị trí, số lượng, đơn giá, NCC, người mua, ghi chú */
export async function updateThietBiDuAn(id: string, fd: FormData) {
  await requireUser();

  const soLuongDuKien = numOrNull(fd, "soLuongDuKien");
  const soLuongThucTe = numOrNull(fd, "soLuongThucTe");
  const donGiaDuKien = numOrNull(fd, "donGiaDuKien");
  const donGiaChot = numOrNull(fd, "donGiaChot");
  const ngayCan = await resolveNgayCan(fd);

  await prisma.thietBiDuAn.update({
    where: { id },
    data: {
      idNhaCungCap: bigIntOrNull(fd, "idNhaCungCap"),
      idMilestone: str(fd, "idMilestone") || null,
      viTriLapDat: str(fd, "viTriLapDat") || null,
      soLuongDuKien,
      soLuongThucTe,
      donGiaDuKien,
      donGiaChot,
      thanhTienDuKien: soLuongDuKien != null && donGiaDuKien != null ? soLuongDuKien * donGiaDuKien : null,
      thanhTienChot: soLuongThucTe != null && donGiaChot != null ? soLuongThucTe * donGiaChot : null,
      nguoiMua: str(fd, "nguoiMua") || "chua_xac_dinh",
      ghiChu: str(fd, "ghiChu") || null,
      ...ngayCan,
    },
  });

  revalidate();
}

/** Cập nhật nhanh 1 trong 4 trạng thái (chọn model / đặt hàng / giao hàng / lắp đặt) — chọn là lưu ngay */
export async function updateThietBiTrangThai(
  id: string,
  field: "trangThaiChonModel" | "trangThaiDatHang" | "trangThaiGiaoHang" | "trangThaiLapDat",
  value: string,
) {
  await requireUser();
  await prisma.thietBiDuAn.update({ where: { id }, data: { [field]: value } });
  revalidate();
}

/**
 * Ánh xạ công việc -> trạng thái thiết bị tương ứng: tick xong 1 công việc thì tự chuyển dropdown
 * trạng thái liên quan, khỏi phải chọn tay 2 lần cho cùng 1 việc (checklist + dropdown).
 * DUYET_GIA và KIEM_TRA là bước phụ (không có dropdown riêng) nên không map.
 */
const CONG_VIEC_TRANG_THAI_MAP: Record<
  string,
  { field: "trangThaiChonModel" | "trangThaiDatHang" | "trangThaiGiaoHang" | "trangThaiLapDat"; hoanThanh: string; chuaXong: string }
> = {
  CHON_MODEL: { field: "trangThaiChonModel", hoanThanh: "da_chon", chuaXong: "chua_chon" },
  DAT_HANG: { field: "trangThaiDatHang", hoanThanh: "da_dat", chuaXong: "chua_dat" },
  GIAO_HANG: { field: "trangThaiGiaoHang", hoanThanh: "da_giao", chuaXong: "chua_giao" },
  LAP_DAT: { field: "trangThaiLapDat", hoanThanh: "da_lap_dat", chuaXong: "chua_lap_dat" },
  NGHIEM_THU: { field: "trangThaiLapDat", hoanThanh: "da_lap_dat", chuaXong: "dang_lap_dat" },
};

/** Đánh dấu / bỏ đánh dấu hoàn thành 1 công việc trong tiến độ thiết bị — tự đồng bộ dropdown trạng thái liên quan */
export async function toggleCongViecThietBi(id: string, hoanThanh: boolean) {
  await requireUser();
  const congViec = await prisma.congViecThietBi.update({
    where: { id },
    data: {
      trangThai: hoanThanh ? "hoan_thanh" : "chua_lam",
      ngayThucTe: hoanThanh ? new Date() : null,
    },
  });

  const map = CONG_VIEC_TRANG_THAI_MAP[congViec.maCongViec];
  if (map) {
    await prisma.thietBiDuAn.update({
      where: { id: congViec.idThietBiDuAn },
      data: { [map.field]: hoanThanh ? map.hoanThanh : map.chuaXong },
    });
  }

  revalidate();
}

/**
 * Đồng bộ lại 4 ngày cần theo ngày dự kiến HIỆN TẠI của milestone đã liên kết — dùng khi mốc
 * bên trang Tiến độ đã đổi ngày. Đây là hành động CHỦ ĐỘNG của người dùng (không tự chạy ngầm).
 */
export async function dongBoNgayCanThietBiTheoMilestone(id: string) {
  await requireUser();
  const tbda = await prisma.thietBiDuAn.findUniqueOrThrow({ where: { id }, include: { milestone: true } });
  if (!tbda.milestone?.plannedDate) return;

  const s = suggestThietBiDates(tbda.milestone.plannedDate.toISOString());
  await prisma.thietBiDuAn.update({
    where: { id },
    data: {
      ngayCanChonModel: new Date(s.ngayCanChonModel),
      ngayCanDatHang: new Date(s.ngayCanDatHang),
      ngayCanGiaoHang: new Date(s.ngayCanGiaoHang),
      ngayCanLapDat: new Date(s.ngayCanLapDat),
    },
  });
  revalidate();
}

/** Xóa 1 thiết bị khỏi dự án (xóa luôn các công việc theo dõi tiến độ liên quan) */
export async function deleteThietBiDuAn(id: string) {
  await requireUser();
  await prisma.congViecThietBi.deleteMany({ where: { idThietBiDuAn: id } });
  await prisma.thietBiDuAn.delete({ where: { id } });
  revalidate();
}

export async function createThietBi(fd: FormData) {
  await requireUser();
  await prisma.thietBi.create({
    data: {
      maDanhMuc: str(fd, "maDanhMuc"),
      maNhom: str(fd, "maNhom") || "00",
      nhomCap1: str(fd, "nhomCap1"),
      nhomCap2: str(fd, "nhomCap2"),
      tenHangMuc: str(fd, "tenHangMuc"),
      donViTinh: str(fd, "donViTinh") || null,
      coSoSoLuong: str(fd, "coSoSoLuong") || null,
      thongSoBatBuoc: str(fd, "thongSoBatBuoc") || null,
      thuongHieuPhoBien: str(fd, "thuongHieuPhoBien") || null,
      giaThap: numOrNull(fd, "giaThap"),
      giaTrungBinh: numOrNull(fd, "giaTrungBinh"),
      giaCao: numOrNull(fd, "giaCao"),
      baoHanhThang: intOrNull(fd, "baoHanhThang"),
      tuoiThoNam: intOrNull(fd, "tuoiThoNam"),
      yeuCauLapDat: str(fd, "yeuCauLapDat") || null,
      nguonThamKhao: str(fd, "nguonThamKhao") || null,
      doTinCay: (str(fd, "doTinCay") || "trung_binh") as never,
      trangThai: (str(fd, "trangThai") || "dang_su_dung") as never,
      ghiChu: str(fd, "ghiChu") || null,
      ngayCapNhat: new Date(),
    },
  });
  revalidate();
}

export async function updateThietBi(id: string, fd: FormData) {
  await requireUser();
  await prisma.thietBi.update({
    where: { id },
    data: {
      maDanhMuc: str(fd, "maDanhMuc"),
      maNhom: str(fd, "maNhom") || "00",
      nhomCap1: str(fd, "nhomCap1"),
      nhomCap2: str(fd, "nhomCap2"),
      tenHangMuc: str(fd, "tenHangMuc"),
      donViTinh: str(fd, "donViTinh") || null,
      coSoSoLuong: str(fd, "coSoSoLuong") || null,
      thongSoBatBuoc: str(fd, "thongSoBatBuoc") || null,
      thuongHieuPhoBien: str(fd, "thuongHieuPhoBien") || null,
      giaThap: numOrNull(fd, "giaThap"),
      giaTrungBinh: numOrNull(fd, "giaTrungBinh"),
      giaCao: numOrNull(fd, "giaCao"),
      baoHanhThang: intOrNull(fd, "baoHanhThang"),
      tuoiThoNam: intOrNull(fd, "tuoiThoNam"),
      yeuCauLapDat: str(fd, "yeuCauLapDat") || null,
      nguonThamKhao: str(fd, "nguonThamKhao") || null,
      doTinCay: (str(fd, "doTinCay") || "trung_binh") as never,
      trangThai: (str(fd, "trangThai") || "dang_su_dung") as never,
      ghiChu: str(fd, "ghiChu") || null,
      ngayCapNhat: new Date(),
    },
  });
  revalidate();
}

export async function deleteThietBi(id: string) {
  await requireUser();
  await prisma.thietBi.delete({ where: { id } });
  revalidate();
}

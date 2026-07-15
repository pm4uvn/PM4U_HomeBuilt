// Nhập danh mục tham khảo thiết bị điện tử (214 hạng mục) từ file Excel
// "HomeBuild_PM_database_thiet_bi_dien_tu_master_20260713.xlsx", sheet "Danh_muc_master".
// Ghi vào bảng thiet_bi (model Prisma ThietBi) qua Prisma Client.
//
// Cách dùng:
//   node scripts/import-thietbi-master.mjs --thu   -> chạy thử trong transaction rồi ROLLBACK
//   node scripts/import-thietbi-master.mjs         -> chạy thật
import "dotenv/config";
import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const FILE = "HomeBuild_PM_database_thiet_bi_dien_tu_master_20260713.xlsx";
const SHEET = "Danh_muc_master";
const chayThu = process.argv.includes("--thu");

// Cùng cấu hình kết nối với src/lib/prisma.ts (transaction pooler)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const wb = XLSX.readFile(FILE, { cellDates: true });
// 3 dòng đầu là tiêu đề/ghi chú, header thật ở dòng thứ 4 (index 3)
const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { range: 3, defval: null });

const DO_TIN_CAY_MAP = { "Cao": "cao", "Trung bình": "trung_binh", "Thấp": "thap" };
const TRANG_THAI_MAP = { "Đang sử dụng": "dang_su_dung", "Ngừng bán": "ngung_ban", "Thay thế": "thay_the" };

function num(v) {
  return v === null || v === "" ? null : Number(v);
}
function str(v) {
  return v === null || v === "" ? null : String(v).trim();
}
function int(v) {
  return v === null || v === "" ? null : Math.round(Number(v));
}

async function main() {
  const missingMa = rows.filter((r) => !r["Mã danh mục"]);
  if (missingMa.length > 0) {
    throw new Error(`${missingMa.length} dòng thiếu Mã danh mục — dừng lại.`);
  }

  console.log(`Đọc được ${rows.length} dòng từ sheet "${SHEET}".`);

  const data = rows.map((r) => ({
    maDanhMuc: str(r["Mã danh mục"]),
    maNhom: str(r["Mã nhóm"]) ?? "",
    nhomCap1: str(r["Nhóm cấp 1"]) ?? "",
    nhomCap2: str(r["Nhóm cấp 2"]) ?? "",
    tenHangMuc: str(r["Tên hạng mục"]) ?? "",
    donViTinh: str(r["ĐVT"]),
    coSoSoLuong: str(r["Cơ sở số lượng"]),
    thongSoBatBuoc: str(r["Thông số bắt buộc khi báo giá"]),
    thuongHieuPhoBien: str(r["Thương hiệu phổ biến"]),
    giaThap: num(r["Giá thấp"]),
    giaTrungBinh: num(r["Giá trung bình"]),
    giaCao: num(r["Giá cao"]),
    baoHanhThang: int(r["Bảo hành (tháng)"]),
    tuoiThoNam: int(r["Tuổi thọ (năm)"]),
    yeuCauLapDat: str(r["Yêu cầu lắp đặt/hạ tầng"]),
    nguonThamKhao: str(r["Nguồn tham khảo"]),
    ngayCapNhat: r["Ngày cập nhật"] instanceof Date ? r["Ngày cập nhật"] : null,
    doTinCay: DO_TIN_CAY_MAP[r["Độ tin cậy"]] ?? "trung_binh",
    trangThai: TRANG_THAI_MAP[r["Trạng thái"]] ?? "dang_su_dung",
    ghiChu: str(r["Ghi chú"]),
  }));

  await prisma.$transaction(async (tx) => {
    const before = await tx.thietBi.count();
    console.log(`thiet_bi hiện có trong DB: ${before}`);
    if (before > 0) {
      throw new Error(`Bảng thiet_bi đã có ${before} dòng — dừng lại để tránh trùng lặp, cần xử lý thủ công trước (xóa hết hoặc đổi logic upsert).`);
    }

    const created = await tx.thietBi.createMany({ data });
    console.log(`Đã tạo ${created.count} hạng mục.`);

    const sample = await tx.thietBi.findMany({
      where: { maDanhMuc: { in: [data[0].maDanhMuc, data[data.length - 1].maDanhMuc] } },
      select: { maDanhMuc: true, tenHangMuc: true, nhomCap1: true, giaTrungBinh: true },
    });
    console.log("Mẫu đầu/cuối:", sample);

    const groupCount = await tx.thietBi.groupBy({ by: ["nhomCap1"], _count: true });
    console.log(`Số nhóm cấp 1: ${groupCount.length}`);

    if (chayThu) {
      throw new Error("__ROLLBACK_THU__");
    }
  }).catch((e) => {
    if (e.message === "__ROLLBACK_THU__") {
      console.log("✅ Chạy thử thành công — đã ROLLBACK, DB không thay đổi.");
      return;
    }
    throw e;
  });

  if (!chayThu) {
    console.log("✅ Đã nhập danh mục thiết bị điện tử vào database.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

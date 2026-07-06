// Nhập vật tư thực tế cho dự án DA_HMS_001, sinh từ 71 dòng báo giá Cát Nghi
// (file "HomeBuild_PM_vat_tu_du_an_CatNghi_import.xlsx", sheet "vat_tu_du_an" + "cong_viec_vat_tu").
//
// Cách dùng:
//   node scripts/import-vattu-du-an.mjs --thu   -> chạy thử trong transaction rồi ROLLBACK
//   node scripts/import-vattu-du-an.mjs         -> chạy thật
import "dotenv/config";
import XLSX from "xlsx";
import pg from "pg";

const FILE = "HomeBuild_PM_vat_tu_du_an_CatNghi_import.xlsx";
const chayThu = process.argv.includes("--thu");

const wb = XLSX.readFile(FILE);
const vtdaRows = XLSX.utils.sheet_to_json(wb.Sheets["vat_tu_du_an"], { defval: null });
const congViecRows = XLSX.utils.sheet_to_json(wb.Sheets["cong_viec_vat_tu"], { defval: null });

function num(v) {
  return v === null || v === "" ? null : Number(v);
}
function str(v) {
  return v === null || v === "" ? null : String(v);
}

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query("BEGIN");

  const existing = await client.query("SELECT count(*)::int AS n FROM vat_tu_du_an");
  if (existing.rows[0].n > 0) {
    throw new Error(`vat_tu_du_an đã có ${existing.rows[0].n} dòng — dừng lại để tránh nhập trùng, cần xử lý thủ công trước.`);
  }

  const vatTuMap = new Map(
    (await client.query("SELECT id, ma_vat_tu FROM vat_tu")).rows.map((r) => [r.ma_vat_tu, r.id]),
  );
  const duAnMap = new Map(
    (await client.query("SELECT id, ma_du_an FROM du_an")).rows.map((r) => [r.ma_du_an, r.id]),
  );
  const nccMap = new Map(
    (await client.query("SELECT id, ma_nha_cung_cap FROM nha_cung_cap")).rows.map((r) => [r.ma_nha_cung_cap, r.id]),
  );

  // ma_vat_tu_du_an (Excel, vd VTDA0001) -> id thật trong DB sau khi insert
  const vtdaIdMap = new Map();

  for (const r of vtdaRows) {
    const idVatTu = vatTuMap.get(r.ma_vat_tu);
    const idDuAn = duAnMap.get(r.ma_du_an);
    const idNcc = r.ma_nha_cung_cap ? nccMap.get(r.ma_nha_cung_cap) : null;
    if (!idVatTu) throw new Error(`Không tìm thấy vật tư ${r.ma_vat_tu} (${r.ma_vat_tu_du_an})`);
    if (!idDuAn) throw new Error(`Không tìm thấy dự án ${r.ma_du_an}`);

    const { rows: [row] } = await client.query(
      `INSERT INTO vat_tu_du_an (
         id_du_an, id_vat_tu, id_nha_cung_cap, khu_vuc_su_dung,
         khoi_luong_du_kien, khoi_luong_thuc_te, don_vi_tinh,
         don_gia_du_kien, don_gia_chot, thanh_tien_du_kien, thanh_tien_chot,
         nguoi_mua, trang_thai_chot_mau, trang_thai_dat_hang, trang_thai_giao_hang, trang_thai_thi_cong,
         ngay_can_chot_mau, ngay_can_dat_hang, ngay_can_giao_hang, ngay_can_thi_cong,
         ngay_thuc_te_chot_mau, ngay_thuc_te_dat_hang, ngay_thuc_te_giao_hang, ngay_thuc_te_thi_cong, ngay_thuc_te_nghiem_thu,
         ghi_chu
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING id`,
      [
        idDuAn, idVatTu, idNcc, str(r.khu_vuc_su_dung),
        num(r.khoi_luong_du_kien), num(r.khoi_luong_thuc_te), str(r.don_vi_tinh),
        num(r.don_gia_du_kien), num(r.don_gia_chot), num(r.thanh_tien_du_kien), num(r.thanh_tien_chot),
        r.nguoi_mua || "chua_xac_dinh",
        r.trang_thai_chot_mau || "chua_chot",
        r.trang_thai_dat_hang || "chua_dat",
        r.trang_thai_giao_hang || "chua_giao",
        r.trang_thai_thi_cong || "chua_thi_cong",
        str(r.ngay_can_chot_mau), str(r.ngay_can_dat_hang), str(r.ngay_can_giao_hang), str(r.ngay_can_thi_cong),
        str(r.ngay_thuc_te_chot_mau), str(r.ngay_thuc_te_dat_hang), str(r.ngay_thuc_te_giao_hang),
        str(r.ngay_thuc_te_thi_cong), str(r.ngay_thuc_te_nghiem_thu),
        str(r.ghi_chu),
      ],
    );
    vtdaIdMap.set(r.ma_vat_tu_du_an, row.id);
  }
  console.log(`Đã nhập ${vtdaRows.length} dòng vat_tu_du_an.`);

  let congViecCount = 0;
  for (const c of congViecRows) {
    const idVtda = vtdaIdMap.get(c.ma_vat_tu_du_an);
    if (!idVtda) throw new Error(`Không tìm thấy vat_tu_du_an ${c.ma_vat_tu_du_an} cho công việc ${c.ma_cong_viec_day_du}`);
    await client.query(
      `INSERT INTO cong_viec_vat_tu (
         id_vat_tu_du_an, ma_cong_viec, ten_cong_viec, thu_tu, ngay_du_kien, ngay_thuc_te,
         nguoi_phu_trach, trang_thai, ghi_chu
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        idVtda, c.ma_cong_viec, c.ten_cong_viec, c.thu_tu, str(c.ngay_du_kien), str(c.ngay_thuc_te),
        str(c.nguoi_phu_trach), c.trang_thai || "chua_lam", str(c.ghi_chu),
      ],
    );
    congViecCount++;
  }
  console.log(`Đã nhập ${congViecCount} dòng cong_viec_vat_tu.`);

  const tongHop = await client.query(
    "SELECT tong_du_kien, so_luong_vat_tu FROM v_tong_hop_chi_phi_vat_tu_du_an WHERE ma_du_an='DA_HMS_001'",
  );
  console.log("Tổng hợp DA_HMS_001:", tongHop.rows[0]);

  if (chayThu) {
    await client.query("ROLLBACK");
    console.log("✅ Chạy thử thành công — đã ROLLBACK, DB không thay đổi.");
  } else {
    await client.query("COMMIT");
    console.log("✅ Đã nhập vật tư dự án vào database.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("❌ Lỗi — đã ROLLBACK:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

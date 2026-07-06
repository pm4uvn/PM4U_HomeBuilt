// Nhập giá vật tư thật (130 vật tư, có giá Thiết Thạch / Cát Nghi / gói chuẩn) từ file Excel
// "HomeBuild_PM_database_vat_tu_hoan_thien_import.xlsx", sheet "vat_tu".
// Dữ liệu này thay thế 52 vật tư mẫu (giá rỗng) đã seed trước đó bằng danh mục thật.
//
// Cách dùng:
//   node scripts/import-vattu-gia.mjs --thu   -> chạy thử trong transaction rồi ROLLBACK
//   node scripts/import-vattu-gia.mjs         -> chạy thật
import "dotenv/config";
import XLSX from "xlsx";
import pg from "pg";

const FILE = "HomeBuild_PM_database_vat_tu_hoan_thien_import.xlsx";
const chayThu = process.argv.includes("--thu");

const wb = XLSX.readFile(FILE);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["vat_tu"], { defval: null });

function num(v) {
  return v === null || v === "" ? null : Number(v);
}
function str(v) {
  return v === null || v === "" ? null : String(v);
}
function bool(v) {
  return v === true || v === "true" || v === 1;
}

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query("BEGIN");

  const before = await client.query("SELECT count(*)::int AS n FROM vat_tu");
  console.log(`Vật tư hiện có trong DB: ${before.rows[0].n} (sẽ xóa hết — chưa dòng nào được vat_tu_du_an tham chiếu)`);

  const inUse = await client.query("SELECT count(*)::int AS n FROM vat_tu_du_an");
  if (inUse.rows[0].n > 0) {
    throw new Error(
      `vat_tu_du_an đang có ${inUse.rows[0].n} dòng tham chiếu vat_tu — dừng lại để tránh mất dữ liệu, cần xử lý thủ công trước.`,
    );
  }

  await client.query("DELETE FROM vat_tu");

  const nhomMap = new Map(
    (await client.query("SELECT id, ma_nhom_vat_tu FROM nhom_vat_tu")).rows.map((r) => [r.ma_nhom_vat_tu, r.id]),
  );

  let inserted = 0;
  for (const r of rows) {
    const idNhom = nhomMap.get(r.ma_nhom_vat_tu);
    if (!idNhom) {
      throw new Error(`Không tìm thấy nhóm vật tư ${r.ma_nhom_vat_tu} (vật tư ${r.ma_vat_tu})`);
    }
    await client.query(
      `INSERT INTO vat_tu (
         ma_vat_tu, ten_vat_tu, id_nhom_vat_tu, don_vi_tinh, quy_cach, thuong_hieu_goi_y, xuat_xu,
         don_gia_thiet_thach, don_gia_cat_nghi, don_gia_goi_chuan, don_gia_tham_khao,
         nguon_mua_mac_dinh, can_chot_mau, can_theo_doi_tien_do, ghi_chu, trang_thai
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        r.ma_vat_tu,
        r.ten_vat_tu,
        idNhom,
        str(r.don_vi_tinh),
        str(r.quy_cach),
        str(r.thuong_hieu_goi_y),
        str(r.xuat_xu),
        num(r.don_gia_thiet_thach),
        num(r.don_gia_cat_nghi),
        num(r.don_gia_goi_chuan),
        num(r.don_gia_tham_khao),
        r.nguon_mua_mac_dinh || "chua_xac_dinh",
        bool(r.can_chot_mau),
        bool(r.can_theo_doi_tien_do),
        str(r.ghi_chu),
        r.trang_thai || "dang_dung",
      ],
    );
    inserted++;
  }

  const after = await client.query(`
    SELECT count(*)::int AS tong,
           count(*) FILTER (WHERE don_gia_tham_khao IS NOT NULL)::int AS co_gia
    FROM vat_tu
  `);
  console.log(`Đã nhập ${inserted} vật tư. Tổng trong DB: ${after.rows[0].tong}, có giá tham khảo: ${after.rows[0].co_gia}`);

  const sample = await client.query(
    "SELECT ma_vat_tu, ten_vat_tu, don_gia_tham_khao FROM vat_tu ORDER BY id LIMIT 3",
  );
  console.log("Mẫu 3 dòng đầu:", sample.rows);

  if (chayThu) {
    await client.query("ROLLBACK");
    console.log("✅ Chạy thử thành công — đã ROLLBACK, DB không thay đổi.");
  } else {
    await client.query("COMMIT");
    console.log("✅ Đã cập nhật danh mục vật tư thật vào database.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("❌ Lỗi — đã ROLLBACK:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

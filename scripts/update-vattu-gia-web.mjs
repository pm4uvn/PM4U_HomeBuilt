// Cập nhật don_gia_tham_khao trong vat_tu theo giá tra cứu web (gia_web_de_xuat) từ file Excel
// "HomeBuild_PM_database_vat_tu_hoan_thien_gia_web_20260713.xlsx", sheet "gia_web_20260713".
// Chỉ cập nhật don_gia_tham_khao — không đụng tới giá Thiết Thạch/Cát Nghi/gói chuẩn hay ghi_chu.
//
// Cách dùng:
//   node scripts/update-vattu-gia-web.mjs --thu   -> chạy thử trong transaction rồi ROLLBACK
//   node scripts/update-vattu-gia-web.mjs         -> chạy thật
import "dotenv/config";
import XLSX from "xlsx";
import pg from "pg";

const FILE = "HomeBuild_PM_database_vat_tu_hoan_thien_gia_web_20260713.xlsx";
const SHEET = "gia_web_20260713";
const chayThu = process.argv.includes("--thu");

const wb = XLSX.readFile(FILE);
// 3 dòng đầu của sheet là tiêu đề/ghi chú, header thật ở dòng thứ 4 (index 3)
const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { range: 3, defval: null });

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query("BEGIN");

  const dbRows = (await client.query("SELECT id, ma_vat_tu, don_gia_tham_khao FROM vat_tu")).rows;
  const dbMap = new Map(dbRows.map((r) => [r.ma_vat_tu, r]));

  const unmatched = rows.filter((r) => !dbMap.has(r.ma_vat_tu));
  if (unmatched.length > 0) {
    throw new Error(`Không tìm thấy ${unmatched.length} mã vật tư trong DB: ${unmatched.map((r) => r.ma_vat_tu).join(", ")}`);
  }

  let updated = 0;
  let unchanged = 0;
  for (const r of rows) {
    const db = dbMap.get(r.ma_vat_tu);
    const newGia = r.gia_web_de_xuat == null ? null : Number(r.gia_web_de_xuat);
    const oldGia = db.don_gia_tham_khao == null ? null : Number(db.don_gia_tham_khao);
    if (oldGia === newGia) {
      unchanged++;
      continue;
    }
    await client.query("UPDATE vat_tu SET don_gia_tham_khao = $1 WHERE id = $2", [newGia, db.id]);
    updated++;
  }

  console.log(`Đã cập nhật ${updated} vật tư (giữ nguyên ${unchanged} vật tư giá không đổi) / tổng ${rows.length} dòng trong sheet.`);

  const sample = await client.query(
    "SELECT ma_vat_tu, ten_vat_tu, don_gia_tham_khao FROM vat_tu WHERE ma_vat_tu IN ('VT001','VT005') ORDER BY ma_vat_tu",
  );
  console.log("Mẫu sau cập nhật:", sample.rows);

  if (chayThu) {
    await client.query("ROLLBACK");
    console.log("✅ Chạy thử thành công — đã ROLLBACK, DB không thay đổi.");
  } else {
    await client.query("COMMIT");
    console.log("✅ Đã cập nhật giá tham khảo web vào database.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("❌ Lỗi — đã ROLLBACK:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

// Chạy toàn bộ file SQL module Vật tư hoàn thiện theo đúng thứ tự.
// Cách dùng:
//   node scripts/run-vattu-sql.mjs           -> chạy thật (áp dụng vào DB)
//   node scripts/run-vattu-sql.mjs --thu     -> chạy thử trong transaction rồi ROLLBACK (không đổi gì)
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const FILES = [
  "database/001_tao_bang.sql",
  "database/002_tao_index_trigger.sql",
  "database/003_tao_view.sql",
  "database/004_seed_du_lieu_mau.sql",
  "database/005_bat_rls.sql",
];

const chayThu = process.argv.includes("--thu");

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query("BEGIN");
  for (const f of FILES) {
    process.stdout.write(`▶ ${f} ... `);
    await client.query(readFileSync(f, "utf8"));
    console.log("OK");
  }

  // Kiểm tra nhanh sau khi chạy
  const kt = await client.query(`
    SELECT
      (SELECT count(*)::int FROM nhom_vat_tu)      AS nhom,
      (SELECT count(*)::int FROM vat_tu)            AS vat_tu,
      (SELECT count(*)::int FROM nha_cung_cap)      AS ncc,
      (SELECT count(*)::int FROM du_an)             AS du_an,
      (SELECT count(*)::int FROM v_danh_sach_vat_tu) AS view_ds
  `);
  console.log("Kiểm tra:", kt.rows[0]);

  if (chayThu) {
    await client.query("ROLLBACK");
    console.log("✅ Chạy thử thành công — đã ROLLBACK, DB không thay đổi.");
  } else {
    await client.query("COMMIT");
    console.log("✅ Đã áp dụng toàn bộ vào database.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("❌ Lỗi — đã ROLLBACK toàn bộ:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

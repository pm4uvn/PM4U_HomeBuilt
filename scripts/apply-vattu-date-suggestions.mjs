// Áp gợi ý ngày (chốt mẫu -21j / đặt hàng -10j / giao hàng -3j / thi công = ngày mốc)
// cho các vật tư đã liên kết milestone nhưng CHƯA có ngày cần nào (không ghi đè ngày đã có sẵn).
//
// Cách dùng:
//   node scripts/apply-vattu-date-suggestions.mjs --thu   -> chạy thử, ROLLBACK
//   node scripts/apply-vattu-date-suggestions.mjs         -> chạy thật
import "dotenv/config";
import pg from "pg";

const chayThu = process.argv.includes("--thu");
const LEAD = { chotMau: 21, datHang: 10, giaoHang: 3 };
const DAY = 86_400_000;
const minusDays = (d, n) => new Date(new Date(d).getTime() - n * DAY);

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query("BEGIN");

  const { rows } = await client.query(`
    SELECT vtda.id, m."plannedDate" AS planned_date
    FROM vat_tu_du_an vtda
    JOIN "Milestone" m ON m.id = vtda.id_milestone
    WHERE vtda.ngay_can_chot_mau IS NULL
      AND vtda.ngay_can_dat_hang IS NULL
      AND vtda.ngay_can_giao_hang IS NULL
      AND vtda.ngay_can_thi_cong IS NULL
      AND m."plannedDate" IS NOT NULL
  `);

  let applied = 0;
  for (const r of rows) {
    await client.query(
      `UPDATE vat_tu_du_an SET
         ngay_can_chot_mau = $1, ngay_can_dat_hang = $2, ngay_can_giao_hang = $3, ngay_can_thi_cong = $4
       WHERE id = $5`,
      [
        minusDays(r.planned_date, LEAD.chotMau),
        minusDays(r.planned_date, LEAD.datHang),
        minusDays(r.planned_date, LEAD.giaoHang),
        r.planned_date,
        r.id,
      ],
    );
    applied++;
  }
  console.log(`Đã áp gợi ý ngày cho ${applied}/${rows.length} vật tư (chỉ những dòng chưa có ngày cần nào).`);

  const sample = await client.query(`
    SELECT vt.ten_vat_tu, vtda.ngay_can_chot_mau, vtda.ngay_can_dat_hang, vtda.ngay_can_giao_hang, vtda.ngay_can_thi_cong
    FROM vat_tu_du_an vtda JOIN vat_tu vt ON vt.id = vtda.id_vat_tu
    WHERE vtda.ngay_can_thi_cong IS NOT NULL
    ORDER BY vtda.ngay_can_thi_cong ASC LIMIT 3
  `);
  console.table(sample.rows);

  if (chayThu) {
    await client.query("ROLLBACK");
    console.log("✅ Chạy thử thành công — đã ROLLBACK.");
  } else {
    await client.query("COMMIT");
    console.log("✅ Đã lưu ngày gợi ý vào database.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("❌ Lỗi — đã ROLLBACK:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

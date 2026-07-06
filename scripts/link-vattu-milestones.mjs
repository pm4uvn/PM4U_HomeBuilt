// Gán milestone tiến độ tương ứng cho các vật tư đã có trong dự án (idMilestone),
// dựa theo nhóm vật tư / khu_vực_sử_dụng, để trang Vật tư gợi ý được ngày cần chốt/đặt/giao/thi công.
//
// Cách dùng:
//   node scripts/link-vattu-milestones.mjs --thu   -> chạy thử trong transaction rồi ROLLBACK
//   node scripts/link-vattu-milestones.mjs         -> chạy thật
import "dotenv/config";
import pg from "pg";

const chayThu = process.argv.includes("--thu");

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

/** Chọn milestone theo thứ tự ưu tiên: tên vật tư cụ thể > khu vực sử dụng > nhóm vật tư */
function chonTenMilestone(row) {
  if (row.ten_vat_tu === "Chi phí vệ sinh công nghiệp") return "Vệ sinh công nghiệp trước bàn giao";

  switch (row.khu_vuc_su_dung) {
    case "Phần cửa + vách kính":
    case "Phần mặt tiền":
      return "Nghiệm thu lắp đặt cửa, cửa sổ";
    case "Phần cầu thang + ngạch cửa":
    case "Phần thạch cao":
      return "Nghiệm thu ốp lát gạch nền, tường";
    case "Phần sơn nước":
      return "Nghiệm thu bả matit, sơn nước hoàn thiện";
    case "Phần thiết bị điện":
    case "Phần thiết bị cung cấp nước":
      return "Nghiệm thu hệ thống điện nước hoàn thiện";
    case "Phần thiết bị vệ sinh":
      return "Nghiệm thu lắp đặt thiết bị vệ sinh";
  }

  if (row.ten_nhom_vat_tu === "Gạch ốp lát") return "Nghiệm thu ốp lát gạch nền, tường";

  return null; // không có mốc phù hợp rõ ràng — để trống, không gán ép
}

try {
  await client.query("BEGIN");

  const { rows } = await client.query(`
    SELECT vtda.id, vt.ten_vat_tu, n.ten_nhom_vat_tu, vtda.khu_vuc_su_dung
    FROM vat_tu_du_an vtda
    JOIN vat_tu vt ON vt.id = vtda.id_vat_tu
    JOIN nhom_vat_tu n ON n.id = vt.id_nhom_vat_tu
  `);

  const milestones = await client.query('SELECT id, name FROM "Milestone"');
  const milestoneIdByName = new Map(milestones.rows.map((m) => [m.name, m.id]));

  let matched = 0;
  let unmatched = [];
  for (const row of rows) {
    const tenMilestone = chonTenMilestone(row);
    if (!tenMilestone) {
      unmatched.push(`${row.ten_vat_tu} (${row.khu_vuc_su_dung ?? row.ten_nhom_vat_tu})`);
      continue;
    }
    const idMilestone = milestoneIdByName.get(tenMilestone);
    if (!idMilestone) throw new Error(`Không tìm thấy milestone "${tenMilestone}" cho vật tư ${row.ten_vat_tu}`);
    await client.query("UPDATE vat_tu_du_an SET id_milestone = $1 WHERE id = $2", [idMilestone, row.id]);
    matched++;
  }

  console.log(`Đã gán milestone cho ${matched}/${rows.length} vật tư.`);
  if (unmatched.length > 0) {
    console.log(`Chưa có mốc phù hợp (${unmatched.length}), để trống:`);
    unmatched.forEach((u) => console.log("  -", u));
  }

  const check = await client.query(`
    SELECT m.name AS milestone, count(*)::int AS so_luong
    FROM vat_tu_du_an vtda
    JOIN "Milestone" m ON m.id = vtda.id_milestone
    GROUP BY m.name ORDER BY count(*) DESC
  `);
  console.log("Phân bổ theo mốc:");
  console.table(check.rows);

  if (chayThu) {
    await client.query("ROLLBACK");
    console.log("✅ Chạy thử thành công — đã ROLLBACK, DB không thay đổi.");
  } else {
    await client.query("COMMIT");
    console.log("✅ Đã lưu liên kết milestone vào database.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("❌ Lỗi — đã ROLLBACK:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

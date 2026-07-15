// Nhập điều khoản phạt cho HĐTC-KT2026 (Hợp đồng thiết kế kiến trúc — Thiết Thạch), theo nguyên
// văn điều khoản CĐT cung cấp.
// Chạy thử (rollback): node scripts/update-penalty-rules-thietke.mjs --thu
// Chạy thật:            node scripts/update-penalty-rules-thietke.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const isDryRun = process.argv.includes("--thu");

async function run() {
  const contract = await prisma.contract.findFirstOrThrow({ where: { code: "HĐTC-KT2026" } });
  console.log("Hợp đồng thiết kế kiến trúc:", contract.id, "giá trị:", contract.contractValue.toString());

  const rows = [
    // --- Nhà thầu thiết kế (TTG) ---
    { type: "CONTRACTOR_LATE_PROGRESS", label: null, party: "CONTRACTOR", basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.1, capPct: 8, graceDays: 5 },
    { type: "CUSTOM", label: "Nhà thầu tự ý chấm dứt HĐ hoặc chậm bàn giao hồ sơ quá 30 ngày (hoàn tạm ứng + đền bù 10%)", party: "CONTRACTOR", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 30 },
    // --- Chủ đầu tư ---
    { type: "CUSTOM", label: "CĐT thay đổi >20% thiết kế kiến trúc khi đang triển khai hồ sơ chi tiết", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
    { type: "CUSTOM", label: "CĐT yêu cầu chỉnh sửa hồ sơ kỹ thuật chi tiết từ lần thứ 3 trở đi (mỗi lần — 2 lần đầu miễn phí)", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
    { type: "CUSTOM", label: "CĐT đơn phương chấm dứt HĐ trước khi TTG triển khai công việc", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
    { type: "CUSTOM", label: "CĐT đơn phương chấm dứt HĐ sau khi TTG đã triển khai (+ thanh toán khối lượng đã làm)", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
  ];

  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.penaltyRule.create({ data: { contractId: contract.id, ...r } });
    }
    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (isDryRun) console.log("--thu: đã rollback, không ghi thật.");
    else throw e;
  });

  if (!isDryRun) {
    const rules = await prisma.penaltyRule.findMany({ where: { contractId: contract.id } });
    console.log(`\n=== ${rules.length} điều khoản đã tạo ===`);
    for (const r of rules) {
      console.log(`  ${r.type} (${r.label ?? "-"}) party=${r.party} basis=${r.basis} rate=${r.rate} capPct=${r.capPct} graceDays=${r.graceDays}`);
    }
  }
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

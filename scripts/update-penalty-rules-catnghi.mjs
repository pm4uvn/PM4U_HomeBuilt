// Nhập điều khoản phạt + giảm trừ cho 1603/2026/HĐTK-CN (HĐ thiết kế nội thất — Cát Nghi), theo
// nguyên văn điều khoản CĐT cung cấp.
// Chạy thử (rollback): node scripts/update-penalty-rules-catnghi.mjs --thu
// Chạy thật:            node scripts/update-penalty-rules-catnghi.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const isDryRun = process.argv.includes("--thu");

async function run() {
  const contract = await prisma.contract.findFirstOrThrow({ where: { code: "1603/2026/HĐTK-CN" } });
  console.log("Hợp đồng thiết kế nội thất (Cát Nghi):", contract.id, "giá trị hiện tại (đã giảm):", contract.contractValue.toString());

  const rows = [
    // --- 1. Thay đổi & chỉnh sửa thiết kế ---
    { type: "CUSTOM", label: "CĐT thay đổi >20% thiết kế nội thất khi đang triển khai hồ sơ chi tiết", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
    { type: "CUSTOM", label: "CĐT yêu cầu chỉnh sửa hồ sơ kỹ thuật chi tiết từ lần thứ 3 trở đi (mỗi lần — 2 lần đầu miễn phí)", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
    // --- 2. Đơn phương chấm dứt hợp đồng ---
    { type: "CUSTOM", label: "CĐT đơn phương chấm dứt HĐ trước khi Cát Nghi triển khai công việc", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 10, capPct: null, graceDays: 0 },
    { type: "CUSTOM", label: "CĐT đơn phương chấm dứt HĐ sau khi Cát Nghi đã triển khai (+ thanh toán khối lượng đã làm)", party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 15, capPct: null, graceDays: 0 },
    { type: "CUSTOM", label: "Cát Nghi đơn phương chấm dứt hợp đồng", party: "CONTRACTOR", basis: "PCT_OF_CONTRACT", rate: 15, capPct: null, graceDays: 0 },
    // --- 3. Tiến độ & dòng tiền ---
    // CĐT chậm thanh toán = 2 khoản riêng: lãi 0.5%/ngày trên số tiền chậm trả + phạt thêm 1 lần 8% trên đúng số tiền chậm trả đó
    { type: "OWNER_LATE_PAYMENT", label: null, party: "OWNER", basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.5, capPct: null, graceDays: 5 },
    { type: "CUSTOM", label: "CĐT chậm thanh toán quá 5 ngày làm việc — phạt thêm 1 lần trên số tiền chậm trả (ngoài lãi theo ngày, nhập số tiền chậm trả khi ghi nhận vi phạm)", party: "OWNER", basis: "PCT_OF_ITEM_VALUE", rate: 8, capPct: null, graceDays: 5 },
    { type: "CONTRACTOR_LATE_PROGRESS", label: null, party: "CONTRACTOR", basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.1, capPct: 8, graceDays: 5 },
  ];

  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.penaltyRule.create({ data: { contractId: contract.id, ...r } });
    }
    // --- 4. Giảm trừ: ưu đãi 20% (46.500.000 -> 37.200.000), mất hiệu lực nếu CĐT hủy HĐ trước hạn
    // hoặc không thanh toán đủ Đợt 1 -> quyết toán về giá gốc + hoàn trả giá trị quà tặng đã nhận
    await tx.discount.create({
      data: {
        contractId: contract.id,
        type: "PROMOTION",
        percent: 20,
        description:
          "Ưu đãi giảm 20% giá gốc (46.500.000đ -> 37.200.000đ). Mất hiệu lực (quyết toán về giá gốc 46.500.000đ + phải hoàn trả giá trị quà tặng đã nhận nếu có) nếu: CĐT chấm dứt HĐ trước thời hạn, hoặc CĐT không thanh toán đủ giá trị Đợt 1.",
      },
    });

    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (isDryRun) console.log("--thu: đã rollback, không ghi thật.");
    else throw e;
  });

  if (!isDryRun) {
    const rules = await prisma.penaltyRule.findMany({ where: { contractId: contract.id } });
    console.log(`\n=== ${rules.length} điều khoản phạt đã tạo ===`);
    for (const r of rules) {
      console.log(`  ${r.type} (${r.label ?? "-"}) party=${r.party} basis=${r.basis} rate=${r.rate} capPct=${r.capPct} graceDays=${r.graceDays}`);
    }
    const discounts = await tx_free_discounts(contract.id);
    console.log(`\n=== ${discounts.length} giảm trừ đã tạo ===`);
    for (const d of discounts) console.log(`  ${d.type} ${d.percent}% — ${d.description}`);
  }
}

async function tx_free_discounts(contractId) {
  return prisma.discount.findMany({ where: { contractId } });
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

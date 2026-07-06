// Xóa toàn bộ hợp đồng mẫu + dữ liệu con liên quan (giữ lại Vendor/nhà thầu)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const contracts = await prisma.contract.findMany({ select: { id: true, code: true } });
console.log(`Tìm thấy ${contracts.length} hợp đồng.`);

if (contracts.length === 0) {
  console.log("Không có gì để xóa.");
  process.exit(0);
}

const ids = contracts.map((c) => c.id);

await prisma.$transaction([
  // Milestone/Phase KHÔNG bị xóa (thuộc tiến độ dự án, không thuộc hợp đồng)
  // Chỉ gỡ liên kết Document -> Contract trước khi xóa hợp đồng
  prisma.document.updateMany({ where: { contractId: { in: ids } }, data: { contractId: null } }),
  prisma.paymentStage.deleteMany({ where: { contractId: { in: ids } } }),
  prisma.penaltyEvent.deleteMany({ where: { contractId: { in: ids } } }),
  prisma.penaltyRule.deleteMany({ where: { contractId: { in: ids } } }),
  prisma.discount.deleteMany({ where: { contractId: { in: ids } } }),
  prisma.variation.deleteMany({ where: { contractId: { in: ids } } }),
  prisma.idleWaitLog.deleteMany({ where: { contractId: { in: ids } } }),
  prisma.contract.deleteMany({ where: { id: { in: ids } } }),
]);

console.log(`✅ Đã xóa ${contracts.length} hợp đồng (${contracts.map((c) => c.code).join(", ")}) và toàn bộ dữ liệu con.`);
console.log("   Danh sách nhà thầu (Vendor) được giữ nguyên.");

await prisma.$disconnect();

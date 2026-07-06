// Xóa Đợt thanh toán (PaymentStage) + Hạng mục CĐT tự mua (OwnerPurchaseItem) để nhập lại dữ liệu thật.
// Giữ nguyên: Hợp đồng, Nhà thầu, Milestone, Tài khoản ngân hàng.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
if (!project) {
  console.log("Không có dự án nào.");
  process.exit(0);
}

const [stageCount, purchaseCount] = await Promise.all([
  prisma.paymentStage.count({ where: { contract: { projectId: project.id } } }),
  prisma.ownerPurchaseItem.count({ where: { projectId: project.id } }),
]);
console.log(`Tìm thấy ${stageCount} đợt thanh toán, ${purchaseCount} hạng mục CĐT tự mua.`);

if (stageCount === 0 && purchaseCount === 0) {
  console.log("Không có gì để xóa.");
  process.exit(0);
}

await prisma.$transaction([
  // Gỡ liên kết hồ sơ trước khi xóa
  prisma.document.updateMany({
    where: { ownerPurchaseItem: { projectId: project.id } },
    data: { ownerPurchaseItemId: null },
  }),
  prisma.ownerPurchaseItem.deleteMany({ where: { projectId: project.id } }),
  prisma.paymentStage.deleteMany({ where: { contract: { projectId: project.id } } }),
]);

console.log(`✅ Đã xóa ${stageCount} đợt thanh toán và ${purchaseCount} hạng mục CĐT tự mua.`);
console.log("   Giữ nguyên: hợp đồng, nhà thầu, milestone, tài khoản ngân hàng.");

await prisma.$disconnect();

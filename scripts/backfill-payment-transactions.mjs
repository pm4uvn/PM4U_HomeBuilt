// Bù dữ liệu: các đợt thanh toán đã "Đã trả/Đã trả một phần" từ TRƯỚC khi có bảng
// PaymentTransaction (trả nhiều lần) sẽ được tạo 1 giao dịch tương ứng để danh sách
// giao dịch trong UI không bị trống dù paidAmount đã có sẵn.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const stages = await prisma.paymentStage.findMany({
  where: {
    status: { in: ["PAID", "PARTIAL"] },
    paidAmount: { not: null },
    transactions: { none: {} },
  },
});
console.log(`Tìm thấy ${stages.length} đợt đã trả nhưng chưa có giao dịch tương ứng.`);

for (const s of stages) {
  await prisma.paymentTransaction.create({
    data: {
      paymentStageId: s.id,
      amount: s.paidAmount,
      paidDate: s.paidDate ?? new Date(),
      paidFromAccountId: s.paidFromAccountId,
      note: "Bù dữ liệu từ trước khi có lịch sử giao dịch",
    },
  });
  console.log(`✅ Đợt ${s.stageNo} (${s.name}): ${Number(s.paidAmount).toLocaleString("vi-VN")}₫`);
}

console.log(stages.length === 0 ? "Không có gì cần bù." : `\nXong — đã tạo ${stages.length} giao dịch.`);
await prisma.$disconnect();

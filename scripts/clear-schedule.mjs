// Xóa toàn bộ dữ liệu mẫu ở Module Tiến độ & Nghiệm thu:
// Giai đoạn (Phase), Milestone, Biên bản nghiệm thu (InspectionRecord), Nhật ký công trình (DailyLog).
// Giữ nguyên Hợp đồng/Đợt thanh toán — chỉ gỡ liên kết milestone (triggerMilestoneId -> null).
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

const [phaseCount, milestoneCount, dailyLogCount] = await Promise.all([
  prisma.phase.count({ where: { projectId: project.id } }),
  prisma.milestone.count({ where: { phase: { projectId: project.id } } }),
  prisma.dailyLog.count({ where: { projectId: project.id } }),
]);
console.log(`Tìm thấy ${phaseCount} giai đoạn, ${milestoneCount} milestone, ${dailyLogCount} nhật ký.`);

if (phaseCount === 0 && dailyLogCount === 0) {
  console.log("Không có gì để xóa.");
  process.exit(0);
}

await prisma.$transaction([
  // Gỡ liên kết hồ sơ trước khi xóa milestone/nhật ký
  prisma.document.updateMany({
    where: { inspectionRecord: { milestone: { phase: { projectId: project.id } } } },
    data: { inspectionRecordId: null },
  }),
  prisma.document.updateMany({
    where: { dailyLog: { projectId: project.id } },
    data: { dailyLogId: null },
  }),
  // Gỡ liên kết đợt thanh toán khỏi milestone (giữ nguyên đợt thanh toán, chỉ mất điều kiện kích hoạt)
  prisma.paymentStage.updateMany({
    where: { triggerMilestone: { phase: { projectId: project.id } } },
    data: { triggerMilestoneId: null, status: "UPCOMING", dueDate: null },
  }),
  prisma.inspectionRecord.deleteMany({ where: { milestone: { phase: { projectId: project.id } } } }),
  prisma.milestone.deleteMany({ where: { phase: { projectId: project.id } } }),
  prisma.dailyLog.deleteMany({ where: { projectId: project.id } }),
  prisma.phase.deleteMany({ where: { projectId: project.id } }),
]);

console.log("✅ Đã xóa toàn bộ giai đoạn, milestone, biên bản nghiệm thu và nhật ký công trình.");
console.log("   Đợt thanh toán từng gắn milestone đã chuyển về 'Chưa tới' (chưa có điều kiện kích hoạt).");

await prisma.$disconnect();

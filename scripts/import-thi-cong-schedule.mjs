// Thay thế 5 giai đoạn thi công thực tế (Ép cọc/Thi công thô/Hoàn thiện/Lắp nội thất/Hoàn công)
// bằng đúng cấu trúc "BẢNG TIẾN ĐỘ THI CÔNG CĐT HUỲNH MINH SANG" do nhà thầu Thiết Thạch gửi
// (3 giai đoạn: Phần ngầm / Phần thân / Hoàn thiện). Giữ nguyên 4 giai đoạn Tìm thầu/Thiết kế/
// Xin phép XD (đã hoàn thành, có hồ sơ nghiệm thu/thanh toán thật) không đụng tới.
//
// Chạy thử (rollback, không ghi thật): node scripts/import-thi-cong-schedule.mjs --thu
// Chạy thật:                            node scripts/import-thi-cong-schedule.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--thu");
const d = (s) => new Date(s + "T00:00:00Z");

const NEW_PHASES = [
  {
    type: "PILING",
    name: "I. Thi công phần ngầm",
    sortOrder: 5,
    weight: 14,
    plannedStart: d("2026-07-18"),
    plannedEnd: d("2026-08-14"),
    milestones: [
      { name: "1. Thi công ép cọc, tập kết vật tư, làm láng trại công nhân", plannedDate: d("2026-07-23") },
      { name: "2. Đào đất", plannedDate: d("2026-07-31") },
      { name: "3. Thi công cốp pha, cốt thép, đổ bê tông móng", plannedDate: d("2026-08-14") },
    ],
  },
  {
    type: "STRUCTURE",
    name: "II. Thi công phần thân",
    sortOrder: 6,
    weight: 23,
    plannedStart: d("2026-08-15"),
    plannedEnd: d("2026-10-01"),
    milestones: [
      { name: "1. Thi công sàn lầu 01", plannedDate: d("2026-08-28") },
      { name: "2. Thi công sàn lầu 02", plannedDate: d("2026-09-11") },
      { name: "3. Thi công sàn sân thượng", plannedDate: d("2026-09-25") },
      { name: "4. Thi công sàn Mái", plannedDate: d("2026-10-01") },
    ],
  },
  {
    type: "FINISHING",
    name: "III. Thi công hoàn thiện",
    sortOrder: 7,
    weight: 43,
    plannedStart: d("2026-10-02"),
    plannedEnd: d("2026-12-28"),
    milestones: [
      {
        name: "1. Thi công tầng trệt", plannedDate: d("2026-12-03"),
        tasks: [
          { name: "1.1. Xây tường trệt - lầu 1", durationDays: 7, dueDate: d("2026-11-25") },
          { name: "1.2. Tô tường trệt - lầu 1", durationDays: 7, dueDate: d("2026-12-03") },
        ],
      },
      {
        name: "2. Thi công sàn lầu 1", plannedDate: d("2026-10-20"),
        tasks: [
          { name: "2.1. Xây tường lầu 01 - lầu 02", durationDays: 5, dueDate: d("2026-10-07") },
          { name: "2.2. Tô tường lầu 01 - lầu 02", durationDays: 7, dueDate: d("2026-10-20") },
        ],
      },
      {
        name: "3. Thi công sàn lầu 02", plannedDate: d("2026-10-28"),
        tasks: [
          { name: "3.1. Xây tường lầu 02 - sân thượng", durationDays: 4, dueDate: d("2026-10-12") },
          { name: "3.2. Tô tường lầu 02 - sân thượng", durationDays: 7, dueDate: d("2026-10-28") },
        ],
      },
      {
        name: "4. Thi công sàn sân thượng", plannedDate: d("2026-10-31"),
        tasks: [
          { name: "4.1. Xây tường lầu sân thượng - mái", durationDays: 3, dueDate: d("2026-10-15") },
          { name: "4.2. Tô tường lầu sân thượng - mái", durationDays: 3, dueDate: d("2026-10-31") },
        ],
      },
      { name: "5. Tô vách xông", plannedDate: d("2026-11-17") },
      {
        name: "6. Thi công hệ thống M&E", plannedDate: d("2026-12-11"),
        tasks: [
          { name: "6.1. Thi công hệ thống điện", durationDays: 21, dueDate: d("2026-11-05") },
          { name: "6.2. Thi công hệ thống cấp thoát nước", durationDays: 21, dueDate: d("2026-11-05") },
          { name: "6.3. Thi công lắp thiết bị chiếu sáng", durationDays: 10, dueDate: d("2026-12-11") },
        ],
      },
      {
        name: "7. Thi công ốp lát gạch", plannedDate: d("2026-11-21"),
        tasks: [
          { name: "7.1. Chống thấm sàn mái, ST, WC, Ban công, …", durationDays: 7, dueDate: d("2026-11-13") },
          { name: "7.2. Cán nền các tầng", durationDays: 14, dueDate: d("2026-11-21") },
          { name: "7.3. Ốp lát gạch", durationDays: 14, dueDate: d("2026-11-21") },
        ],
      },
      { name: "8. Thi công trần thạch cao", plannedDate: d("2026-11-30") },
      { name: "9. Thi công sơn nước", plannedDate: d("2026-12-16") },
      { name: "10. Thi công lắp lang can, đá cầu thang, cửa, …", plannedDate: d("2026-12-16") },
      { name: "11. Hoàn thiện mặt tiền, sân trước sân sau", plannedDate: d("2026-12-16") },
      { name: "12. Hoàn thiện bàn giao", plannedDate: d("2026-12-28") },
    ],
  },
];

async function run() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) throw new Error("Không tìm thấy project");
  console.log("Project:", project.id, project.name);

  const oldTypes = ["PILING", "STRUCTURE", "FINISHING", "INTERIOR_INSTALL", "AS_BUILT"];
  const oldPhases = await prisma.phase.findMany({ where: { projectId: project.id, type: { in: oldTypes } } });
  console.log(`Sẽ xoá ${oldPhases.length} giai đoạn cũ:`, oldPhases.map((p) => p.name).join(", "));

  await prisma.$transaction(async (tx) => {
    // Gỡ liên kết Document/PaymentStage khỏi các mốc/nghiệm thu sắp xoá (giữ nguyên PaymentStage,
    // chỉ về trạng thái UPCOMING chưa gắn mốc — giống hệt cơ chế resetSchedule() đã có sẵn)
    await tx.document.updateMany({
      where: { inspectionRecord: { milestone: { phase: { projectId: project.id, type: { in: oldTypes } } } } },
      data: { inspectionRecordId: null },
    });
    await tx.paymentStage.updateMany({
      where: { triggerMilestone: { phase: { projectId: project.id, type: { in: oldTypes } } } },
      data: { triggerMilestoneId: null, status: "UPCOMING", dueDate: null },
    });
    await tx.inspectionRecord.deleteMany({ where: { milestone: { phase: { projectId: project.id, type: { in: oldTypes } } } } });
    await tx.milestone.deleteMany({ where: { phase: { projectId: project.id, type: { in: oldTypes } } } });
    await tx.phase.deleteMany({ where: { projectId: project.id, type: { in: oldTypes } } });

    for (const p of NEW_PHASES) {
      const phase = await tx.phase.create({
        data: {
          projectId: project.id,
          type: p.type,
          name: p.name,
          sortOrder: p.sortOrder,
          weight: p.weight,
          plannedStart: p.plannedStart,
          plannedEnd: p.plannedEnd,
        },
      });
      for (const m of p.milestones) {
        const milestone = await tx.milestone.create({
          data: { phaseId: phase.id, name: m.name, plannedDate: m.plannedDate },
        });
        if (m.tasks) {
          let i = 0;
          for (const t of m.tasks) {
            await tx.milestoneTask.create({
              data: {
                milestoneId: milestone.id,
                name: t.name,
                durationDays: t.durationDays,
                dueDate: t.dueDate,
                sortOrder: i++,
              },
            });
          }
        }
      }
    }

    const totalWeight = await tx.phase.aggregate({ where: { projectId: project.id }, _sum: { weight: true } });
    console.log("Tổng weight sau khi import:", totalWeight._sum.weight?.toString());

    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (e.message === "DRY_RUN_ROLLBACK") {
      console.log("\n--thu: đã rollback, không ghi thật.");
    } else {
      throw e;
    }
  });

  if (!isDryRun) {
    const phases = await prisma.phase.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
      include: { milestones: { include: { tasks: true } } },
    });
    console.log("\n=== Kết quả sau khi import ===");
    for (const p of phases) {
      console.log(`Phase [${p.type}] "${p.name}" weight=${p.weight}`);
      for (const m of p.milestones) console.log(`  - ${m.name} (${m.tasks.length} task con)`);
    }
  }
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

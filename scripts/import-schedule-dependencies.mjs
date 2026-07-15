// Thêm quan hệ phụ thuộc (finish-to-start) giữa các mốc/công việc trong 3 giai đoạn thi công
// (I. Phần ngầm / II. Phần thân / III. Hoàn thiện) — suy ra từ ngày Start/Finish trong
// "BẢNG TIẾN ĐỘ THI CÔNG CĐT HUỲNH MINH SANG.pdf" (mốc B bắt đầu ngay sau khi mốc A kết thúc).
//
// Chạy thử (rollback, không ghi thật): node scripts/import-schedule-dependencies.mjs --thu
// Chạy thật:                            node scripts/import-schedule-dependencies.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--thu");

// [loại, tên chính xác] — tên phải khớp Milestone.name hoặc MilestoneTask.name đã import trước đó
const M = (name) => ["MILESTONE", name];
const T = (name) => ["MILESTONE_TASK", name];

// predecessor(s) -> successor
const LINKS = [
  // Phase I — Thi công phần ngầm
  [[M("1. Thi công ép cọc, tập kết vật tư, làm láng trại công nhân")], M("2. Đào đất")],
  [[M("1. Thi công ép cọc, tập kết vật tư, làm láng trại công nhân")], M("3. Thi công cốp pha, cốt thép, đổ bê tông móng")],

  // Phase I -> II
  [[M("3. Thi công cốp pha, cốt thép, đổ bê tông móng")], M("1. Thi công sàn lầu 01")],
  // Phase II nội bộ
  [[M("1. Thi công sàn lầu 01")], M("2. Thi công sàn lầu 02")],
  [[M("2. Thi công sàn lầu 02")], M("3. Thi công sàn sân thượng")],
  [[M("3. Thi công sàn sân thượng")], M("4. Thi công sàn Mái")],

  // Phase II -> III (2. Thi công sàn lầu 1 = việc đầu tiên theo ngày của phase III)
  [[M("4. Thi công sàn Mái")], M("2. Thi công sàn lầu 1")],
  [[M("4. Thi công sàn Mái")], T("2.1. Xây tường lầu 01 - lầu 02")],

  // Chuỗi "Xây tường" leo tầng (lầu1 -> lầu2 -> sân thượng)
  [[T("2.1. Xây tường lầu 01 - lầu 02")], M("3. Thi công sàn lầu 02")],
  [[T("2.1. Xây tường lầu 01 - lầu 02")], T("3.1. Xây tường lầu 02 - sân thượng")],
  [[T("3.1. Xây tường lầu 02 - sân thượng")], M("4. Thi công sàn sân thượng")],
  [[T("3.1. Xây tường lầu 02 - sân thượng")], T("4.1. Xây tường lầu sân thượng - mái")],
  // M&E rough-in bắt đầu cùng lúc với xây tường sân thượng-mái
  [[T("3.1. Xây tường lầu 02 - sân thượng")], M("6. Thi công hệ thống M&E")],
  [[T("3.1. Xây tường lầu 02 - sân thượng")], T("6.1. Thi công hệ thống điện")],
  [[T("3.1. Xây tường lầu 02 - sân thượng")], T("6.2. Thi công hệ thống cấp thoát nước")],

  // Chuỗi "Tô tường" đi sau xây 1 nhịp
  [[T("3.1. Xây tường lầu 02 - sân thượng")], T("2.2. Tô tường lầu 01 - lầu 02")],
  [[T("2.2. Tô tường lầu 01 - lầu 02")], T("3.2. Tô tường lầu 02 - sân thượng")],
  [[T("3.2. Tô tường lầu 02 - sân thượng")], T("4.2. Tô tường lầu sân thượng - mái")],
  [[T("4.2. Tô tường lầu sân thượng - mái")], M("5. Tô vách xông")],

  // Sau Tô vách xông mới quay lại xây/tô tường tầng trệt
  [[M("5. Tô vách xông")], M("1. Thi công tầng trệt")],
  [[M("5. Tô vách xông")], T("1.1. Xây tường trệt - lầu 1")],
  [[T("1.1. Xây tường trệt - lầu 1")], T("1.2. Tô tường trệt - lầu 1")],

  // M&E rough-in xong -> ốp lát gạch
  [[T("6.1. Thi công hệ thống điện"), T("6.2. Thi công hệ thống cấp thoát nước")], M("7. Thi công ốp lát gạch")],
  [[T("6.1. Thi công hệ thống điện"), T("6.2. Thi công hệ thống cấp thoát nước")], T("7.1. Chống thấm sàn mái, ST, WC, Ban công, …")],
  [[T("6.1. Thi công hệ thống điện"), T("6.2. Thi công hệ thống cấp thoát nước")], T("7.2. Cán nền các tầng")],
  [[T("6.1. Thi công hệ thống điện"), T("6.2. Thi công hệ thống cấp thoát nước")], T("7.3. Ốp lát gạch")],

  // Ốp lát gạch xong -> các hạng mục hoàn thiện song song
  [[M("7. Thi công ốp lát gạch")], M("8. Thi công trần thạch cao")],
  [[M("7. Thi công ốp lát gạch")], M("9. Thi công sơn nước")],
  [[M("7. Thi công ốp lát gạch")], M("10. Thi công lắp lang can, đá cầu thang, cửa, …")],
  [[M("7. Thi công ốp lát gạch")], M("11. Hoàn thiện mặt tiền, sân trước sân sau")],

  // Trần thạch cao xong mới lắp thiết bị chiếu sáng
  [[M("8. Thi công trần thạch cao")], T("6.3. Thi công lắp thiết bị chiếu sáng")],

  // Hoàn thiện bàn giao chờ 3 hạng mục cuối
  [[M("9. Thi công sơn nước"), M("10. Thi công lắp lang can, đá cầu thang, cửa, …"), M("11. Hoàn thiện mặt tiền, sân trước sân sau")], M("12. Hoàn thiện bàn giao")],
];

async function findId(project, [type, name]) {
  if (type === "MILESTONE") {
    const m = await prisma.milestone.findFirst({ where: { name, phase: { projectId: project.id } } });
    if (!m) throw new Error(`Không tìm thấy Milestone "${name}"`);
    return m.id;
  }
  const t = await prisma.milestoneTask.findFirst({ where: { name, milestone: { phase: { projectId: project.id } } } });
  if (!t) throw new Error(`Không tìm thấy MilestoneTask "${name}"`);
  return t.id;
}

async function run() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) throw new Error("Không tìm thấy project");
  console.log("Project:", project.id, project.name);

  // Resolve hết ID trước (ngoài transaction) để tránh timeout transaction do quá nhiều query tuần tự
  const rows = [];
  for (const [predecessors, successor] of LINKS) {
    const [succType] = successor;
    const successorId = await findId(project, successor);
    for (const pred of predecessors) {
      const [predType] = pred;
      const predecessorId = await findId(project, pred);
      rows.push({ projectId: project.id, predecessorType: predType, predecessorId, successorType: succType, successorId });
    }
  }
  console.log(`Đã suy ra ${rows.length} quan hệ phụ thuộc từ ${LINKS.length} dòng LINKS.`);

  await prisma.$transaction([
    prisma.taskDependency.deleteMany({ where: { projectId: project.id } }),
    prisma.taskDependency.createMany({ data: rows }),
    ...(isDryRun ? [prisma.$queryRaw`SELECT 1/0`] : []), // buộc lỗi để rollback khi --thu
  ]).catch((e) => {
    if (isDryRun) {
      console.log("--thu: đã rollback, không ghi thật.");
    } else {
      throw e;
    }
  });

  if (!isDryRun) {
    const total = await prisma.taskDependency.count({ where: { projectId: project.id } });
    console.log("Tổng số dependency trong DB:", total);
  }
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

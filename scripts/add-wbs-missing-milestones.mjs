// Thêm công việc con (WBS) hợp lý cho 13 mốc thi công thật (Thiết Thạch) hiện đang trống — do bảng
// PDF gốc chỉ đánh số phụ (X.1, X.2) cho 1 số mốc, các mốc còn lại nhập thẳng không có việc con.
// Không đụng tới mốc "Chuẩn bị khởi công — Cổng kiểm soát" (mốc gate/checklist, không phải WBS thi công).
// Chạy thử (rollback): node scripts/add-wbs-missing-milestones.mjs --thu
// Chạy thật:            node scripts/add-wbs-missing-milestones.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const isDryRun = process.argv.includes("--thu");

const PLAN = [
  { phaseType: "PILING", milestone: "1. Thi công ép cọc, tập kết vật tư, làm láng trại công nhân", tasks: [
    { name: "Tập kết vật tư, thiết bị ép cọc", durationDays: 1 },
    { name: "Ép cọc theo bản vẽ định vị", durationDays: 3 },
    { name: "Làm láng trại công nhân, dọn mặt bằng", durationDays: 1 },
  ]},
  { phaseType: "PILING", milestone: "2. Đào đất", tasks: [
    { name: "Định vị, đào đất hố móng theo bản vẽ", durationDays: 5 },
    { name: "Xử lý nước ngầm/nước mưa đọng (nếu có)", durationDays: 1 },
    { name: "Nghiệm thu đáy hố móng", durationDays: 1 },
  ]},
  { phaseType: "PILING", milestone: "3. Thi công cốp pha, cốt thép, đổ bê tông móng", tasks: [
    { name: "Lắp dựng cốp pha móng", durationDays: 5 },
    { name: "Gia công, lắp đặt cốt thép móng", durationDays: 6 },
    { name: "Đổ bê tông móng", durationDays: 3 },
    { name: "Bảo dưỡng, tháo cốp pha", durationDays: 5 },
  ]},
  { phaseType: "STRUCTURE", milestone: "1. Thi công sàn lầu 01", tasks: [
    { name: "Lắp dựng cốp pha sàn/dầm/cột lầu 1", durationDays: 4 },
    { name: "Gia công, lắp đặt cốt thép", durationDays: 4 },
    { name: "Đổ bê tông sàn/dầm/cột", durationDays: 2 },
    { name: "Bảo dưỡng, tháo cốp pha", durationDays: 2 },
  ]},
  { phaseType: "STRUCTURE", milestone: "2. Thi công sàn lầu 02", tasks: [
    { name: "Lắp dựng cốp pha sàn/dầm/cột lầu 2", durationDays: 4 },
    { name: "Gia công, lắp đặt cốt thép", durationDays: 4 },
    { name: "Đổ bê tông sàn/dầm/cột", durationDays: 2 },
    { name: "Bảo dưỡng, tháo cốp pha", durationDays: 2 },
  ]},
  { phaseType: "STRUCTURE", milestone: "3. Thi công sàn sân thượng", tasks: [
    { name: "Lắp dựng cốp pha sàn sân thượng", durationDays: 4 },
    { name: "Gia công, lắp đặt cốt thép", durationDays: 4 },
    { name: "Đổ bê tông sàn sân thượng", durationDays: 2 },
    { name: "Bảo dưỡng, tháo cốp pha", durationDays: 2 },
  ]},
  { phaseType: "STRUCTURE", milestone: "4. Thi công sàn Mái", tasks: [
    { name: "Lắp dựng cốp pha + cốt thép sàn mái", durationDays: 3 },
    { name: "Đổ bê tông + bảo dưỡng sàn mái", durationDays: 2 },
  ]},
  { phaseType: "FINISHING", milestone: "5. Tô vách xông", tasks: [
    { name: "Xây vách xông", durationDays: 6 },
    { name: "Tô trát vách xông", durationDays: 6 },
    { name: "Xử lý chống thấm/chống ẩm (nếu tiếp giáp ngoài trời)", durationDays: 2 },
  ]},
  { phaseType: "FINISHING", milestone: "8. Thi công trần thạch cao", tasks: [
    { name: "Lắp khung xương trần", durationDays: 3 },
    { name: "Lắp tấm thạch cao, xử lý mối nối", durationDays: 3 },
    { name: "Sơn bả hoàn thiện trần", durationDays: 1 },
  ]},
  { phaseType: "FINISHING", milestone: "9. Thi công sơn nước", tasks: [
    { name: "Bả matit toàn bộ bề mặt", durationDays: 7 },
    { name: "Sơn lót", durationDays: 7 },
    { name: "Sơn phủ hoàn thiện", durationDays: 7 },
  ]},
  { phaseType: "FINISHING", milestone: "10. Thi công lắp lang can, đá cầu thang, cửa, …", tasks: [
    { name: "Lắp đá cầu thang", durationDays: 7 },
    { name: "Lắp lan can", durationDays: 7 },
    { name: "Lắp cửa, cửa sổ", durationDays: 7 },
  ]},
  { phaseType: "FINISHING", milestone: "11. Hoàn thiện mặt tiền, sân trước sân sau", tasks: [
    { name: "Hoàn thiện mặt tiền (sơn/ốp lát ngoại thất)", durationDays: 10 },
    { name: "Hoàn thiện sân trước, sân sau", durationDays: 8 },
    { name: "Lắp đặt cây xanh/tiểu cảnh (nếu có)", durationDays: 3 },
  ]},
  { phaseType: "FINISHING", milestone: "12. Hoàn thiện bàn giao", tasks: [
    { name: "Vệ sinh công nghiệp toàn bộ công trình", durationDays: 4 },
    { name: "Test vận hành điện, nước, thiết bị", durationDays: 3 },
    { name: "Nghiệm thu tổng thể + bàn giao hồ sơ", durationDays: 3 },
  ]},
];

async function run() {
  const project = await prisma.project.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  console.log("Project:", project.id);

  let totalTasks = 0;
  await prisma.$transaction(async (tx) => {
    for (const p of PLAN) {
      const milestone = await tx.milestone.findFirstOrThrow({
        where: { name: p.milestone, phase: { projectId: project.id, type: p.phaseType } },
      });
      const existing = await tx.milestoneTask.count({ where: { milestoneId: milestone.id } });
      if (existing > 0) {
        console.log(`SKIP (đã có ${existing} việc con): ${p.milestone}`);
        continue;
      }
      await tx.milestoneTask.createMany({
        data: p.tasks.map((t, i) => ({ milestoneId: milestone.id, name: t.name, durationDays: t.durationDays, sortOrder: i })),
      });
      totalTasks += p.tasks.length;
      console.log(`+${p.tasks.length} việc con: ${p.milestone}`);
    }
    console.log(`\nTổng cộng thêm ${totalTasks} công việc con.`);
    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (isDryRun) console.log("--thu: đã rollback, không ghi thật.");
    else throw e;
  });
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

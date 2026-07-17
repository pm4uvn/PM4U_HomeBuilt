// Điền "Hạn" (dueDate) cho các việc con WBS vừa thêm ở add-wbs-missing-milestones.mjs — trước đó
// các việc này để dueDate=NULL, Gantt tự suy luận vị trí hiển thị nhưng trang "Việc cần làm" không
// suy luận nên hiện trống (dd/mm/yyyy). Tính hạn = nội suy tuyến tính trong khoảng [mốc trước, mốc
// này] theo tỷ trọng durationDays, giống đúng công thức fallbackDue mà Gantt đang dùng để hiển thị.
// Chạy thử (rollback): node scripts/backfill-wbs-task-due-dates.mjs --thu
// Chạy thật:            node scripts/backfill-wbs-task-due-dates.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const isDryRun = process.argv.includes("--thu");

async function run() {
  const project = await prisma.project.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const phases = await prisma.phase.findMany({
    where: { projectId: project.id },
    include: { milestones: { include: { tasks: true } } },
    orderBy: { sortOrder: "asc" },
  });

  let totalUpdated = 0;
  await prisma.$transaction(async (tx) => {
    for (const phase of phases) {
      const dated = phase.milestones
        .filter((m) => m.plannedDate)
        .sort((a, b) => +new Date(a.plannedDate) - +new Date(b.plannedDate));

      for (let idx = 0; idx < dated.length; idx++) {
        const m = dated[idx];
        const tasksWithoutDue = m.tasks.filter((t) => !t.dueDate);
        if (tasksWithoutDue.length === 0) continue;

        const startIso = idx === 0 ? (phase.plannedStart ?? m.plannedDate) : dated[idx - 1].plannedDate;
        const startMs = +new Date(startIso);
        const endMs = +new Date(m.plannedDate);
        const totalTaskDays = m.tasks.reduce((s, t) => s + t.durationDays, 0);
        if (totalTaskDays === 0) continue;

        let acc = 0;
        for (const t of m.tasks) {
          acc += t.durationDays;
          if (t.dueDate) continue; // giữ nguyên hạn đã có sẵn (từ import PDF thật)
          const dueMs = startMs + (acc / totalTaskDays) * (endMs - startMs);
          const due = new Date(Math.round(dueMs / 86_400_000) * 86_400_000);
          await tx.milestoneTask.update({ where: { id: t.id }, data: { dueDate: due } });
          console.log(`  ${phase.name} > ${m.name} > ${t.name} -> ${due.toISOString().slice(0, 10)}`);
          totalUpdated++;
        }
      }
    }
    console.log(`\nTổng cộng cập nhật hạn cho ${totalUpdated} việc con.`);
    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (isDryRun) console.log("--thu: đã rollback, không ghi thật.");
    else throw e;
  });
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

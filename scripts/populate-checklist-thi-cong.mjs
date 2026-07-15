// Gợi ý checklist nghiệm thu cho các mốc thi công (giai đoạn I/II/III nhập từ nhà thầu Thiết Thạch)
// hiện đang chưa có mục kiểm tra nào (0 checklistItems) — dùng thư viện chuẩn
// src/lib/milestone-checklists.ts (getChecklistForMilestoneName + PHASE3_WALL_CHECKLISTS cho 2 mốc
// trùng tên với giai đoạn II nhưng nội dung là xây/tô tường, không phải đổ bê tông sàn).
//
// Chạy thử (rollback, không ghi thật): npx tsx scripts/populate-checklist-thi-cong.mjs --thu
// Chạy thật:                            npx tsx scripts/populate-checklist-thi-cong.mjs

import { prisma } from "../src/lib/prisma.ts";
import { getChecklistForMilestoneName, PHASE3_WALL_CHECKLISTS } from "../src/lib/milestone-checklists.ts";

const isDryRun = process.argv.includes("--thu");

async function run() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) throw new Error("Không tìm thấy project");

  const milestones = await prisma.milestone.findMany({
    where: {
      phase: { projectId: project.id, type: { in: ["PILING", "STRUCTURE", "FINISHING"] } },
      checklistItems: { none: {} }, // chỉ áp dụng cho mốc CHƯA có checklist nào — không ghi đè mốc đã có sẵn
    },
    include: { phase: true },
    orderBy: [{ phase: { sortOrder: "asc" } }, { plannedDate: "asc" }],
  });

  console.log(`Tìm thấy ${milestones.length} mốc chưa có checklist:`);
  const plan = milestones.map((m) => {
    const items =
      m.phase.type === "FINISHING" && PHASE3_WALL_CHECKLISTS[m.name]
        ? PHASE3_WALL_CHECKLISTS[m.name]
        : getChecklistForMilestoneName(m.name);
    console.log(`- [${m.phase.name}] ${m.name} -> ${items.length} mục`);
    return { milestoneId: m.id, items };
  });

  await prisma.$transaction(async (tx) => {
    let total = 0;
    for (const p of plan) {
      await tx.milestoneChecklistItem.createMany({
        data: p.items.map((label, idx) => ({ milestoneId: p.milestoneId, label, sortOrder: idx })),
      });
      total += p.items.length;
    }
    console.log(`\nĐã tạo ${total} mục checklist cho ${plan.length} mốc.`);
    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (e.message === "DRY_RUN_ROLLBACK") console.log("--thu: đã rollback, không ghi thật.");
    else throw e;
  });
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

/**
 * Bù checklist cho TOÀN BỘ milestone hiện có trong dự án đang thiếu (0 mục) —
 * gọi thẳng getChecklistForMilestoneName() thật (khớp tên chính xác -> khớp mẫu
 * cột/sàn -> khớp nhóm gợi ý theo từ khóa -> fallback tổng quát), nên không milestone
 * nào còn trống hoàn toàn.
 * Chạy: npx tsx scripts/backfill-all-milestone-checklists.ts
 */
import { prisma } from "../src/lib/prisma";
import { getChecklistForMilestoneName } from "../src/lib/milestone-checklists";

async function main() {
  const milestones = await prisma.milestone.findMany({
    where: { checklistItems: { none: {} } },
  });
  console.log(`Tìm thấy ${milestones.length} milestone chưa có checklist.`);

  let created = 0;
  for (const m of milestones) {
    const items = getChecklistForMilestoneName(m.name);
    if (items.length === 0) {
      console.log(`⏭️  Bỏ qua "${m.name}" — không tìm được checklist phù hợp (không nên xảy ra với fallback).`);
      continue;
    }
    await prisma.milestoneChecklistItem.createMany({
      data: items.map((label, idx) => ({ milestoneId: m.id, label, sortOrder: idx })),
    });
    console.log(`✅ ${m.name}: +${items.length} mục`);
    created++;
  }

  console.log(`\nXong — đã bù checklist cho ${created}/${milestones.length} milestone.`);
  await prisma.$disconnect();
}

main();

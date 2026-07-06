/**
 * Verify flow nghiệp vụ end-to-end ở tầng service (không cần HTTP/auth):
 *  1. Hold point 48h chưa hết hạn -> giữ nguyên AWAITING_INSPECTION
 *  2. Nghiệm thu PASS sàn tầng 2 -> đợt 4 tự chuyển DUE với dueDate đúng
 *  3. Giải ngân đợt kế: breakdown + phạt trễ tiến độ ĐÃ trừ gia hạn hợp lệ
 *  4. computeAlerts sinh đủ cảnh báo
 *  5. Khôi phục trạng thái demo ban đầu
 * Chạy: npx tsx scripts/verify-flow.ts
 */
import { prisma } from "../src/lib/prisma";
import { resolveExpiredHoldPoints, recordInspection } from "../src/services/milestone.service";
import { getNextDisbursement, getProjectProgress } from "../src/services/disbursement.service";
import { computeAlerts } from "../src/services/alert.service";
import { getBudgetSummary } from "../src/services/budget.service";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function main() {
const project = await prisma.project.findFirstOrThrow({ where: { name: { contains: "HenryHouse" } } });
const cStructure = await prisma.contract.findFirstOrThrow({ where: { code: "HĐTC-2026-03" } });
const msFloor2 = await prisma.milestone.findFirstOrThrow({ where: { name: "Nghiệm thu sàn tầng 2" } });

// --- 1. Hold point 34h/48h -> chưa auto-approve ---
const resolved = await resolveExpiredHoldPoints(project.id);
const ms1 = await prisma.milestone.findUniqueOrThrow({ where: { id: msFloor2.id } });
check("Hold point 34h/48h KHÔNG bị auto-approve", resolved === 0 && ms1.status === "AWAITING_INSPECTION");

// --- 2. % tiến độ gia quyền ---
const pct = await getProjectProgress(project.id);
check("Tiến độ gia quyền = 49.3% (30% + 35%×55%)", Math.abs(pct - 49.3) < 0.2, `thực tế ${pct}%`);

// --- 3. Ngân sách 2 dòng tiền ---
const budget = await getBudgetSummary(project.id);
check(
  "Đã trả thầu = 1.064 tỷ (194.4tr cọc + 869.6tr thô)",
  budget.contractorPaid === 97_200_000 * 2 + 399_600_000 + 470_000_000,
  `thực tế ${budget.contractorPaid.toLocaleString("vi-VN")}₫`,
);
check("CĐT tự chi = 24tr (gạch sân thượng)", budget.ownerPaid === 24_000_000);
check("Phát sinh đã duyệt = +85tr", budget.approvedVariations === 85_000_000);

// --- 4. Giải ngân đợt kế (đợt 3 DUE) — phạt trễ tiến độ phải = 0 vì gia hạn hợp lệ ---
// Trễ thô 10 ngày (24/06 -> 04/07) nhưng gia hạn = 6 ngày mưa + 8 ngày VO đã duyệt = 14 > 10
const dis1 = await getNextDisbursement(cStructure.id);
check("Đợt kế tiếp là Đợt 3 (Đổ sàn tầng 1), sẵn sàng chi", dis1?.stageNo === 3 && dis1.isReadyToPay === true);
check(
  "Phạt trễ tiến độ = 0 (trễ 10 ngày < 14 ngày gia hạn hợp lệ)",
  dis1?.breakdown.lateProgressPenalty === "0",
  `thực tế ${dis1?.breakdown.lateProgressPenalty}`,
);
// Đợt 3: 25% × 1.85 tỷ = 462.5tr + VAT 8% (37tr) − retention 5% (23.125tr) = 476.375tr
check(
  "Net đợt 3 = 476.375.000₫ (gốc + VAT − retention)",
  dis1?.netPayable === "476375000",
  `thực tế ${dis1?.netPayable}`,
);

// --- 5. Nghiệm thu PASS sàn tầng 2 -> đợt 4 chuyển DUE ---
await recordInspection({ milestoneId: msFloor2.id, method: "APP_CONFIRM", result: "PASS", notes: "[verify-flow] test" });
const stage4 = await prisma.paymentStage.findFirstOrThrow({
  where: { contractId: cStructure.id, stageNo: 4 },
});
const dueInDays = stage4.dueDate ? Math.round((stage4.dueDate.getTime() - Date.now()) / 86_400_000) : -1;
check(
  "Nghiệm thu PASS -> Đợt 4 tự chuyển DUE, hạn +3 ngày",
  stage4.status === "DUE" && dueInDays === 3,
  `status=${stage4.status}, dueDate sau ${dueInDays} ngày`,
);

// --- 6. Alerts ---
const alerts = await computeAlerts(project.id);
const types = alerts.map((a) => a.type);
check("Alert: thanh toán tới hạn (đợt 3 + đợt 4)", types.filter((t) => t === "PAYMENT_DUE").length >= 2);
check("Alert: phạt chờ việc đang chạy (4tr/ngày)", types.includes("IDLE_PENALTY_RUNNING"));
check("Alert: cọc dư so với ép thử", types.includes("PILE_VARIANCE"));

// --- 7. KHÔI PHỤC trạng thái demo ---
await prisma.inspectionRecord.deleteMany({ where: { milestoneId: msFloor2.id, notes: "[verify-flow] test" } });
await prisma.milestone.update({
  where: { id: msFloor2.id },
  data: { status: "AWAITING_INSPECTION" },
});
await prisma.paymentStage.update({
  where: { id: stage4.id },
  data: { status: "UPCOMING", dueDate: null },
});
await computeAlerts(project.id); // tính lại alerts theo trạng thái đã khôi phục
console.log("↩️  Đã khôi phục trạng thái demo (sàn T2 chờ nghiệm thu, đợt 4 UPCOMING)");

console.log(failures === 0 ? "\n🎉 TẤT CẢ PASS" : `\n💥 ${failures} kiểm tra FAIL`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
}

main();

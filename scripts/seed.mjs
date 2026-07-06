// Seed dữ liệu mẫu thực tế cho HomeBuild PM — dự án "HenryHouse"
// Chạy: node scripts/seed.mjs   (thêm --force để xóa dữ liệu cũ và seed lại)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = new Date();
const d = (iso) => new Date(iso);
const ago = (days) => new Date(now.getTime() - days * DAY);
const ahead = (days) => new Date(now.getTime() + days * DAY);
// Ngày (không giờ) neo 12:00 UTC để cột DATE không bị lệch múi giờ
const dateOnly = (offsetDays) => {
  const t = new Date(now.getTime() - offsetDays * DAY);
  t.setUTCHours(12, 0, 0, 0);
  return t;
};

const existing = await prisma.project.findFirst({ where: { name: { contains: "HenryHouse" } } });
if (existing) {
  if (!process.argv.includes("--force")) {
    console.log("⏭️  Dự án HenryHouse đã tồn tại. Chạy với --force để xóa và seed lại.");
    process.exit(0);
  }
  console.log("🗑️  Xóa dữ liệu cũ...");
  const pid = existing.id;
  // Xóa theo thứ tự phụ thuộc FK
  await prisma.$transaction([
    prisma.alert.deleteMany({ where: { projectId: pid } }),
    prisma.document.deleteMany({ where: { projectId: pid } }),
    prisma.pileItem.deleteMany({ where: { pilingRecord: { projectId: pid } } }),
    prisma.pilingRecord.deleteMany({ where: { projectId: pid } }),
    prisma.idleWaitLog.deleteMany({ where: { contract: { projectId: pid } } }),
    prisma.neighborSurvey.deleteMany({ where: { projectId: pid } }),
    prisma.riskLog.deleteMany({ where: { projectId: pid } }),
    prisma.dailyLog.deleteMany({ where: { projectId: pid } }),
    prisma.inspectionRecord.deleteMany({ where: { milestone: { phase: { projectId: pid } } } }),
    prisma.paymentStage.deleteMany({ where: { contract: { projectId: pid } } }),
    prisma.milestone.deleteMany({ where: { phase: { projectId: pid } } }),
    prisma.phase.deleteMany({ where: { projectId: pid } }),
    prisma.variation.deleteMany({ where: { contract: { projectId: pid } } }),
    prisma.discount.deleteMany({ where: { contract: { projectId: pid } } }),
    prisma.penaltyEvent.deleteMany({ where: { contractId: { in: (await prisma.contract.findMany({ where: { projectId: pid } })).map((c) => c.id) } } }),
    prisma.penaltyRule.deleteMany({ where: { contract: { projectId: pid } } }),
    prisma.ownerPurchaseItem.deleteMany({ where: { projectId: pid } }),
    prisma.contract.deleteMany({ where: { projectId: pid } }),
    prisma.vendor.deleteMany({ where: { projectId: pid } }),
    prisma.project.delete({ where: { id: pid } }),
  ]);
}

console.log("🌱 Seeding...");

// ===== User + Project =====
const owner = await prisma.user.upsert({
  where: { email: "pm4u.vn@gmail.com" },
  create: { email: "pm4u.vn@gmail.com", fullName: "Henry", role: "OWNER" },
  update: {},
});

const project = await prisma.project.create({
  data: {
    ownerId: owner.id,
    name: "HenryHouse — Nhà phố 1 trệt 3 lầu",
    address: "Quận 7, TP.HCM",
    landArea: 80,
    grossFloorArea: 285,
    budgetPlanned: 3_500_000_000,
    status: "UNDER_CONSTRUCTION",
  },
});

// ===== Vendors =====
const [vDesign, vPiling] = await Promise.all([
  prisma.vendor.create({
    data: { projectId: project.id, type: "DESIGN", name: "Thiết Thạch", contactName: "KTS phụ trách", phone: "0901xxxxxx" },
  }),
  prisma.vendor.create({
    data: { projectId: project.id, type: "PILING", name: "Tiến Lộc", contactName: "Đội trưởng ép cọc", phone: "0902xxxxxx" },
  }),
]);
const vStructure = await prisma.vendor.create({
  data: { projectId: project.id, type: "STRUCTURE", name: "Thiết Thạch (Xây dựng)", contactName: "Chỉ huy trưởng", phone: "0903xxxxxx" },
});

// ===== Phases (tổng weight = 100) =====
const phaseData = [
  { type: "TENDERING",        name: "Tìm thầu",           weight: 3,  s: "2026-01-05", e: "2026-01-20", pct: 100 },
  { type: "DESIGN_CONCEPT",   name: "Thiết kế concept",   weight: 5,  s: "2026-01-15", e: "2026-02-10", pct: 100 },
  { type: "DESIGN_TECHNICAL", name: "Thiết kế kỹ thuật",  weight: 7,  s: "2026-02-10", e: "2026-03-05", pct: 100 },
  { type: "PERMIT",           name: "Xin phép XD",        weight: 5,  s: "2026-03-01", e: "2026-03-31", pct: 100 },
  { type: "PILING",           name: "Ép cọc",             weight: 10, s: "2026-04-01", e: "2026-04-15", pct: 100 },
  { type: "STRUCTURE",        name: "Thi công thô",       weight: 35, s: "2026-04-16", e: "2026-06-24", pct: 55 },
  { type: "FINISHING",        name: "Hoàn thiện",         weight: 25, s: "2026-06-25", e: "2026-08-31", pct: 0 },
  { type: "INTERIOR_INSTALL", name: "Lắp đặt nội thất",   weight: 7,  s: "2026-09-01", e: "2026-09-25", pct: 0 },
  { type: "AS_BUILT",         name: "Hoàn công",          weight: 3,  s: "2026-09-26", e: "2026-10-15", pct: 0 },
];
const phases = {};
for (let i = 0; i < phaseData.length; i++) {
  const p = phaseData[i];
  phases[p.type] = await prisma.phase.create({
    data: {
      projectId: project.id, type: p.type, name: p.name, sortOrder: i + 1,
      weight: p.weight, plannedStart: d(p.s), plannedEnd: d(p.e),
      progressPct: p.pct,
      actualStart: p.pct > 0 ? d(p.s) : null,
      actualEnd: p.pct >= 100 ? d(p.e) : null,
    },
  });
}

// ===== Milestones (Hold Points) =====
const msPiling = await prisma.milestone.create({
  data: { phaseId: phases.PILING.id, name: "Nghiệm thu cọc ép đại trà", isHoldPoint: true, status: "APPROVED" },
});
const msFoundation = await prisma.milestone.create({
  data: { phaseId: phases.STRUCTURE.id, name: "Nghiệm thu móng", isHoldPoint: true, status: "APPROVED", requestedAt: d("2026-05-10") },
});
const msFloor1 = await prisma.milestone.create({
  data: { phaseId: phases.STRUCTURE.id, name: "Nghiệm thu sàn tầng 1", isHoldPoint: true, status: "APPROVED", requestedAt: d("2026-06-28") },
});
// Đang chờ CĐT xác nhận — còn 14h là auto-approve (điều khoản 48h)
const msFloor2 = await prisma.milestone.create({
  data: {
    phaseId: phases.STRUCTURE.id, name: "Nghiệm thu sàn tầng 2", isHoldPoint: true,
    status: "AWAITING_INSPECTION", requestedAt: new Date(now.getTime() - 34 * HOUR),
  },
});
const msHandover = await prisma.milestone.create({
  data: { phaseId: phases.AS_BUILT.id, name: "Nghiệm thu bàn giao công trình", isHoldPoint: true, status: "PENDING" },
});

// Biên bản nghiệm thu đã có
await prisma.inspectionRecord.createMany({
  data: [
    { milestoneId: msPiling.id, method: "SITE_MINUTES", result: "PASS", confirmedAt: d("2026-04-15"), notes: "Đủ 12/12 cọc, có nhật ký ép từng cây" },
    { milestoneId: msFoundation.id, method: "ZALO_CONFIRM", result: "PASS", confirmedAt: d("2026-05-11") },
    { milestoneId: msFloor1.id, method: "APP_CONFIRM", result: "PASS_WITH_NOTES", confirmedAt: d("2026-06-29"), notes: "Bề mặt sàn khu WC hơi rỗ, thầu đã xử lý" },
  ],
});

// ===== Contracts =====
// 1) HĐ thiết kế — miễn 100% phí nếu ký HĐ thi công
const cDesign = await prisma.contract.create({
  data: {
    projectId: project.id, vendorId: vDesign.id,
    code: "HĐTK-2026-01", title: "Thiết kế kiến trúc + kết cấu + M&E",
    contractValue: 120_000_000, vatRate: 8, retentionPct: 0,
    signedDate: d("2026-01-18"), startDate: d("2026-01-20"), plannedEndDate: d("2026-03-05"),
    actualEndDate: d("2026-03-05"), status: "COMPLETED",
  },
});

// 2) HĐ ép cọc — Tiến Lộc, phạt chờ việc 4tr/ngày
const cPiling = await prisma.contract.create({
  data: {
    projectId: project.id, vendorId: vPiling.id,
    code: "HĐEC-2026-02", title: "Ép cọc bê tông ly tâm D300",
    contractValue: 180_000_000, vatRate: 8, retentionPct: 0,
    signedDate: d("2026-03-25"), startDate: d("2026-04-01"), plannedEndDate: d("2026-04-15"),
    actualEndDate: d("2026-04-15"), status: "COMPLETED",
  },
});

// 3) HĐ thi công thô — Thiết Thạch
const cStructure = await prisma.contract.create({
  data: {
    projectId: project.id, vendorId: vStructure.id,
    code: "HĐTC-2026-03", title: "Thi công phần thô + nhân công hoàn thiện",
    contractValue: 1_850_000_000, vatRate: 8, retentionPct: 5,
    signedDate: d("2026-04-10"), startDate: d("2026-04-16"), plannedEndDate: d("2026-06-24"),
    status: "IN_PROGRESS",
  },
});

// Giảm trừ: miễn 100% phí thiết kế vì đã ký HĐ thi công
await prisma.discount.create({
  data: {
    contractId: cDesign.id, type: "DESIGN_FEE_WAIVER", percent: 100,
    conditionContractId: cStructure.id,
    description: "Miễn 100% phí thiết kế khi ký HĐ thi công trọn gói",
  },
});

// Điều khoản phạt (đúng số liệu HĐ thực tế VN)
await prisma.penaltyRule.createMany({
  data: [
    { contractId: cStructure.id, type: "CONTRACTOR_LATE_PROGRESS", basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.05, capPct: 8 },
    { contractId: cStructure.id, type: "OWNER_LATE_PAYMENT", basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.5, capPct: 8 },
    { contractId: cStructure.id, type: "TERMINATION", basis: "PCT_OF_CONTRACT", rate: 8 },
    { contractId: cStructure.id, type: "FAKE_MATERIAL", basis: "PCT_OF_ITEM_VALUE", rate: 8 },
    { contractId: cPiling.id, type: "OWNER_IDLE_WAIT", basis: "FIXED_PER_DAY", rate: 4_000_000 },
    { contractId: cPiling.id, type: "CONTRACTOR_LATE_PROGRESS", basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.05, capPct: 8 },
  ],
});

// ===== Đợt thanh toán =====
await prisma.paymentStage.createMany({
  data: [
    // HĐ thiết kế: 2 đợt, đã trả (sau miễn phí thì thực trả 0đ — ghi nhận tượng trưng)
    { contractId: cDesign.id, stageNo: 1, name: "Tạm ứng ký HĐ", percent: 50, status: "PAID", paidDate: d("2026-01-18"), paidAmount: 0 },
    { contractId: cDesign.id, stageNo: 2, name: "Bàn giao hồ sơ thiết kế", percent: 50, status: "PAID", paidDate: d("2026-03-05"), paidAmount: 0, isFinal: true },
    // HĐ ép cọc
    { contractId: cPiling.id, stageNo: 1, name: "Ký HĐ + tập kết máy", percent: 50, status: "PAID", paidDate: d("2026-04-01"), paidAmount: 97_200_000 },
    { contractId: cPiling.id, stageNo: 2, name: "Nghiệm thu cọc đại trà", percent: 50, triggerMilestoneId: msPiling.id, status: "PAID", paidDate: d("2026-04-18"), paidAmount: 97_200_000, isFinal: true },
    // HĐ thô: 5 đợt
    { contractId: cStructure.id, stageNo: 1, name: "Ký HĐ", percent: 20, status: "PAID", paidDate: d("2026-04-16"), paidAmount: 399_600_000 },
    { contractId: cStructure.id, stageNo: 2, name: "Xong móng", percent: 25, triggerMilestoneId: msFoundation.id, status: "PAID", paidDate: d("2026-05-14"), paidAmount: 470_000_000 },
    { contractId: cStructure.id, stageNo: 3, name: "Đổ sàn tầng 1", percent: 25, triggerMilestoneId: msFloor1.id, status: "DUE", dueDate: ahead(4) },
    { contractId: cStructure.id, stageNo: 4, name: "Đổ sàn tầng 2 + mái", percent: 20, triggerMilestoneId: msFloor2.id, status: "UPCOMING" },
    { contractId: cStructure.id, stageNo: 5, name: "Nghiệm thu bàn giao + quyết toán", percent: 10, triggerMilestoneId: msHandover.id, status: "UPCOMING", isFinal: true },
  ],
});

// ===== Phát sinh =====
await prisma.variation.createMany({
  data: [
    { contractId: cStructure.id, code: "VO-001", title: "Xử lý móng cũ nhà hàng xóm lấn sang", reason: "SITE_CONDITION", costDelta: 45_000_000, timeExtensionDays: 5, status: "APPROVED", submittedAt: d("2026-05-02"), approvedAt: d("2026-05-04") },
    { contractId: cStructure.id, code: "VO-002", title: "Nâng chiều cao tầng trệt 3.6m → 3.9m", reason: "DESIGN_CHANGE", costDelta: 40_000_000, timeExtensionDays: 3, status: "APPROVED", submittedAt: d("2026-05-20"), approvedAt: d("2026-05-22") },
    { contractId: cStructure.id, code: "VO-003", title: "Nâng cấp gạch 60x60 lên 80x80 khu khách", reason: "MATERIAL_UPGRADE", costDelta: 28_000_000, status: "SUBMITTED", submittedAt: ago(2) },
  ],
});

// ===== Hạng mục CĐT tự mua =====
await prisma.ownerPurchaseItem.createMany({
  data: [
    { projectId: project.id, category: "TILES", name: "Gạch ốp lát toàn nhà (Đồng Tâm)", plannedCost: 95_000_000, neededByDate: ahead(11), status: "PLANNED" },
    { projectId: project.id, category: "SANITARY_WARE", name: "Thiết bị vệ sinh TOTO (3 WC)", plannedCost: 80_000_000, neededByDate: ahead(18), status: "ORDERED", supplierName: "Showroom TOTO Q.7" },
    { projectId: project.id, category: "APPLIANCES", name: "Điện máy: máy lạnh, bếp từ, máy nước nóng", plannedCost: 120_000_000, neededByDate: ahead(55), status: "PLANNED" },
    { projectId: project.id, category: "LOOSE_FURNITURE", name: "Nội thất rời: sofa, bàn ăn, giường", plannedCost: 150_000_000, neededByDate: ahead(75), status: "PLANNED" },
    { projectId: project.id, category: "TILES", name: "Gạch sân thượng chống nóng", plannedCost: 25_000_000, actualCost: 24_000_000, status: "INSTALLED", deliveredAt: ago(20) },
  ],
});

// ===== Nhật ký công trình (5 ngày mưa hợp lệ + hôm nay) =====
await prisma.dailyLog.createMany({
  data: [
    { projectId: project.id, logDate: d("2026-05-28"), weather: "HEAVY_RAIN", rainHours: 6, isForceMajeure: true, workerCount: 0, workDescription: "Mưa lớn cả ngày, ngưng thi công" },
    { projectId: project.id, logDate: d("2026-06-02"), weather: "STORM", rainHours: 8, isForceMajeure: true, workerCount: 0, workDescription: "Áp thấp nhiệt đới, che chắn công trình" },
    { projectId: project.id, logDate: d("2026-06-10"), weather: "HEAVY_RAIN", rainHours: 5, isForceMajeure: true, workerCount: 2, workDescription: "Mưa lớn, chỉ làm việc trong nhà" },
    { projectId: project.id, logDate: d("2026-06-18"), weather: "HEAVY_RAIN", rainHours: 7, isForceMajeure: true, workerCount: 0 },
    { projectId: project.id, logDate: d("2026-06-27"), weather: "HEAVY_RAIN", rainHours: 4.5, isForceMajeure: true, workerCount: 3 },
    { projectId: project.id, logDate: dateOnly(1), weather: "CLOUDY", workerCount: 9, workDescription: "Xây tường tầng 2, đi ống điện âm" },
    { projectId: project.id, logDate: dateOnly(0), weather: "HEAVY_RAIN", rainHours: 3.5, isForceMajeure: true, workerCount: 8, workDescription: "Đổ bê tông cột tầng 3 buổi sáng, chiều mưa ngưng" },
  ],
});

// ===== Rủi ro =====
const riskNeighbor = await prisma.riskLog.create({
  data: {
    projectId: project.id, category: "NEIGHBOR_SETTLEMENT_CRACK",
    title: "Nguy cơ lún nứt 3 nhà liền kề khi ép cọc",
    description: "Đã khảo sát hiện trạng + chụp ảnh/video trước khi ép cọc. Nhà bên trái có vết nứt sẵn.",
    severity: "HIGH", status: "MONITORING",
    mitigationPlan: "Ép cọc bằng robot tải nhỏ, quan trắc lún tuần/lần trong khi ép",
  },
});
await prisma.riskLog.createMany({
  data: [
    {
      projectId: project.id, category: "UNDERGROUND_OBSTACLE",
      title: "Đụng móng cũ nhà hàng xóm khi đào móng",
      description: "Phát hiện móng đá chẻ cũ lấn 40cm sang đất nhà mình.",
      severity: "MEDIUM", status: "CLOSED",
      estimatedCostImpact: 50_000_000, actualCostImpact: 45_000_000,
      mitigationPlan: "Đục bỏ phần lấn, xử lý bằng VO-001", closedAt: d("2026-05-06"),
    },
    {
      projectId: project.id, category: "PILE_QUANTITY_VARIANCE",
      title: "Cọc đại trà ngắn hơn cọc ép thử ~2.8m/cây",
      description: "Cọc thử sâu 18m nhưng đại trà trung bình chỉ 15.2m — dư ~34m cọc đã đúc.",
      severity: "HIGH", status: "OPEN",
      estimatedCostImpact: 12_000_000,
      mitigationPlan: "Đối soát nhật ký ép từng cây, chốt phương án trả cọc dư với Tiến Lộc",
    },
    {
      projectId: project.id, category: "OWNER_CAUSED_IDLE",
      title: "Máy ép cọc chờ việc do chưa dọn xong mặt bằng",
      severity: "CRITICAL", status: "OPEN",
      description: "Dàn máy Tiến Lộc tập kết đúng hẹn nhưng mặt bằng còn xà bần chưa dọn.",
    },
  ],
});

// ===== Khảo sát nhà lân cận =====
await prisma.neighborSurvey.createMany({
  data: [
    { projectId: project.id, neighborAddress: "Nhà bên trái (số 12A)", neighborName: "Cô Sáu", neighborPhone: "090xxxxxxx", surveyDate: d("2026-03-28"), hasExistingCracks: true, notes: "Vết nứt tường bếp dài 30cm có sẵn — đã quay video 2 phút" },
    { projectId: project.id, neighborAddress: "Nhà bên phải (số 12C)", surveyDate: d("2026-03-28"), hasExistingCracks: false },
    { projectId: project.id, neighborAddress: "Nhà phía sau (hẻm 5)", surveyDate: d("2026-03-29"), hasExistingCracks: false, notes: "Nhà cấp 4 cũ, chủ nhà yêu cầu báo trước khi ép cọc" },
  ],
});

// ===== Phạt chờ việc đang chạy (bắt đầu hôm qua, 4tr/ngày) =====
await prisma.idleWaitLog.create({
  data: {
    contractId: cPiling.id,
    cause: "SITE_NOT_CLEARED", startDate: ago(1), dailyPenalty: 4_000_000,
    note: "Dàn máy ép cọc đứng chờ — CĐT chưa dọn xong xà bần mặt bằng",
  },
});

// ===== Đối soát cọc =====
const piling = await prisma.pilingRecord.create({
  data: {
    projectId: project.id, testPileCount: 2, testPileAvgDepth: 18,
    designPileLength: 18, unitPricePerMeter: 250_000, returnFreightFee: 3_500_000,
  },
});
const depths = [15.0, 15.5, 15.2, 14.8, 15.6, 15.1, 15.3, 14.9, 15.4, 15.0, 15.2, 15.3];
await prisma.pileItem.createMany({
  data: depths.map((depth, i) => ({
    pilingRecordId: piling.id, pileNo: i + 1, plannedLength: 18,
    actualDepth: depth, cutOffLength: Math.round((18 - depth) * 10) / 10,
    pressedAt: new Date(d("2026-04-03").getTime() + Math.floor(i / 2) * DAY),
  })),
});

// ===== Hồ sơ (metadata mẫu — file thật upload qua app) =====
await prisma.document.createMany({
  data: [
    { projectId: project.id, docType: "PERMIT_DRAWING", title: "Bản vẽ xin phép XD (đã duyệt)", fileUrl: "seed/placeholder-permit.pdf", tags: ["xin phép", "2026"], meta: { cotNen: 0.45, khoangLui: 2.4, dienTichSan: 285, tum: true } },
    { projectId: project.id, docType: "SURVEY_MEDIA", title: "Video hiện trạng nhà cô Sáu (trước ép cọc)", fileUrl: "seed/placeholder-survey.mp4", tags: ["khảo sát", "nhà bên trái"] },
    { projectId: project.id, docType: "INSPECTION_MINUTES", title: "Biên bản nghiệm thu móng 11/05", fileUrl: "seed/placeholder-bienban.pdf", tags: ["móng"], contractId: cStructure.id },
  ],
});

const count = await prisma.project.count();
console.log(`✅ Seed xong! Dự án: ${project.name}`);
console.log(`   Đăng nhập app và xem Dashboard. (Tổng ${count} dự án trong CSDL)`);
await prisma.$disconnect();

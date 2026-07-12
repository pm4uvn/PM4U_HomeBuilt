"use server";

/* Server Actions — Module 3: Tiến độ & Nghiệm thu */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requestInspection, recordInspection } from "@/services/milestone.service";
import {
  STANDARD_MILESTONES, buildStructureMilestones, spreadDates,
  PRE_CONSTRUCTION_GATE_NAME, PILING_GATE_NAME,
} from "@/lib/standard-milestones";
import { getChecklistForMilestoneName } from "@/lib/milestone-checklists";
import { getTasksForMilestoneName } from "@/lib/milestone-tasks";
import { uploadToStorage, removeFromStorage } from "@/lib/storage";
import type { PhaseType, InspectionMethod, InspectionResult, Weather } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);

function revalidate() {
  revalidatePath("/schedule");
  revalidatePath("/schedule/daily-log");
  revalidatePath("/schedule/todo");
  revalidatePath("/");
}

const DAY = 86_400_000;

/** Khung 9 giai đoạn chuẩn + tỷ trọng + thời lượng ước tính (ngày), tổng weight = 100 */
const FULL_SCHEDULE_PLAN: { type: PhaseType; name: string; weight: number; days: number }[] = [
  { type: "TENDERING", name: "Tìm thầu", weight: 3, days: 15 },
  { type: "DESIGN_CONCEPT", name: "Thiết kế concept", weight: 5, days: 20 },
  { type: "DESIGN_TECHNICAL", name: "Thiết kế kỹ thuật", weight: 7, days: 25 },
  { type: "PERMIT", name: "Xin phép XD", weight: 5, days: 30 },
  { type: "PILING", name: "Ép cọc", weight: 10, days: 10 },
  { type: "STRUCTURE", name: "Thi công thô", weight: 35, days: 0 }, // days tính động theo số tầng
  { type: "FINISHING", name: "Hoàn thiện", weight: 25, days: 0 }, // days tính động theo số tầng
  { type: "INTERIOR_INSTALL", name: "Lắp đặt nội thất", weight: 7, days: 20 },
  { type: "AS_BUILT", name: "Hoàn công", weight: 3, days: 15 },
];

/**
 * Tạo toàn bộ 9 giai đoạn chuẩn kèm milestone nghiệm thu chuẩn cho từng giai đoạn —
 * dựng cả bộ khung tiến độ chỉ trong 1 lần bấm, thay vì tạo từng giai đoạn rồi bấm
 * "Tạo mốc chuẩn" nhiều lần. Chỉ chạy được khi dự án CHƯA có giai đoạn nào.
 */
export async function createFullSchedule(projectId: string, fd: FormData) {
  await requireUser();
  const existingCount = await prisma.phase.count({ where: { projectId } });
  if (existingCount > 0) {
    throw new Error("Dự án đã có giai đoạn — chỉ tạo đầy đủ được khi chưa có giai đoạn nào.");
  }

  // "Ngày khởi công" = ngày động thổ/ép cọc — Tìm thầu/Thiết kế/Xin phép phải XONG TRƯỚC đó,
  // nên tính lùi về trước cho các giai đoạn trước Ép cọc, và tính tới sau ép cọc trở đi.
  const groundbreakingDate = dateOrNull(fd, "startDate") ?? new Date();
  const floors = Math.max(0, Number(str(fd, "floors") || 0));
  const hasTum = fd.get("hasTum") === "on";
  // Thi công thô: móng+giằng ~25 ngày, mỗi sàn (kể cả trệt) ~2 tuần theo thông lệ hợp đồng,
  // tum +10 ngày (kết cấu nhỏ), mái ~14 ngày
  const floorCount = floors + 1; // + tầng trệt
  const structureDays = 25 + floorCount * 14 + (hasTum ? 10 : 0) + 14;
  // Hoàn thiện (ốp lát, sơn, điện nước hoàn thiện): cùng nhịp ~2 tuần/tầng như Thô
  const finishingDays = floorCount * 14;
  const daysOf = (p: (typeof FULL_SCHEDULE_PLAN)[number]) =>
    p.type === "STRUCTURE" ? structureDays : p.type === "FINISHING" ? finishingDays : p.days;

  const pilingIndex = FULL_SCHEDULE_PLAN.findIndex((p) => p.type === "PILING");
  const dateRanges: { plannedStart: Date; plannedEnd: Date }[] = new Array(FULL_SCHEDULE_PLAN.length);

  // Ép cọc bắt đầu đúng ngày khởi công, rồi các giai đoạn sau đó nối tiếp về sau
  let cursor = new Date(groundbreakingDate);
  for (let i = pilingIndex; i < FULL_SCHEDULE_PLAN.length; i++) {
    const plannedStart = new Date(cursor);
    const plannedEnd = new Date(cursor.getTime() + daysOf(FULL_SCHEDULE_PLAN[i]) * DAY);
    dateRanges[i] = { plannedStart, plannedEnd };
    cursor = plannedEnd;
  }
  // Tìm thầu/Thiết kế/Xin phép: tính lùi về trước, XONG (plannedEnd) trước ngày khởi công
  cursor = new Date(groundbreakingDate);
  for (let i = pilingIndex - 1; i >= 0; i--) {
    const plannedEnd = new Date(cursor);
    const plannedStart = new Date(cursor.getTime() - daysOf(FULL_SCHEDULE_PLAN[i]) * DAY);
    dateRanges[i] = { plannedStart, plannedEnd };
    cursor = plannedStart;
  }

  for (let i = 0; i < FULL_SCHEDULE_PLAN.length; i++) {
    const p = FULL_SCHEDULE_PLAN[i];
    const phase = await prisma.phase.create({
      data: {
        projectId, type: p.type, name: p.name, sortOrder: i + 1, weight: p.weight,
        plannedStart: dateRanges[i].plannedStart, plannedEnd: dateRanges[i].plannedEnd,
      },
    });

    const templates = p.type === "STRUCTURE" ? buildStructureMilestones(floors, hasTum) : STANDARD_MILESTONES[p.type];
    if (templates && templates.length > 0) {
      const plannedDates = spreadDates(dateRanges[i].plannedStart, dateRanges[i].plannedEnd, templates.length);
      await prisma.milestone.createMany({
        data: templates.map((t, idx) => ({
          phaseId: phase.id, name: t.name, isHoldPoint: t.isHoldPoint, plannedDate: plannedDates[idx],
        })),
      });
      await createChecklistsForPhaseMilestones(phase.id, templates.map((t) => t.name));
    }
  }
  revalidate();
}

/**
 * Xóa toàn bộ Giai đoạn + Milestone + Biên bản nghiệm thu để làm lại từ đầu.
 * Giữ nguyên: Hợp đồng/Đợt thanh toán (chỉ gỡ điều kiện milestone, chuyển về "Chưa tới")
 * và Nhật ký công trình (dữ liệu ghi hằng ngày, độc lập với kế hoạch giai đoạn).
 */
export async function resetSchedule(projectId: string) {
  await requireUser();
  await prisma.$transaction([
    prisma.document.updateMany({
      where: { inspectionRecord: { milestone: { phase: { projectId } } } },
      data: { inspectionRecordId: null },
    }),
    prisma.paymentStage.updateMany({
      where: { triggerMilestone: { phase: { projectId } } },
      data: { triggerMilestoneId: null, status: "UPCOMING", dueDate: null },
    }),
    prisma.inspectionRecord.deleteMany({ where: { milestone: { phase: { projectId } } } }),
    prisma.milestone.deleteMany({ where: { phase: { projectId } } }),
    prisma.phase.deleteMany({ where: { projectId } }),
  ]);
  revalidate();
  revalidatePath("/contracts");
  revalidatePath("/cashflow");
}

export async function createPhase(projectId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.phase.count({ where: { projectId } });
  await prisma.phase.create({
    data: {
      projectId,
      type: str(fd, "type") as PhaseType,
      name: str(fd, "name"),
      sortOrder: count + 1,
      weight: Number(str(fd, "weight") || 10),
      plannedStart: dateOrNull(fd, "plannedStart"),
      plannedEnd: dateOrNull(fd, "plannedEnd"),
    },
  });
  revalidate();
}

/**
 * Stage Gate — chặn đóng giai đoạn (đưa progressPct lên 100) nếu mốc "cổng kiểm soát"
 * tương ứng còn thiếu mục checklist bắt buộc. Chỉ áp dụng cho 2 giai đoạn thuộc module
 * "Kiểm soát khởi công & nền móng": Xin phép XD (chuẩn bị khởi công) và Ép cọc (nền móng).
 */
async function assertStageGatePassed(phaseId: string, progress: number) {
  if (progress < 100) return;
  const phase = await prisma.phase.findUniqueOrThrow({ where: { id: phaseId } });
  const gateName =
    phase.type === "PERMIT" ? PRE_CONSTRUCTION_GATE_NAME : phase.type === "PILING" ? PILING_GATE_NAME : null;
  if (!gateName) return;

  const gate = await prisma.milestone.findFirst({
    where: { phaseId, name: gateName },
    include: { checklistItems: true },
  });
  // Chưa có mốc cổng kiểm soát (dự án cũ tạo trước khi có module này) -> không chặn, tránh khóa cứng dữ liệu có sẵn
  if (!gate) return;

  const missing = gate.checklistItems.filter((c) => !c.isChecked).map((c) => c.label);
  if (missing.length > 0) {
    throw new Error(
      `Chưa thể đóng giai đoạn — còn thiếu ở "${gateName}": ${missing.join(", ")}. Vào mốc này tick đủ checklist trước.`,
    );
  }
}

export async function updatePhase(phaseId: string, fd: FormData) {
  await requireUser();
  const progress = Math.min(100, Math.max(0, Number(str(fd, "progressPct"))));
  await assertStageGatePassed(phaseId, progress);
  await prisma.phase.update({
    where: { id: phaseId },
    data: {
      progressPct: progress,
      plannedStart: dateOrNull(fd, "plannedStart"),
      plannedEnd: dateOrNull(fd, "plannedEnd"),
      actualStart: progress > 0 ? (dateOrNull(fd, "actualStart") ?? undefined) : undefined,
      actualEnd: progress >= 100 ? new Date() : null,
    },
  });
  revalidate();
}

export async function createMilestone(phaseId: string, fd: FormData) {
  await requireUser();
  const milestone = await prisma.milestone.create({
    data: {
      phaseId,
      name: str(fd, "name"),
      isHoldPoint: fd.get("isHoldPoint") === "on",
      plannedDate: dateOrNull(fd, "plannedDate"),
      confirmDeadlineHrs: Number(str(fd, "confirmDeadlineHrs") || 48),
    },
  });
  // Checklist tùy chọn: mỗi dòng 1 đầu việc; nếu bỏ trống thì dùng bộ chuẩn khớp tên (nếu có)
  const customLines = str(fd, "checklist").split("\n").map((l) => l.trim()).filter(Boolean);
  const items = customLines.length > 0 ? customLines : getChecklistForMilestoneName(milestone.name);
  if (items.length > 0) {
    await prisma.milestoneChecklistItem.createMany({
      data: items.map((label, idx) => ({ milestoneId: milestone.id, label, sortOrder: idx })),
    });
  }
  // WBS công việc con: luôn dùng bộ gợi ý khớp tên (hoặc fallback chung) — CĐT sửa/xóa/thêm sau nếu cần
  const tasks = getTasksForMilestoneName(milestone.name);
  if (tasks.length > 0) {
    await prisma.milestoneTask.createMany({
      data: tasks.map((t, idx) => ({
        milestoneId: milestone.id, name: t.name, durationDays: t.durationDays, responsible: t.responsible, sortOrder: idx,
      })),
    });
  }
  revalidate();
}

/** Sửa mốc: đổi tên, ngày dự kiến, cờ Hold Point, hạn xác nhận */
export async function updateMilestone(milestoneId: string, fd: FormData) {
  await requireUser();
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      name: str(fd, "name"),
      isHoldPoint: fd.get("isHoldPoint") === "on",
      plannedDate: dateOrNull(fd, "plannedDate"),
      confirmDeadlineHrs: Number(str(fd, "confirmDeadlineHrs") || 48),
    },
  });
  revalidate();
}

export async function deleteMilestone(milestoneId: string) {
  await requireUser();
  await prisma.$transaction([
    prisma.paymentStage.updateMany({
      where: { triggerMilestoneId: milestoneId },
      data: { triggerMilestoneId: null, status: "UPCOMING", dueDate: null },
    }),
    prisma.document.updateMany({
      where: { inspectionRecord: { milestoneId } },
      data: { inspectionRecordId: null },
    }),
    prisma.inspectionRecord.deleteMany({ where: { milestoneId } }),
    prisma.milestone.delete({ where: { id: milestoneId } }),
  ]);
  revalidate();
}

/**
 * Tạo hàng loạt mốc nghiệm thu chuẩn cho 1 giai đoạn (theo thông lệ thi công nhà ở VN).
 * Bỏ qua mốc trùng tên đã có sẵn để không tạo lặp khi bấm nhiều lần.
 */
export async function createStandardMilestones(
  phaseId: string,
  phaseType: PhaseType,
  floorsAboveGround?: number,
  hasTum?: boolean,
) {
  await requireUser();
  const templates =
    phaseType === "STRUCTURE"
      ? buildStructureMilestones(Math.max(0, floorsAboveGround ?? 0), hasTum ?? false)
      : STANDARD_MILESTONES[phaseType];
  if (!templates || templates.length === 0) {
    throw new Error("Giai đoạn này chưa có bộ mốc chuẩn — hãy thêm thủ công.");
  }

  const [phase, existing] = await Promise.all([
    prisma.phase.findUniqueOrThrow({ where: { id: phaseId } }),
    prisma.milestone.findMany({ where: { phaseId }, select: { name: true } }),
  ]);
  const existingNames = new Set(existing.map((m) => m.name));
  const toCreate = templates.filter((t) => !existingNames.has(t.name));

  if (toCreate.length === 0) {
    revalidate();
    return 0;
  }
  // Rải ngày dự kiến trong khoảng ngày của giai đoạn (nếu giai đoạn đã có kế hoạch ngày)
  const plannedDates =
    phase.plannedStart && phase.plannedEnd
      ? spreadDates(phase.plannedStart, phase.plannedEnd, toCreate.length)
      : [];
  await prisma.milestone.createMany({
    data: toCreate.map((t, idx) => ({
      phaseId, name: t.name, isHoldPoint: t.isHoldPoint, plannedDate: plannedDates[idx] ?? null,
    })),
  });
  await createChecklistsForPhaseMilestones(phaseId, toCreate.map((t) => t.name));
  revalidate();
  return toCreate.length;
}

/** Sinh checklist + WBS công việc chuẩn cho các milestone vừa tạo (khớp theo tên, trong đúng giai đoạn) */
async function createChecklistsForPhaseMilestones(phaseId: string, names: string[]) {
  const created = await prisma.milestone.findMany({
    where: { phaseId, name: { in: names } },
    select: { id: true, name: true },
  });
  const checklistData: { milestoneId: string; label: string; sortOrder: number }[] = [];
  const taskData: { milestoneId: string; name: string; durationDays: number; responsible: string; sortOrder: number }[] = [];
  for (const m of created) {
    getChecklistForMilestoneName(m.name).forEach((label, idx) => checklistData.push({ milestoneId: m.id, label, sortOrder: idx }));
    getTasksForMilestoneName(m.name).forEach((t, idx) =>
      taskData.push({ milestoneId: m.id, name: t.name, durationDays: t.durationDays, responsible: t.responsible, sortOrder: idx }),
    );
  }
  if (checklistData.length > 0) await prisma.milestoneChecklistItem.createMany({ data: checklistData });
  if (taskData.length > 0) await prisma.milestoneTask.createMany({ data: taskData });
}

export async function toggleChecklistItem(itemId: string) {
  await requireUser();
  const item = await prisma.milestoneChecklistItem.findUniqueOrThrow({ where: { id: itemId } });
  await prisma.milestoneChecklistItem.update({
    where: { id: itemId },
    data: { isChecked: !item.isChecked, checkedAt: !item.isChecked ? new Date() : null },
  });
  revalidate();
}

export async function addChecklistItem(milestoneId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.milestoneChecklistItem.count({ where: { milestoneId } });
  await prisma.milestoneChecklistItem.create({
    data: { milestoneId, label: str(fd, "label"), sortOrder: count },
  });
  revalidate();
}

export async function deleteChecklistItem(itemId: string) {
  await requireUser();
  await prisma.milestoneChecklistItem.delete({ where: { id: itemId } });
  revalidate();
}

/**
 * Tick nhanh 1 công việc con trong WBS của milestone — như checklist nhật ký.
 * Đồng bộ luôn percentComplete (0/100) để Gantt chi tiết và Detail Plan luôn khớp nhau —
 * cả 2 tab đọc chung 1 bản ghi MilestoneTask, chỉ cần mọi đường ghi đều cập nhật cả 2 field.
 */
export async function toggleMilestoneTask(taskId: string) {
  await requireUser();
  const task = await prisma.milestoneTask.findUniqueOrThrow({ where: { id: taskId } });
  const willBeDone = !task.isDone;
  await prisma.milestoneTask.update({
    where: { id: taskId },
    data: { isDone: willBeDone, doneAt: willBeDone ? new Date() : null, percentComplete: willBeDone ? 100 : 0 },
  });
  revalidate();
}

export async function addMilestoneTask(milestoneId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.milestoneTask.count({ where: { milestoneId } });
  await prisma.milestoneTask.create({
    data: {
      milestoneId,
      name: str(fd, "name"),
      durationDays: Math.max(1, Number(str(fd, "durationDays") || 1)),
      responsible: str(fd, "responsible") || null,
      sortOrder: count,
    },
  });
  revalidate();
}

export async function deleteMilestoneTask(taskId: string) {
  await requireUser();
  await prisma.milestoneTask.delete({ where: { id: taskId } });
  revalidate();
}

/**
 * Ngày hợp lệ trong khoảng dự án thực tế (1970-2200) — chặn giá trị rác kiểu năm "82926" lọt vào DB.
 * Input type="date" của trình duyệt cho phép gõ tới 6 chữ số năm khi người dùng gõ tay chưa xong,
 * nên mỗi keystroke có thể tạm sinh ra 1 ngày hợp lệ về mặt cú pháp nhưng vô lý về mặt dữ liệu.
 */
function safeDate(iso: string): Date | undefined {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  const year = d.getUTCFullYear();
  if (year < 1970 || year > 2200) return undefined;
  return d;
}

/** Sửa nhanh Hạn/PIC/% của 1 việc WBS ngay trên Gantt chi tiết — click-to-edit, tự lưu */
export async function updateMilestoneTaskFields(
  taskId: string,
  data: { dueDate?: string | null; responsible?: string | null; percentComplete?: number },
) {
  await requireUser();
  const patch: { dueDate?: Date | null; responsible?: string | null; percentComplete?: number; isDone?: boolean; doneAt?: Date | null } = {};
  if (data.dueDate !== undefined) {
    if (!data.dueDate) {
      patch.dueDate = null;
    } else {
      const d = safeDate(data.dueDate);
      if (d) patch.dueDate = d; // ngày rác (ngoài 1970-2200) thì bỏ qua, không ghi đè
    }
  }
  if (data.responsible !== undefined) patch.responsible = data.responsible || null;
  if (data.percentComplete !== undefined) {
    const pct = Math.max(0, Math.min(100, Math.round(data.percentComplete)));
    patch.percentComplete = pct;
    patch.isDone = pct >= 100;
    patch.doneAt = pct >= 100 ? new Date() : null;
  }
  await prisma.milestoneTask.update({ where: { id: taskId }, data: patch });
  revalidate();
}

export async function requestInspectionAction(milestoneId: string) {
  await requireUser();
  await requestInspection(milestoneId);
  revalidate();
}

export async function recordInspectionAction(milestoneId: string, fd: FormData) {
  await requireUser();
  await recordInspection({
    milestoneId,
    method: str(fd, "method") as InspectionMethod,
    result: str(fd, "result") as InspectionResult,
    notes: str(fd, "notes") || undefined,
  });
  revalidate();
  revalidatePath("/contracts");
}

/** Tách các dòng việc trong ngày từ form (mảng itemLabel[] / itemChecked[] / itemDueDate[] / itemMilestoneId[] / itemVatTuId[] / itemWorkType[] / itemDocumentId[] / itemContractId[] / itemPic[] cùng chỉ số) */
function parseDailyLogItems(fd: FormData) {
  const labels = fd.getAll("itemLabel[]").map(String);
  const checked = fd.getAll("itemChecked[]").map(String);
  const dueDates = fd.getAll("itemDueDate[]").map(String);
  const milestoneIds = fd.getAll("itemMilestoneId[]").map(String);
  const vatTuIds = fd.getAll("itemVatTuId[]").map(String);
  const workTypes = fd.getAll("itemWorkType[]").map(String);
  const documentIds = fd.getAll("itemDocumentId[]").map(String);
  const contractIds = fd.getAll("itemContractId[]").map(String);
  const pics = fd.getAll("itemPic[]").map(String);
  return labels
    .map((label, i) => ({
      label: label.trim(),
      isChecked: checked[i] === "true",
      dueDate: dueDates[i] ? new Date(dueDates[i]) : null,
      milestoneId: milestoneIds[i] ? milestoneIds[i] : null,
      vatTuDuAnId: vatTuIds[i] ? BigInt(vatTuIds[i]) : null,
      workType: workTypes[i] ? (workTypes[i] as never) : null,
      documentId: documentIds[i] ? documentIds[i] : null,
      contractId: contractIds[i] ? contractIds[i] : null,
      pic: pics[i]?.trim() || null,
      sortOrder: i,
    }))
    .filter((it) => it.label);
}

export async function createDailyLog(projectId: string, fd: FormData) {
  await requireUser();
  const logDate = dateOrNull(fd, "logDate") ?? new Date(new Date().toDateString());
  const weather = str(fd, "weather") as Weather;
  const milestoneIds = fd.getAll("milestoneIds").map(String).filter(Boolean);
  const vatTuIds = fd.getAll("vatTuIds").map(String).filter(Boolean).map((id) => BigInt(id));
  const items = parseDailyLogItems(fd);

  await prisma.$transaction(async (tx) => {
    const log = await tx.dailyLog.upsert({
      where: { projectId_logDate: { projectId, logDate } },
      create: {
        projectId,
        logDate,
        weather,
        rainHours: str(fd, "rainHours") ? Number(str(fd, "rainHours")) : null,
        // Mưa lớn/bão mặc định đủ điều kiện gia hạn hợp lệ, có thể chỉnh tay
        isForceMajeure:
          fd.get("isForceMajeure") === "on" || ["HEAVY_RAIN", "STORM"].includes(weather),
        workerCount: Number(str(fd, "workerCount") || 0),
        workDescription: str(fd, "workDescription") || null,
        milestones: { connect: milestoneIds.map((id) => ({ id })) },
        vatTuDuAn: { connect: vatTuIds.map((id) => ({ id })) },
      },
      update: {
        weather,
        rainHours: str(fd, "rainHours") ? Number(str(fd, "rainHours")) : null,
        isForceMajeure:
          fd.get("isForceMajeure") === "on" || ["HEAVY_RAIN", "STORM"].includes(weather),
        workerCount: Number(str(fd, "workerCount") || 0),
        workDescription: str(fd, "workDescription") || null,
        // "set" thay hoàn toàn danh sách liên kết cũ bằng lựa chọn mới mỗi lần cập nhật
        milestones: { set: milestoneIds.map((id) => ({ id })) },
        vatTuDuAn: { set: vatTuIds.map((id) => ({ id })) },
      },
    });

    // Danh sách việc trong ngày: thay toàn bộ (xóa cũ, tạo lại từ form) — đơn giản hơn CRUD từng dòng
    await tx.dailyLogItem.deleteMany({ where: { dailyLogId: log.id } });
    if (items.length > 0) {
      await tx.dailyLogItem.createMany({ data: items.map((it) => ({ ...it, dailyLogId: log.id })) });
    }
  });
  revalidate();
}

/** Sửa 1 bản ghi nhật ký đã có (theo id, không theo ngày) — cho phép sửa cả ngày nếu cần */
export async function updateDailyLog(id: string, fd: FormData) {
  await requireUser();
  const logDate = dateOrNull(fd, "logDate") ?? new Date(new Date().toDateString());
  const weather = str(fd, "weather") as Weather;
  const milestoneIds = fd.getAll("milestoneIds").map(String).filter(Boolean);
  const vatTuIds = fd.getAll("vatTuIds").map(String).filter(Boolean).map((id) => BigInt(id));
  const items = parseDailyLogItems(fd);

  await prisma.$transaction(async (tx) => {
    await tx.dailyLog.update({
      where: { id },
      data: {
        logDate,
        weather,
        rainHours: str(fd, "rainHours") ? Number(str(fd, "rainHours")) : null,
        isForceMajeure:
          fd.get("isForceMajeure") === "on" || ["HEAVY_RAIN", "STORM"].includes(weather),
        workerCount: Number(str(fd, "workerCount") || 0),
        workDescription: str(fd, "workDescription") || null,
        milestones: { set: milestoneIds.map((id) => ({ id })) },
        vatTuDuAn: { set: vatTuIds.map((id) => ({ id })) },
      },
    });

    await tx.dailyLogItem.deleteMany({ where: { dailyLogId: id } });
    if (items.length > 0) {
      await tx.dailyLogItem.createMany({ data: items.map((it) => ({ ...it, dailyLogId: id })) });
    }
  });
  revalidate();
}

/** Tick nhanh 1 việc trong nhật ký ngày — khỏi phải mở form Sửa chỉ để đánh dấu xong */
export async function toggleDailyLogItem(id: string, isChecked: boolean) {
  await requireUser();
  await prisma.dailyLogItem.update({ where: { id }, data: { isChecked } });
  revalidate();
}

/** Xóa 1 bản ghi nhật ký công trình */
export async function deleteDailyLog(id: string) {
  await requireUser();
  await prisma.dailyLog.delete({ where: { id } });
  revalidate();
}

export interface UploadPhotosState {
  error?: string;
  ok?: boolean;
}

/** Tải nhiều ảnh hiện trường lên cho 1 ngày nhật ký — bằng chứng tiến độ/chất lượng khi tranh chấp */
export async function uploadDailyLogPhotos(
  dailyLogId: string,
  projectId: string,
  _prev: UploadPhotosState,
  fd: FormData,
): Promise<UploadPhotosState> {
  await requireUser();
  try {
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { error: "Chưa chọn ảnh nào" };
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) return { error: `File "${file.name}" vượt quá 20MB` };
    }

    for (const file of files) {
      const path = await uploadToStorage(file, projectId);
      await prisma.document.create({
        data: {
          projectId,
          docType: "SITE_PHOTO",
          title: file.name,
          fileUrl: path,
          mimeType: file.type || null,
          fileSize: file.size,
          dailyLogId,
        },
      });
    }
    revalidate();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

/** Xóa 1 ảnh hiện trường đã gắn vào nhật ký (xóa cả file trong storage, tránh mồ côi) */
export async function deleteDailyLogPhoto(id: string) {
  await requireUser();
  const doc = await prisma.document.findUniqueOrThrow({ where: { id } });
  await prisma.document.delete({ where: { id } });
  await removeFromStorage(doc.fileUrl);
  revalidate();
}

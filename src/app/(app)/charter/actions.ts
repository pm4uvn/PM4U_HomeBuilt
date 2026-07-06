"use server";

/* Server Actions — Module 0: Khởi tạo (PMP Initiating) — Project Charter + Stakeholder Register */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { VENDOR_TYPE } from "@/lib/labels";
import type { StakeholderLevel } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);
const numOrNull = (fd: FormData, k: string) => (str(fd, k) ? Number(str(fd, k)) : null);
const intOrNull = (fd: FormData, k: string) => (str(fd, k) ? parseInt(str(fd, k), 10) : null);

function revalidate() {
  revalidatePath("/charter");
  revalidatePath("/charter/stakeholders");
}

/**
 * Tạo mới hoặc cập nhật điều lệ dự án (1-1 với Project), kèm diện tích/số tầng (ghi ngược vào
 * Project), bố trí phòng từng tầng và phân bổ ngân sách theo giai đoạn — cả 2 danh sách dùng
 * kiểu "thay toàn bộ": xóa hết dòng cũ rồi tạo lại từ form, đơn giản hơn CRUD từng dòng vì
 * số dòng ít và luôn sửa cả bảng trong 1 lần.
 */
export async function upsertCharter(projectId: string, fd: FormData) {
  await requireUser();

  const data = {
    objective: str(fd, "objective"),
    scopeIncluded: str(fd, "scopeIncluded") || null,
    scopeExcluded: str(fd, "scopeExcluded") || null,
    successCriteria: str(fd, "successCriteria") || null,
    assumptions: str(fd, "assumptions") || null,
    constraints: str(fd, "constraints") || null,
    sponsorName: str(fd, "sponsorName") || null,
    plannedStartDate: dateOrNull(fd, "plannedStartDate"),
    plannedEndDate: dateOrNull(fd, "plannedEndDate"),
    approvedAt: fd.get("approved") === "on" ? new Date() : null,
    floorsAboveGround: intOrNull(fd, "floorsAboveGround"),
    hasBasement: fd.get("hasBasement") === "on",
    hasTum: fd.get("hasTum") === "on",
    finishingStandard: str(fd, "finishingStandard") || null,
  };

  const floorNames = fd.getAll("floorName[]").map(String);
  const floorAreas = fd.getAll("areaSqm[]").map(String);
  const soPhongKhach = fd.getAll("soPhongKhach[]").map(String);
  const soPhongNgu = fd.getAll("soPhongNgu[]").map(String);
  const soWc = fd.getAll("soWc[]").map(String);
  const soBep = fd.getAll("soBep[]").map(String);
  const soPhongTho = fd.getAll("soPhongTho[]").map(String);
  const soBanCong = fd.getAll("soBanCong[]").map(String);
  const ghiChuKhac = fd.getAll("ghiChuKhac[]").map(String);
  const toInt = (v: string) => (v.trim() ? parseInt(v, 10) : 0);
  const floorPlans = floorNames
    .map((floorName, i) => ({
      floorName: floorName.trim(),
      areaSqm: floorAreas[i] ? Number(floorAreas[i]) : null,
      soPhongKhach: toInt(soPhongKhach[i] ?? ""),
      soPhongNgu: toInt(soPhongNgu[i] ?? ""),
      soWc: toInt(soWc[i] ?? ""),
      soBep: toInt(soBep[i] ?? ""),
      soPhongTho: toInt(soPhongTho[i] ?? ""),
      soBanCong: toInt(soBanCong[i] ?? ""),
      ghiChuKhac: (ghiChuKhac[i] ?? "").trim() || null,
      sortOrder: i,
    }))
    .filter((f) => f.floorName);

  const phaseNames = fd.getAll("phaseName[]").map(String);
  const phasePercents = fd.getAll("phasePercent[]").map(String);
  const budgetPhases = phaseNames
    .map((name, i) => ({
      name: name.trim(),
      plannedPercent: phasePercents[i] ? Number(phasePercents[i]) : 0,
      sortOrder: i,
    }))
    .filter((p) => p.name);

  await prisma.$transaction(async (tx) => {
    if (numOrNull(fd, "landArea") != null || numOrNull(fd, "grossFloorArea") != null || numOrNull(fd, "budgetPlanned") != null) {
      await tx.project.update({
        where: { id: projectId },
        data: {
          landArea: numOrNull(fd, "landArea") ?? undefined,
          grossFloorArea: numOrNull(fd, "grossFloorArea") ?? undefined,
          budgetPlanned: numOrNull(fd, "budgetPlanned") ?? undefined,
        },
      });
    }

    const charter = await tx.projectCharter.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });

    await tx.charterFloorPlan.deleteMany({ where: { charterId: charter.id } });
    if (floorPlans.length > 0) {
      await tx.charterFloorPlan.createMany({
        data: floorPlans.map((f) => ({ ...f, charterId: charter.id })),
      });
    }

    await tx.charterBudgetPhase.deleteMany({ where: { charterId: charter.id } });
    if (budgetPhases.length > 0) {
      await tx.charterBudgetPhase.createMany({
        data: budgetPhases.map((p) => ({ ...p, charterId: charter.id })),
      });
    }
  });

  revalidate();
}

/**
 * Nạp nhà thầu/NCC đã có ở module Hợp đồng (Vendor) vào Sổ bên liên quan — khỏi phải gõ tay lại.
 * Một công ty có thể đứng tên nhiều hợp đồng (vd Thiết Thạch vừa làm thiết kế vừa làm thô) nên
 * gộp theo tên công ty trước, ghép các vai trò lại thành 1 dòng thay vì tạo trùng nhiều dòng.
 * Bỏ qua công ty đã có sẵn trong sổ (so theo organization) để chạy lại nhiều lần không bị trùng.
 */
export async function importVendorsAsStakeholders(projectId: string) {
  await requireUser();

  const [vendors, existing] = await Promise.all([
    prisma.vendor.findMany({ where: { projectId } }),
    prisma.stakeholder.findMany({ where: { projectId }, select: { organization: true } }),
  ]);
  const already = new Set(existing.map((s) => s.organization).filter(Boolean));

  const byCompany = new Map<string, { contactName: string | null; phone: string | null; roles: Set<string> }>();
  for (const v of vendors) {
    if (already.has(v.name)) continue;
    const entry = byCompany.get(v.name) ?? { contactName: v.contactName, phone: v.phone, roles: new Set<string>() };
    entry.roles.add(VENDOR_TYPE[v.type] ?? "Nhà thầu");
    if (!entry.contactName) entry.contactName = v.contactName;
    if (!entry.phone) entry.phone = v.phone;
    byCompany.set(v.name, entry);
  }
  const toImport = [...byCompany.entries()];

  if (toImport.length > 0) {
    await prisma.stakeholder.createMany({
      data: toImport.map(([companyName, v]) => ({
        projectId,
        name: v.contactName || companyName,
        role: [...v.roles].join(" + "),
        organization: companyName,
        phone: v.phone,
        influence: "HIGH" as StakeholderLevel,
        interest: "HIGH" as StakeholderLevel,
      })),
    });
  }

  revalidate();
  return toImport.length;
}

/** Thêm 1 bên liên quan vào sổ Stakeholder Register */
export async function createStakeholder(projectId: string, fd: FormData) {
  await requireUser();

  await prisma.stakeholder.create({
    data: {
      projectId,
      name: str(fd, "name"),
      role: str(fd, "role"),
      organization: str(fd, "organization") || null,
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      influence: (str(fd, "influence") || "MEDIUM") as StakeholderLevel,
      interest: (str(fd, "interest") || "MEDIUM") as StakeholderLevel,
      communicationNeed: str(fd, "communicationNeed") || null,
      notes: str(fd, "notes") || null,
    },
  });

  revalidate();
}

/** Sửa thông tin 1 bên liên quan */
export async function updateStakeholder(id: string, fd: FormData) {
  await requireUser();

  await prisma.stakeholder.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      role: str(fd, "role"),
      organization: str(fd, "organization") || null,
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      influence: (str(fd, "influence") || "MEDIUM") as StakeholderLevel,
      interest: (str(fd, "interest") || "MEDIUM") as StakeholderLevel,
      communicationNeed: str(fd, "communicationNeed") || null,
      notes: str(fd, "notes") || null,
    },
  });

  revalidate();
}

/** Xóa 1 bên liên quan khỏi sổ */
export async function deleteStakeholder(id: string) {
  await requireUser();
  await prisma.stakeholder.delete({ where: { id } });
  revalidate();
}

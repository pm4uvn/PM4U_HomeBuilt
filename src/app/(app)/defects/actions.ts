"use server";

/* Server Actions — Defect & Warranty Log: khiếm khuyết bàn giao + theo dõi thời hạn bảo hành */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { DEFECT_STATUS } from "@/lib/labels";
import type { DefectCategory, DefectSeverity, DefectStatus } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const intOrNull = (fd: FormData, k: string) => (str(fd, k) ? parseInt(str(fd, k), 10) : null);
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);

function revalidate() {
  revalidatePath("/defects");
  revalidatePath("/schedule/todo");
  revalidatePath("/");
}

/** warrantyEndAt = warrantyStartAt + warrantyMonths — tính sẵn lúc lưu để dễ truy vấn/cảnh báo, không phải tính lại mỗi lần đọc */
function computeWarrantyEndAt(startAt: Date | null, months: number | null): Date | null {
  if (!startAt || !months) return null;
  const d = new Date(startAt);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function createDefect(projectId: string, fd: FormData) {
  await requireUser();
  const warrantyStartAt = dateOrNull(fd, "warrantyStartAt");
  const warrantyMonths = intOrNull(fd, "warrantyMonths");
  await prisma.defectLog.create({
    data: {
      projectId,
      category: str(fd, "category") as DefectCategory,
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      severity: (str(fd, "severity") || "MEDIUM") as DefectSeverity,
      location: str(fd, "location") || null,
      reportedBy: str(fd, "reportedBy") || null,
      owner: str(fd, "owner") || null,
      reportedDate: dateOrNull(fd, "reportedDate") ?? new Date(),
      dueDate: dateOrNull(fd, "dueDate"),
      contractId: str(fd, "contractId") || null,
      warrantyMonths,
      warrantyStartAt,
      warrantyEndAt: computeWarrantyEndAt(warrantyStartAt, warrantyMonths),
    },
  });
  revalidate();
}

export async function updateDefect(defectId: string, fd: FormData) {
  await requireUser();
  const warrantyStartAt = dateOrNull(fd, "warrantyStartAt");
  const warrantyMonths = intOrNull(fd, "warrantyMonths");
  await prisma.defectLog.update({
    where: { id: defectId },
    data: {
      category: str(fd, "category") as DefectCategory,
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      severity: str(fd, "severity") as DefectSeverity,
      location: str(fd, "location") || null,
      reportedBy: str(fd, "reportedBy") || null,
      owner: str(fd, "owner") || null,
      reportedDate: dateOrNull(fd, "reportedDate") ?? new Date(),
      dueDate: dateOrNull(fd, "dueDate"),
      contractId: str(fd, "contractId") || null,
      warrantyMonths,
      warrantyStartAt,
      warrantyEndAt: computeWarrantyEndAt(warrantyStartAt, warrantyMonths),
      resolution: str(fd, "resolution") || null,
    },
  });
  revalidate();
}

export async function deleteDefect(defectId: string) {
  await requireUser();
  await prisma.defectLog.delete({ where: { id: defectId } });
  revalidate();
}

/** Thêm nhanh 1 khiếm khuyết chỉ với tiêu đề (từ "Việc cần làm") — loại mặc định OTHER, sửa chi tiết sau ở trang Bảo hành */
export async function addDefectQuick(projectId: string, title: string) {
  await requireUser();
  const text = title.trim();
  if (!text) return;
  await prisma.defectLog.create({ data: { projectId, category: "OTHER", title: text } });
  revalidate();
}

export async function updateDefectTitle(defectId: string, title: string) {
  await requireUser();
  const text = title.trim();
  if (!text) return;
  await prisma.defectLog.update({ where: { id: defectId }, data: { title: text } });
  revalidate();
}

export async function updateDefectStatus(defectId: string, status: DefectStatus) {
  const user = await requireUser();
  const defect = await prisma.defectLog.update({
    where: { id: defectId },
    data: { status, resolvedAt: status === "FIXED" || status === "CLOSED" ? new Date() : null },
  });
  await logAudit({
    projectId: defect.projectId,
    actorEmail: user.email,
    action: "DEFECT_STATUS_CHANGED",
    entityType: "DefectLog",
    entityId: defectId,
    summary: `Đổi trạng thái khiếm khuyết "${defect.title}" → ${DEFECT_STATUS[status] ?? status}`,
  });
  revalidate();
}

export async function addDefectAction(defectId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.defectActionItem.count({ where: { defectId } });
  await prisma.defectActionItem.create({
    data: { defectId, label: str(fd, "label"), sortOrder: count },
  });
  revalidate();
}

/** Tick nhanh 1 hành động xử lý — như checklist nhật ký */
export async function toggleDefectAction(id: string, isDone: boolean) {
  await requireUser();
  await prisma.defectActionItem.update({
    where: { id },
    data: { isDone, doneAt: isDone ? new Date() : null },
  });
  revalidate();
}

export async function deleteDefectAction(id: string) {
  await requireUser();
  await prisma.defectActionItem.delete({ where: { id } });
  revalidate();
}

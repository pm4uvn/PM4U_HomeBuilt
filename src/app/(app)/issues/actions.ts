"use server";

/* Server Actions — Issue Log: vấn đề đã xảy ra cần xử lý (khác Risk Log là rủi ro tiềm ẩn) */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ALL_RISK_TEMPLATES } from "@/lib/risk-templates";
import { logAudit } from "@/lib/audit";
import { ISSUE_STATUS } from "@/lib/labels";
import type { IssueCategory, IssueSeverity, IssueStatus } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[.,\s]/g, "");
  return v === "" ? null : Number(v);
};
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);

function revalidate() {
  revalidatePath("/issues");
  revalidatePath("/risks");
  revalidatePath("/schedule/todo");
  revalidatePath("/");
}

const TPL_PREFIX = "tpl::";

/**
 * Dropdown "Liên kết rủi ro" ở Issue Log cho chọn cả mẫu rủi ro chưa thêm vào sổ (không chỉ rủi ro
 * đã tạo sẵn) — value dạng "tpl::<tên mẫu>". Gặp giá trị này thì tạo RiskLog thật từ mẫu trước,
 * rồi mới lấy id thật để liên kết, y hệt nút "+ Thêm vào sổ" ở trang Rủi ro (addRiskFromTemplate).
 */
async function resolveRelatedRiskId(projectId: string, raw: string): Promise<string | null> {
  if (!raw) return null;
  if (!raw.startsWith(TPL_PREFIX)) return raw;
  const title = raw.slice(TPL_PREFIX.length);
  const existing = await prisma.riskLog.findFirst({ where: { projectId, title }, select: { id: true } });
  if (existing) return existing.id;
  const tpl = ALL_RISK_TEMPLATES.find((t) => t.title === title);
  if (!tpl) return null;
  const created = await prisma.riskLog.create({
    data: {
      projectId,
      category: tpl.category,
      title: tpl.title,
      description: tpl.description,
      severity: tpl.severity,
      mitigationActions: { create: tpl.mitigationActions.map((label, i) => ({ label, sortOrder: i })) },
    },
    select: { id: true },
  });
  return created.id;
}

export async function createIssue(projectId: string, fd: FormData) {
  await requireUser();
  const relatedRiskId = await resolveRelatedRiskId(projectId, str(fd, "relatedRiskId"));
  await prisma.issueLog.create({
    data: {
      projectId,
      category: str(fd, "category") as IssueCategory,
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      priority: (str(fd, "priority") || "MEDIUM") as IssueSeverity,
      raisedBy: str(fd, "raisedBy") || null,
      owner: str(fd, "owner") || null,
      raisedDate: dateOrNull(fd, "raisedDate") ?? new Date(),
      dueDate: dateOrNull(fd, "dueDate"),
      costImpact: numOrNull(fd, "costImpact"),
      relatedRiskId,
    },
  });
  revalidate();
}

export async function updateIssue(issueId: string, fd: FormData) {
  await requireUser();
  const issue = await prisma.issueLog.findUniqueOrThrow({ where: { id: issueId }, select: { projectId: true } });
  const relatedRiskId = await resolveRelatedRiskId(issue.projectId, str(fd, "relatedRiskId"));
  await prisma.issueLog.update({
    where: { id: issueId },
    data: {
      category: str(fd, "category") as IssueCategory,
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      priority: str(fd, "priority") as IssueSeverity,
      raisedBy: str(fd, "raisedBy") || null,
      owner: str(fd, "owner") || null,
      raisedDate: dateOrNull(fd, "raisedDate") ?? new Date(),
      dueDate: dateOrNull(fd, "dueDate"),
      costImpact: numOrNull(fd, "costImpact"),
      resolution: str(fd, "resolution") || null,
      relatedRiskId,
    },
  });
  revalidate();
}

export async function deleteIssue(issueId: string) {
  await requireUser();
  await prisma.issueLog.delete({ where: { id: issueId } });
  revalidate();
}

export async function updateIssueStatus(issueId: string, status: IssueStatus) {
  const user = await requireUser();
  const issue = await prisma.issueLog.update({
    where: { id: issueId },
    data: { status, resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null },
  });
  await logAudit({
    projectId: issue.projectId,
    actorEmail: user.email,
    action: "ISSUE_STATUS_CHANGED",
    entityType: "IssueLog",
    entityId: issueId,
    summary: `Đổi trạng thái vấn đề "${issue.title}" → ${ISSUE_STATUS[status] ?? status}`,
  });
  revalidate();
}

export async function addIssueAction(issueId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.issueActionItem.count({ where: { issueId } });
  await prisma.issueActionItem.create({
    data: { issueId, label: str(fd, "label"), sortOrder: count },
  });
  revalidate();
}

/** Tick nhanh 1 hành động xử lý — như checklist nhật ký */
export async function toggleIssueAction(id: string, isDone: boolean) {
  await requireUser();
  await prisma.issueActionItem.update({
    where: { id },
    data: { isDone, doneAt: isDone ? new Date() : null },
  });
  revalidate();
}

export async function deleteIssueAction(id: string) {
  await requireUser();
  await prisma.issueActionItem.delete({ where: { id } });
  revalidate();
}

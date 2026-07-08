"use server";

/* Server Actions — Quản lý mẫu checklist theo hạng mục */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { SUGGESTED_CHECKLIST_CATEGORIES } from "@/lib/milestone-checklists";
import { PRECONSTRUCTION_CHECKLIST_TEMPLATES } from "@/lib/preconstruction-checklists";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function revalidate() {
  revalidatePath("/schedule/checklist-templates");
  revalidatePath("/schedule");
}

export async function createTemplate(projectId: string, fd: FormData) {
  await requireUser();
  const category = str(fd, "category");
  const existing = await prisma.checklistTemplate.findUnique({
    where: { projectId_category: { projectId, category } },
  });
  if (existing) throw new Error(`Hạng mục "${category}" đã có mẫu — sửa mẫu đó thay vì tạo trùng.`);

  const lines = str(fd, "items").split("\n").map((l) => l.trim()).filter(Boolean);
  await prisma.checklistTemplate.create({
    data: {
      projectId,
      category,
      items: { create: lines.map((label, idx) => ({ label, sortOrder: idx })) },
    },
  });
  revalidate();
}

export async function deleteTemplate(templateId: string) {
  await requireUser();
  await prisma.checklistTemplate.delete({ where: { id: templateId } });
  revalidate();
}

export async function addTemplateItem(templateId: string, fd: FormData) {
  await requireUser();
  const count = await prisma.checklistTemplateItem.count({ where: { templateId } });
  await prisma.checklistTemplateItem.create({
    data: {
      templateId,
      label: str(fd, "label"),
      required: fd.get("required") === "on",
      evidenceRequired: fd.get("evidenceRequired") === "on",
      evidenceType: str(fd, "evidenceType") || null,
      riskIfMissing: str(fd, "riskIfMissing") || null,
      suggestedModule: str(fd, "suggestedModule") || null,
      sortOrder: count,
    },
  });
  revalidate();
}

export async function updateTemplateItem(itemId: string, fd: FormData) {
  await requireUser();
  await prisma.checklistTemplateItem.update({
    where: { id: itemId },
    data: {
      label: str(fd, "label"),
      required: fd.get("required") === "on",
      evidenceRequired: fd.get("evidenceRequired") === "on",
      evidenceType: str(fd, "evidenceType") || null,
      riskIfMissing: str(fd, "riskIfMissing") || null,
      suggestedModule: str(fd, "suggestedModule") || null,
    },
  });
  revalidate();
}

export async function deleteTemplateItem(itemId: string) {
  await requireUser();
  await prisma.checklistTemplateItem.delete({ where: { id: itemId } });
  revalidate();
}

/** Nạp bộ mẫu mặc định (kinh nghiệm giám sát công trình) — bỏ qua hạng mục đã có mẫu */
export async function seedDefaultTemplates(projectId: string) {
  await requireUser();
  const existing = await prisma.checklistTemplate.findMany({
    where: { projectId },
    select: { category: true },
  });
  const existingNames = new Set(existing.map((t) => t.category));
  const toCreate = SUGGESTED_CHECKLIST_CATEGORIES.filter((c) => !existingNames.has(c.category));

  for (const cat of toCreate) {
    await prisma.checklistTemplate.create({
      data: {
        projectId,
        category: cat.category,
        items: { create: cat.items.map((label, idx) => ({ label, sortOrder: idx })) },
      },
    });
  }
  revalidate();
  return toCreate.length;
}

/** Nạp bộ mẫu "Kiểm soát khởi công & nền móng" (9 hạng mục, kèm required/evidence/risk) — bỏ qua hạng mục đã có */
export async function seedPreConstructionTemplates(projectId: string) {
  await requireUser();
  const existing = await prisma.checklistTemplate.findMany({
    where: { projectId },
    select: { category: true },
  });
  const existingNames = new Set(existing.map((t) => t.category));
  const toCreate = PRECONSTRUCTION_CHECKLIST_TEMPLATES.filter((c) => !existingNames.has(c.category));

  for (const cat of toCreate) {
    await prisma.checklistTemplate.create({
      data: {
        projectId,
        category: cat.category,
        items: {
          create: cat.items.map((it, idx) => ({
            label: it.title,
            required: it.required,
            evidenceRequired: it.evidenceRequired,
            evidenceType: it.evidenceType ?? null,
            riskIfMissing: it.riskIfMissing,
            suggestedModule: it.suggestedModule,
            sortOrder: idx,
          })),
        },
      },
    });
  }
  revalidate();
  return toCreate.length;
}

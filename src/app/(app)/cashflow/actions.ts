"use server";

/* Server Actions — Module 2: Dòng tiền & Ngân sách (hạng mục CĐT tự mua) */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { OwnerSupplyCategory, PurchaseStatus, OtherExpenseCategory, OtherExpenseStatus } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[.,\s]/g, "");
  return v === "" ? null : Number(v);
};

export async function createPurchase(projectId: string, fd: FormData) {
  await requireUser();
  await prisma.ownerPurchaseItem.create({
    data: {
      projectId,
      category: str(fd, "category") as OwnerSupplyCategory,
      name: str(fd, "name"),
      plannedCost: numOrNull(fd, "plannedCost") ?? 0,
      supplierName: str(fd, "supplierName") || null,
      neededByDate: str(fd, "neededByDate") ? new Date(str(fd, "neededByDate")) : null,
    },
  });
  revalidatePath("/cashflow");
  revalidatePath("/");
}

export async function updatePurchase(itemId: string, fd: FormData) {
  await requireUser();
  const status = str(fd, "status") as PurchaseStatus;
  await prisma.ownerPurchaseItem.update({
    where: { id: itemId },
    data: {
      status,
      actualCost: numOrNull(fd, "actualCost"),
      deliveredAt: ["DELIVERED", "INSTALLED"].includes(status) ? new Date() : null,
    },
  });
  revalidatePath("/cashflow");
  revalidatePath("/");
}

export async function createOtherExpense(projectId: string, fd: FormData) {
  await requireUser();
  const category = str(fd, "category") as OtherExpenseCategory;
  await prisma.otherExpense.create({
    data: {
      projectId,
      category,
      categoryLabel: category === "OTHER" ? (str(fd, "categoryLabel") || null) : null,
      title: str(fd, "title"),
      plannedCost: numOrNull(fd, "plannedCost") ?? 0,
      expenseDate: str(fd, "expenseDate") ? new Date(str(fd, "expenseDate")) : null,
      note: str(fd, "note") || null,
    },
  });
  revalidatePath("/cashflow");
  revalidatePath("/");
}

export async function updateOtherExpense(itemId: string, fd: FormData) {
  await requireUser();
  const status = str(fd, "status") as OtherExpenseStatus;
  await prisma.otherExpense.update({
    where: { id: itemId },
    data: {
      status,
      actualCost: numOrNull(fd, "actualCost"),
    },
  });
  revalidatePath("/cashflow");
  revalidatePath("/");
}

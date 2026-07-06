"use server";

/* Server Actions — Module: Tài khoản ngân hàng (của CĐT dùng để chi trả) */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function revalidate() {
  revalidatePath("/accounts");
  revalidatePath("/cashflow");
  revalidatePath("/contracts");
}

export async function createBankAccount(projectId: string, fd: FormData) {
  await requireUser();
  await prisma.bankAccount.create({
    data: {
      projectId,
      nickname: str(fd, "nickname"),
      bankName: str(fd, "bankName"),
      accountNumber: str(fd, "accountNumber"),
      accountHolder: str(fd, "accountHolder") || null,
    },
  });
  revalidate();
}

export async function updateBankAccount(accountId: string, fd: FormData) {
  await requireUser();
  await prisma.bankAccount.update({
    where: { id: accountId },
    data: {
      nickname: str(fd, "nickname"),
      bankName: str(fd, "bankName"),
      accountNumber: str(fd, "accountNumber"),
      accountHolder: str(fd, "accountHolder") || null,
    },
  });
  revalidate();
}

export async function deleteBankAccount(accountId: string) {
  await requireUser();
  const used = await prisma.paymentStage.count({ where: { paidFromAccountId: accountId } });
  if (used > 0) {
    throw new Error(`Không thể xóa — tài khoản này đã gắn với ${used} đợt thanh toán đã trả.`);
  }
  await prisma.bankAccount.delete({ where: { id: accountId } });
  revalidate();
}

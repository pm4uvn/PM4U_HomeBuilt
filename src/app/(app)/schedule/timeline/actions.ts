"use server";

/* Server Actions — link chia sẻ công khai cho "Tiến độ trực quan" */

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function generateShareLink(projectId: string): Promise<string> {
  await requireUser();
  const token = randomUUID().replace(/-/g, "");
  await prisma.project.update({ where: { id: projectId }, data: { shareToken: token } });
  revalidatePath("/schedule/timeline");
  return token;
}

export async function revokeShareLink(projectId: string) {
  await requireUser();
  await prisma.project.update({ where: { id: projectId }, data: { shareToken: null } });
  revalidatePath("/schedule/timeline");
}

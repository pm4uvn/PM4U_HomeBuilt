"use server";

/* Server Actions — Module 4: Rủi ro đặc thù */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { RiskCategory, RiskSeverity, RiskStatus, IdleCause } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[.,\s]/g, "");
  return v === "" ? null : Number(v);
};
const dateOrNull = (fd: FormData, k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);

function revalidate() {
  revalidatePath("/risks");
  revalidatePath("/");
}

export async function createRisk(projectId: string, fd: FormData) {
  await requireUser();
  await prisma.riskLog.create({
    data: {
      projectId,
      category: str(fd, "category") as RiskCategory,
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      severity: str(fd, "severity") as RiskSeverity,
      estimatedCostImpact: numOrNull(fd, "estimatedCostImpact"),
      mitigationPlan: str(fd, "mitigationPlan") || null,
    },
  });
  revalidate();
}

export async function updateRiskStatus(riskId: string, status: RiskStatus) {
  await requireUser();
  await prisma.riskLog.update({
    where: { id: riskId },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });
  revalidate();
}

export async function createNeighborSurvey(projectId: string, fd: FormData) {
  await requireUser();
  await prisma.neighborSurvey.create({
    data: {
      projectId,
      neighborAddress: str(fd, "neighborAddress"),
      neighborName: str(fd, "neighborName") || null,
      neighborPhone: str(fd, "neighborPhone") || null,
      surveyDate: dateOrNull(fd, "surveyDate") ?? new Date(),
      hasExistingCracks: fd.get("hasExistingCracks") === "on",
      notes: str(fd, "notes") || null,
    },
  });
  revalidate();
}

export async function startIdleWait(fd: FormData) {
  await requireUser();
  await prisma.idleWaitLog.create({
    data: {
      contractId: str(fd, "contractId"),
      cause: str(fd, "cause") as IdleCause,
      startDate: dateOrNull(fd, "startDate") ?? new Date(),
      dailyPenalty: numOrNull(fd, "dailyPenalty") ?? 0,
      note: str(fd, "note") || null,
    },
  });
  revalidate();
}

export async function stopIdleWait(idleLogId: string) {
  await requireUser();
  await prisma.idleWaitLog.update({
    where: { id: idleLogId },
    data: { endDate: new Date() },
  });
  revalidate();
}

export async function createPilingRecord(projectId: string, fd: FormData) {
  await requireUser();
  await prisma.pilingRecord.create({
    data: {
      projectId,
      testPileCount: Number(str(fd, "testPileCount") || 0),
      testPileAvgDepth: Number(str(fd, "testPileAvgDepth") || 0),
      designPileLength: Number(str(fd, "designPileLength") || 0),
      unitPricePerMeter: numOrNull(fd, "unitPricePerMeter") ?? 0,
      returnFreightFee: numOrNull(fd, "returnFreightFee"),
    },
  });
  revalidate();
}

export async function addPileItem(pilingRecordId: string, fd: FormData) {
  await requireUser();
  const plannedLength = Number(str(fd, "plannedLength"));
  const actualDepth = str(fd, "actualDepth") ? Number(str(fd, "actualDepth")) : null;
  await prisma.pileItem.create({
    data: {
      pilingRecordId,
      pileNo: Number(str(fd, "pileNo")),
      plannedLength,
      actualDepth,
      // Phần cọc dư = chiều dài đặt hàng - độ sâu ép thực tế
      cutOffLength: actualDepth != null ? Math.max(0, plannedLength - actualDepth) : null,
      pressedAt: dateOrNull(fd, "pressedAt"),
    },
  });
  revalidate();
}

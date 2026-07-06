"use server";

/* Server Actions — Module 5: Hồ sơ tài liệu (DMS) */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uploadToStorage } from "@/lib/storage";
import type { DocType } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export interface UploadState {
  error?: string;
  ok?: boolean;
}

export async function uploadDocument(
  projectId: string,
  _prev: UploadState,
  fd: FormData,
): Promise<UploadState> {
  await requireUser();
  try {
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) return { error: "Chưa chọn file" };
    if (file.size > 50 * 1024 * 1024) return { error: "File tối đa 50MB" };

    const path = await uploadToStorage(file, projectId);
    const docType = str(fd, "docType") as DocType;

    // Metadata chỉ tiêu bản vẽ xin phép (cốt nền, khoảng lùi, DT sàn, tum)
    const meta =
      docType === "PERMIT_DRAWING"
        ? {
            cotNen: str(fd, "cotNen") ? Number(str(fd, "cotNen")) : undefined,
            khoangLui: str(fd, "khoangLui") ? Number(str(fd, "khoangLui")) : undefined,
            dienTichSan: str(fd, "dienTichSan") ? Number(str(fd, "dienTichSan")) : undefined,
            tum: fd.get("tum") === "on",
          }
        : undefined;

    await prisma.document.create({
      data: {
        projectId,
        docType,
        title: str(fd, "title") || file.name,
        fileUrl: path,
        mimeType: file.type || null,
        fileSize: file.size,
        tags: str(fd, "tags")
          ? str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        meta,
        contractId: str(fd, "contractId") || null,
        riskLogId: str(fd, "riskLogId") || null,
      },
    });
    revalidatePath("/documents");
    if (str(fd, "contractId")) revalidatePath(`/contracts/${str(fd, "contractId")}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

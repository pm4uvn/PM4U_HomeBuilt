/**
 * Audit trail — ghi lại ai đã làm gì, lúc nào, cho các thao tác quan trọng (tiền, nghiệm thu,
 * duyệt phát sinh, đổi trạng thái rủi ro/vấn đề, tạo/xóa hợp đồng). KHÔNG gắn vào mọi hành động
 * (tick checklist, sửa Hạn/PIC...) — chỉ việc có tính bán-pháp lý/tài chính mới cần truy vết trách nhiệm.
 * actorEmail lấy trực tiếp từ requireUser() (Supabase auth user), không join sang Prisma User.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "CONTRACT_CREATED"
  | "CONTRACT_DELETED"
  | "PAYMENT_RECORDED"
  | "VARIATION_APPROVED"
  | "VARIATION_REJECTED"
  | "INSPECTION_RECORDED"
  | "RISK_STATUS_CHANGED"
  | "ISSUE_STATUS_CHANGED";

export async function logAudit(params: {
  projectId: string;
  actorEmail: string | null | undefined;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  changes?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      projectId: params.projectId,
      actorEmail: params.actorEmail || "unknown",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      summary: params.summary,
      changes: params.changes as Prisma.InputJsonValue | undefined,
    },
  });
}

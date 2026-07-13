/**
 * Cron endpoint — gọi bởi Vercel Cron (xem vercel.json) mỗi 6h. Với mỗi dự án bật thông báo:
 *  1. Chạy pipeline compute-on-read đã có (resolveExpiredHoldPoints + computeAlerts) để cập nhật Alert.
 *  2. computeAlerts() xóa-và-tạo-lại TOÀN BỘ Alert mỗi lần gọi (idempotent theo thiết kế gốc) — nên
 *     trước khi gọi, ghi nhớ alert nào đã từng gửi (theo key type+refTable+refId), sau khi gọi xong
 *     thì khôi phục lại notifiedAt cho các alert trùng khớp. Chỉ alert THẬT SỰ MỚI mới được gửi email.
 *  3. Gửi 1 email digest duy nhất cho các alert mới, đánh dấu notifiedAt sau khi gửi thành công.
 * Bảo vệ bằng CRON_SECRET — chỉ Vercel Cron (hoặc người biết secret) mới gọi được.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveExpiredHoldPoints } from "@/services/milestone.service";
import { computeAlerts } from "@/services/alert.service";
import { sendAlertDigestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const alertKey = (a: { type: string; refTable: string | null; refId: string | null }) =>
  `${a.type}::${a.refTable ?? ""}::${a.refId ?? ""}`;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { emailNotificationsEnabled: true },
    include: { owner: { select: { email: true } } },
  });

  const results: { projectId: string; newAlerts: number; sent: boolean; skipped?: boolean; error?: string }[] = [];

  for (const project of projects) {
    // 1. Nhớ lại alert nào đã gửi trước đây (trước khi computeAlerts() xóa sạch bảng)
    const previouslyNotified = await prisma.alert.findMany({
      where: { projectId: project.id, notifiedAt: { not: null } },
      select: { type: true, refTable: true, refId: true, notifiedAt: true },
    });
    const notifiedAtByKey = new Map(previouslyNotified.map((a) => [alertKey(a), a.notifiedAt]));

    // 2. Chạy lại pipeline compute-on-read — recompute toàn bộ Alert từ trạng thái sống hiện tại
    await resolveExpiredHoldPoints(project.id);
    const freshAlerts = await computeAlerts(project.id);

    // 3. Khôi phục notifiedAt cho alert đã từng gửi (không gửi lặp), phần còn lại là alert MỚI
    const stillNotified = freshAlerts.filter((a) => notifiedAtByKey.has(alertKey(a)));
    await Promise.all(
      stillNotified.map((a) =>
        prisma.alert.update({ where: { id: a.id }, data: { notifiedAt: notifiedAtByKey.get(alertKey(a)) } }),
      ),
    );
    const newAlerts = freshAlerts.filter((a) => !notifiedAtByKey.has(alertKey(a)));

    if (newAlerts.length === 0 || !project.owner.email) {
      results.push({ projectId: project.id, newAlerts: newAlerts.length, sent: false });
      continue;
    }

    const sendResult = await sendAlertDigestEmail({
      to: project.owner.email,
      projectName: project.name,
      alerts: newAlerts.map((a) => ({ title: a.title, message: a.message, severity: a.severity, dueAt: a.dueAt })),
    });

    if (!sendResult.skipped && !sendResult.error) {
      await prisma.alert.updateMany({
        where: { id: { in: newAlerts.map((a) => a.id) } },
        data: { notifiedAt: new Date() },
      });
    }

    results.push({
      projectId: project.id,
      newAlerts: newAlerts.length,
      sent: !sendResult.skipped && !sendResult.error,
      skipped: sendResult.skipped,
      error: sendResult.error,
    });
  }

  return NextResponse.json({ ok: true, results });
}

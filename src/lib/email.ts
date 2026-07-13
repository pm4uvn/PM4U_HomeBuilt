/**
 * Gửi email nhắc cảnh báo (Alert) qua Resend — dùng bởi /api/cron/notify.
 * Nếu chưa cấu hình RESEND_API_KEY (chưa đăng ký Resend), tự bỏ qua và log cảnh báo thay vì crash —
 * cho phép app chạy bình thường trước khi user hoàn tất bước setup thủ công.
 */
import { Resend } from "resend";

const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || "onboarding@resend.dev";

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "🔴 Nghiêm trọng",
  HIGH: "🟠 Cao",
  MEDIUM: "🟡 Trung bình",
  LOW: "⚪ Thấp",
};

export type DigestAlert = {
  title: string;
  message: string;
  severity: string;
  dueAt: Date | null;
};

function renderDigestHtml(projectName: string, alerts: DigestAlert[]): string {
  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee">
          <div style="font-weight:600;font-size:14px;color:#111">${a.title}</div>
          <div style="font-size:12.5px;color:#555;margin-top:2px">${a.message}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">${SEVERITY_LABEL[a.severity] ?? a.severity}${a.dueAt ? ` · Hạn ${a.dueAt.toLocaleDateString("vi-VN")}` : ""}</div>
        </td>
      </tr>`,
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto">
    <div style="font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">PM4U HomeBuild</div>
    <h2 style="margin:6px 0 16px;font-size:19px">${projectName} — ${alerts.length} việc cần chú ý</h2>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <div style="margin-top:20px;font-size:11px;color:#aaa">Đây là email tự động, mở app để xử lý chi tiết.</div>
  </div>`;
}

/** Gửi digest cảnh báo cho 1 dự án. Trả về {skipped:true} nếu chưa cấu hình Resend, không throw. */
export async function sendAlertDigestEmail(params: {
  to: string;
  projectName: string;
  alerts: DigestAlert[];
}): Promise<{ skipped: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY chưa cấu hình — bỏ qua gửi email.");
    return { skipped: true };
  }
  if (params.alerts.length === 0) return { skipped: true };

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `PM4U HomeBuild <${FROM_EMAIL}>`,
    to: params.to,
    subject: `[PM4U] ${params.projectName} — ${params.alerts.length} việc cần chú ý`,
    html: renderDigestHtml(params.projectName, params.alerts),
  });

  if (error) {
    console.error("[notify] Gửi email thất bại:", error);
    return { skipped: false, error: error.message };
  }
  return { skipped: false };
}

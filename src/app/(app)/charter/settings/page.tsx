import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { CharterTabs } from "../CharterTabs";
import { NotificationToggle } from "../forms";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  CONTRACT_CREATED: "📋 Tạo hợp đồng",
  CONTRACT_DELETED: "🗑️ Xóa hợp đồng",
  PAYMENT_RECORDED: "💰 Ghi nhận thanh toán",
  VARIATION_APPROVED: "✅ Duyệt phát sinh",
  VARIATION_REJECTED: "❌ Từ chối phát sinh",
  INSPECTION_RECORDED: "🔍 Nghiệm thu",
  RISK_STATUS_CHANGED: "⚠️ Đổi trạng thái rủi ro",
  ISSUE_STATUS_CHANGED: "🐞 Đổi trạng thái vấn đề",
};

export default async function SettingsPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const logs = await prisma.auditLog.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-3">
      <CharterTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">⚙️ Cài đặt</h1>
      </header>

      <Card title="🔔 Thông báo email">
        <p className="text-xs text-muted mb-3">
          Tự động gửi email nhắc khi có cảnh báo mới (quá hạn thanh toán, chờ nghiệm thu, rủi ro...) —
          quét mỗi 6h qua Vercel Cron, gửi tới email đăng nhập của bạn. Chỉ gửi cảnh báo MỚI, không gửi lặp.
        </p>
        <NotificationToggle projectId={project.id} enabled={project.emailNotificationsEnabled} />
      </Card>

      <Card title={`🕘 Lịch sử hoạt động (${logs.length})`}>
        {logs.length === 0 ? (
          <EmptyState title="Chưa có hoạt động nào được ghi nhận" sub="Các thao tác quan trọng (thanh toán, nghiệm thu, duyệt phát sinh...) sẽ hiện ở đây" />
        ) : (
          <div className="divide-y divide-grid">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 py-2.5 text-[13px]">
                <span className="px-1.5 py-0.5 rounded bg-grid text-muted whitespace-nowrap text-[11px] shrink-0">
                  {ACTION_LABEL[l.action] ?? l.action}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-ink-2">{l.summary}</div>
                  <div className="text-[11px] text-muted mt-0.5">{l.actorEmail} · {fmtDateTime(l.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getProjectTimeline } from "@/services/timeline.service";
import { TimelineView } from "@/components/Timeline";

export const dynamic = "force-dynamic";

/**
 * Trang CÔNG KHAI, không đăng nhập — xem được nếu có đúng link chia sẻ (token). Middleware đã loại
 * trừ /share khỏi cổng đăng nhập bắt buộc. Chỉ gọi getProjectTimeline() (đã tự giới hạn dữ liệu an
 * toàn) — tuyệt đối không import thêm service nào chạm tới hợp đồng/thanh toán ở file này.
 */
export default async function SharedTimelinePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await prisma.project.findUnique({ where: { shareToken: token }, select: { id: true } });

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-8 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-lg font-bold mb-1">Link không hợp lệ</h1>
          <p className="text-ink-2 text-sm">Link chia sẻ này đã bị thu hồi hoặc không tồn tại.</p>
        </div>
      </main>
    );
  }

  const data = await getProjectTimeline(project.id);

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <TimelineView data={data} isPublic />
      </div>
    </main>
  );
}

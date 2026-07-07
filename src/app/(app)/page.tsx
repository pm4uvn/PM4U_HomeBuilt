import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getDefaultProject } from "@/services/dashboard.service";
import {
  HealthScoreCard, ProgressGauge, BudgetCard, ActionQueue, GanttChart,
  CashflowTable, RiskPanel, DailyStrip,
} from "@/components/dashboard";
import { Card, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const PROJECT_STATUS_LABEL: Record<string, string> = {
  PREPARING: "CHUẨN BỊ",
  PERMIT_PENDING: "XIN PHÉP XD",
  UNDER_CONSTRUCTION: "ĐANG THI CÔNG",
  HANDOVER: "NGHIỆM THU BÀN GIAO",
  AS_BUILT_DONE: "ĐÃ HOÀN CÔNG",
  ON_HOLD: "TẠM DỪNG",
};

export default async function DashboardPage() {
  await requireUser();
  const project = await getDefaultProject();

  if (!project) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🏗️</div>
          <h1 className="text-lg font-bold mb-2">Chưa có dự án nào</h1>
          <p className="text-ink-2 text-sm">
            Chạy <code className="bg-page border border-line rounded px-1.5 py-0.5">node scripts/seed.mjs</code>{" "}
            để tạo dữ liệu mẫu, hoặc tạo dự án trong trang Hợp đồng.
          </p>
        </div>
      </Card>
    );
  }

  const data = await getDashboardData(project.id);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap py-1">
        <span className="text-[22px]">🏠</span>
        <h1 className="text-xl font-bold">{data.project.name}</h1>
        <span className="bg-brand text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {PROJECT_STATUS_LABEL[data.project.status] ?? data.project.status}
        </span>
        <Link href="/report" className="ml-auto">
          <Button variant="default">🖨️ Xuất báo cáo</Button>
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        <HealthScoreCard health={data.healthScore} />
        <ProgressGauge progress={data.progress} />
        <BudgetCard budget={data.budget} />
      </div>

      <ActionQueue actions={data.actions} />

      <GanttChart phases={data.phases} />

      <div className="grid grid-cols-[1.2fr_1fr] gap-3 max-lg:grid-cols-1">
        <CashflowTable cashflow={data.cashflow} />
        <RiskPanel risks={data.risks} />
      </div>

      <DailyStrip todayLog={data.todayLog} />
    </div>
  );
}

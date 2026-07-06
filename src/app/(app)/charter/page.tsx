import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState, Tag } from "@/components/ui";
import { fmtDate, fmtTr, fmtVND } from "@/lib/format";
import { CharterTabs } from "./CharterTabs";
import { EditCharterForm, type CharterData } from "./forms";

export const dynamic = "force-dynamic";

function Block({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className="text-[13.5px] text-ink-2 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default async function CharterPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const charterRow = await prisma.projectCharter.findUnique({
    where: { projectId: project.id },
    include: {
      floorPlans: { orderBy: { sortOrder: "asc" } },
      budgetPhases: { orderBy: { sortOrder: "asc" } },
    },
  });
  const charter: CharterData = charterRow
    ? {
        objective: charterRow.objective,
        scopeIncluded: charterRow.scopeIncluded,
        scopeExcluded: charterRow.scopeExcluded,
        successCriteria: charterRow.successCriteria,
        assumptions: charterRow.assumptions,
        constraints: charterRow.constraints,
        sponsorName: charterRow.sponsorName,
        plannedStartDate: charterRow.plannedStartDate?.toISOString() ?? null,
        plannedEndDate: charterRow.plannedEndDate?.toISOString() ?? null,
        approvedAt: charterRow.approvedAt?.toISOString() ?? null,
        floorsAboveGround: charterRow.floorsAboveGround,
        hasBasement: charterRow.hasBasement,
        hasTum: charterRow.hasTum,
        finishingStandard: charterRow.finishingStandard,
        floorPlans: charterRow.floorPlans.map((f) => ({
          floorName: f.floorName,
          areaSqm: f.areaSqm != null ? Number(f.areaSqm) : null,
          soPhongKhach: f.soPhongKhach,
          soPhongNgu: f.soPhongNgu,
          soWc: f.soWc,
          soBep: f.soBep,
          soPhongTho: f.soPhongTho,
          soBanCong: f.soBanCong,
          ghiChuKhac: f.ghiChuKhac,
        })),
        budgetPhases: charterRow.budgetPhases.map((p) => ({ name: p.name, plannedPercent: Number(p.plannedPercent) })),
      }
    : null;

  const projectBudget = Number(project.budgetPlanned);
  const landArea = project.landArea != null ? Number(project.landArea) : null;
  const grossFloorArea = project.grossFloorArea != null ? Number(project.grossFloorArea) : null;

  return (
    <div className="space-y-3">
      <CharterTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📜 Điều lệ dự án — {project.name}</h1>
        <div className="ml-auto">
          <EditCharterForm
            projectId={project.id}
            charter={charter}
            landArea={landArea}
            grossFloorArea={grossFloorArea}
            projectBudget={projectBudget}
          />
        </div>
      </header>

      {!charter ? (
        <Card>
          <EmptyState
            title="Chưa có điều lệ dự án"
            sub="Project Charter là 'hiến pháp' của dự án: mục tiêu, phạm vi, tiêu chí thành công — nên lập trước khi bắt đầu"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
            <Card title="Trạng thái">
              {charter.approvedAt ? (
                <>
                  <Tag sev="good">Đã phê duyệt</Tag>
                  <p className="text-xs text-muted mt-1.5">Ngày {fmtDate(charter.approvedAt)}</p>
                </>
              ) : (
                <Tag sev="warning">Chưa phê duyệt</Tag>
              )}
              {charter.sponsorName && <p className="text-xs text-ink-2 mt-1.5">Bảo trợ: {charter.sponsorName}</p>}
            </Card>
            <Card title="Thời gian dự kiến">
              <p className="text-[13.5px] font-semibold">
                {charter.plannedStartDate ? fmtDate(charter.plannedStartDate) : "—"} → {charter.plannedEndDate ? fmtDate(charter.plannedEndDate) : "—"}
              </p>
            </Card>
            <Card title="Tổng ngân sách dự kiến">
              <p className="text-[13.5px] font-semibold money">{fmtTr(projectBudget)}</p>
            </Card>
          </div>

          <Card>
            <div className="space-y-4">
              <Block label="Mục tiêu dự án" value={charter.objective} />
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <Block label="Phạm vi bao gồm" value={charter.scopeIncluded} />
                <Block label="Phạm vi KHÔNG bao gồm" value={charter.scopeExcluded} />
              </div>
              <Block label="Tiêu chí thành công" value={charter.successCriteria} />
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <Block label="Giả định" value={charter.assumptions} />
                <Block label="Ràng buộc" value={charter.constraints} />
              </div>
            </div>
          </Card>

          <Card title="Quy mô công trình">
            <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 mb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Diện tích đất</p>
                <p className="text-[13.5px] font-semibold">{landArea != null ? `${landArea} m²` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Diện tích sàn XD</p>
                <p className="text-[13.5px] font-semibold">{grossFloorArea != null ? `${grossFloorArea} m²` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Số tầng trên mặt đất</p>
                <p className="text-[13.5px] font-semibold">{charter.floorsAboveGround ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Hầm / Tum</p>
                <p className="text-[13.5px] font-semibold">
                  {charter.hasBasement ? "Có hầm" : "Không hầm"} · {charter.hasTum ? "Có tum" : "Không tum"}
                </p>
              </div>
            </div>
            <Block label="Tiêu chuẩn vật liệu hoàn thiện" value={charter.finishingStandard} />

            {charter.floorPlans.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                  Bố trí phòng theo từng tầng <span className="normal-case font-normal text-muted">— dùng để ước tính vật tư</span>
                </p>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] text-muted border-b border-grid">
                      <th className="py-1 pr-2 font-semibold">Tầng</th>
                      <th className="py-1 pr-2 font-semibold text-right">Diện tích</th>
                      <th className="py-1 pr-2 font-semibold text-right">P.khách</th>
                      <th className="py-1 pr-2 font-semibold text-right">P.ngủ</th>
                      <th className="py-1 pr-2 font-semibold text-right">WC</th>
                      <th className="py-1 pr-2 font-semibold text-right">Bếp</th>
                      <th className="py-1 pr-2 font-semibold text-right">P.thờ</th>
                      <th className="py-1 pr-2 font-semibold text-right">Ban công</th>
                      <th className="py-1 font-semibold">Khác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charter.floorPlans.map((f, i) => (
                      <tr key={i} className="border-b border-grid last:border-0 text-[13px]">
                        <td className="py-2 pr-2 font-semibold">{f.floorName}</td>
                        <td className="py-2 pr-2 text-right money">{f.areaSqm != null ? `${f.areaSqm} m²` : "—"}</td>
                        <td className="py-2 pr-2 text-right money">{f.soPhongKhach || "—"}</td>
                        <td className="py-2 pr-2 text-right money">{f.soPhongNgu || "—"}</td>
                        <td className="py-2 pr-2 text-right money">{f.soWc || "—"}</td>
                        <td className="py-2 pr-2 text-right money">{f.soBep || "—"}</td>
                        <td className="py-2 pr-2 text-right money">{f.soPhongTho || "—"}</td>
                        <td className="py-2 pr-2 text-right money">{f.soBanCong || "—"}</td>
                        <td className="py-2 text-ink-2 text-xs">{f.ghiChuKhac ?? "—"}</td>
                      </tr>
                    ))}
                    {charter.floorPlans.length > 1 && (
                      <tr className="text-[13px] font-bold">
                        <td className="py-2 pr-2">Tổng toàn nhà</td>
                        <td className="py-2 pr-2 text-right money">
                          {charter.floorPlans.reduce((s, f) => s + (f.areaSqm ?? 0), 0) || "—"} m²
                        </td>
                        <td className="py-2 pr-2 text-right money">{charter.floorPlans.reduce((s, f) => s + f.soPhongKhach, 0)}</td>
                        <td className="py-2 pr-2 text-right money">{charter.floorPlans.reduce((s, f) => s + f.soPhongNgu, 0)}</td>
                        <td className="py-2 pr-2 text-right money">{charter.floorPlans.reduce((s, f) => s + f.soWc, 0)}</td>
                        <td className="py-2 pr-2 text-right money">{charter.floorPlans.reduce((s, f) => s + f.soBep, 0)}</td>
                        <td className="py-2 pr-2 text-right money">{charter.floorPlans.reduce((s, f) => s + f.soPhongTho, 0)}</td>
                        <td className="py-2 pr-2 text-right money">{charter.floorPlans.reduce((s, f) => s + f.soBanCong, 0)}</td>
                        <td className="py-2"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {charter.budgetPhases.length > 0 && (
            <Card title="Phân bổ ngân sách theo giai đoạn chính">
              <div className="space-y-2.5">
                {charter.budgetPhases.map((p, i) => {
                  const amount = (p.plannedPercent / 100) * projectBudget;
                  return (
                    <div key={i}>
                      <div className="flex items-baseline justify-between text-[12.5px] mb-1 gap-2">
                        <span className="font-medium text-ink-2">{p.name}</span>
                        <span className="money">
                          <span className="font-semibold text-ink">{fmtVND(amount)}</span>
                          <span className="text-muted"> · {p.plannedPercent}%</span>
                        </span>
                      </div>
                      <div className="h-3 rounded-sm bg-grid">
                        <div
                          className="h-full rounded-r-[4px]"
                          style={{ width: `${p.plannedPercent}%`, background: "var(--series-1)" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

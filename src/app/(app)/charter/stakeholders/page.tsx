import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState, Tag } from "@/components/ui";
import { STAKEHOLDER_LEVEL } from "@/lib/labels";
import { CharterTabs } from "../CharterTabs";
import {
  AddStakeholderForm, EditStakeholderForm, DeleteStakeholderButton, ImportVendorsButton, type StakeholderRow,
} from "../forms";

export const dynamic = "force-dynamic";

const QUADRANTS = [
  { key: "manage", title: "🔴 Quản lý chặt chẽ", sub: "Ảnh hưởng cao · Quan tâm cao", influenceHigh: true, interestHigh: true },
  { key: "satisfy", title: "🟠 Giữ hài lòng", sub: "Ảnh hưởng cao · Quan tâm thấp/vừa", influenceHigh: true, interestHigh: false },
  { key: "inform", title: "🟡 Thông báo đầy đủ", sub: "Ảnh hưởng thấp/vừa · Quan tâm cao", influenceHigh: false, interestHigh: true },
  { key: "monitor", title: "⚪ Theo dõi tối thiểu", sub: "Ảnh hưởng thấp/vừa · Quan tâm thấp/vừa", influenceHigh: false, interestHigh: false },
] as const;

export default async function StakeholdersPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const stakeholdersRaw = await prisma.stakeholder.findMany({
    where: { projectId: project.id },
    orderBy: [{ influence: "desc" }, { name: "asc" }],
  });

  const stakeholders: StakeholderRow[] = stakeholdersRaw.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    organization: s.organization,
    phone: s.phone,
    email: s.email,
    influence: s.influence,
    interest: s.interest,
    communicationNeed: s.communicationNeed,
    notes: s.notes,
  }));

  return (
    <div className="space-y-3">
      <CharterTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">👥 Sổ các bên liên quan (Stakeholder Register)</h1>
        <div className="ml-auto flex gap-2">
          <ImportVendorsButton projectId={project.id} />
          <AddStakeholderForm projectId={project.id} />
        </div>
      </header>

      {stakeholders.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có bên liên quan nào"
            sub="Chủ đầu tư, giám sát, nhà thầu, hàng xóm, cán bộ phường... — ai ảnh hưởng hoặc bị ảnh hưởng bởi dự án"
          />
        </Card>
      ) : (
        <>
          <Card title="Ma trận Quyền lực / Quan tâm (Power-Interest Grid)">
            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              {QUADRANTS.map((q) => {
                const items = stakeholders.filter(
                  (s) => (s.influence === "HIGH") === q.influenceHigh && (s.interest === "HIGH") === q.interestHigh,
                );
                return (
                  <div key={q.key} className="border border-line rounded-lg p-3">
                    <p className="font-semibold text-[13px]">{q.title}</p>
                    <p className="text-xs text-muted mb-2">{q.sub}</p>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted italic">Chưa có ai</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((s) => (
                          <span key={s.id} className="text-xs bg-page border border-line rounded-full px-2 py-0.5">
                            {s.name} <span className="text-muted">· {s.role}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Danh sách chi tiết">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-grid">
                  <th className="py-1 pr-2 font-semibold">Tên</th>
                  <th className="py-1 pr-2 font-semibold">Vai trò</th>
                  <th className="py-1 pr-2 font-semibold">Liên hệ</th>
                  <th className="py-1 pr-2 font-semibold">Ảnh hưởng</th>
                  <th className="py-1 pr-2 font-semibold">Quan tâm</th>
                  <th className="py-1 pr-2 font-semibold">Nhu cầu giao tiếp</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map((s) => (
                  <tr key={s.id} className="border-b border-grid last:border-0 text-[13px] align-top">
                    <td className="py-2 pr-2 font-semibold">
                      {s.name}
                      {s.organization && <div className="text-xs text-muted font-normal">{s.organization}</div>}
                    </td>
                    <td className="py-2 pr-2 text-ink-2">{s.role}</td>
                    <td className="py-2 pr-2 text-xs text-ink-2">
                      {s.phone && <div>{s.phone}</div>}
                      {s.email && <div>{s.email}</div>}
                      {!s.phone && !s.email && "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <Tag sev={s.influence === "HIGH" ? "critical" : s.influence === "MEDIUM" ? "warning" : "neutral"}>
                        {STAKEHOLDER_LEVEL[s.influence]}
                      </Tag>
                    </td>
                    <td className="py-2 pr-2">
                      <Tag sev={s.interest === "HIGH" ? "critical" : s.interest === "MEDIUM" ? "warning" : "neutral"}>
                        {STAKEHOLDER_LEVEL[s.interest]}
                      </Tag>
                    </td>
                    <td className="py-2 pr-2 text-xs text-ink-2">{s.communicationNeed ?? "—"}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <EditStakeholderForm s={s} />
                        <DeleteStakeholderButton id={s.id} name={s.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

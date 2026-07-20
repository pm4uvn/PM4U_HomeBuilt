import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState } from "@/components/ui";
import { CharterTabs } from "../CharterTabs";
import { AddPicForm, EditPicForm, DeletePicButton, ImportVendorsAsPicsButton, type PicRow } from "../forms";

export const dynamic = "force-dynamic";

export default async function PicPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const picsRaw = await prisma.pic.findMany({
    where: { projectId: project.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const pics: PicRow[] = picsRaw.map((p) => ({ id: p.id, name: p.name, role: p.role, phone: p.phone }));

  return (
    <div className="space-y-3">
      <CharterTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🧑‍🔧 Danh sách PIC</h1>
        <span className="text-ink-2 text-[13px]">Nguồn tự điền cho mọi ô chọn PIC (WBS, Nhật ký, Checklist...) — khác Bên liên quan, gọn nhẹ hơn</span>
        <div className="ml-auto flex gap-2">
          <ImportVendorsAsPicsButton projectId={project.id} />
          <AddPicForm projectId={project.id} />
        </div>
      </header>

      {pics.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có PIC nào"
            sub="Bấm “Nạp từ danh sách nhà thầu” hoặc “+ Thêm PIC” để bắt đầu — tên sẽ tự gợi ý ở mọi ô chọn PIC khắp app"
          />
        </Card>
      ) : (
        <Card title={`Danh sách chi tiết (${pics.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-grid">
                  <th className="py-1 pr-2 font-semibold">Tên</th>
                  <th className="py-1 pr-2 font-semibold">Vai trò</th>
                  <th className="py-1 pr-2 font-semibold">Điện thoại</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {pics.map((p) => (
                  <tr key={p.id} className="border-b border-grid last:border-0 text-[13px] align-top">
                    <td className="py-2 pr-2 font-semibold">{p.name}</td>
                    <td className="py-2 pr-2 text-ink-2">{p.role ?? "—"}</td>
                    <td className="py-2 pr-2 text-ink-2">{p.phone ?? "—"}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <EditPicForm p={p} />
                        <DeletePicButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

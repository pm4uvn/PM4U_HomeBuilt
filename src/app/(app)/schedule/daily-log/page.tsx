import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { getSignedUrl } from "@/lib/storage";
import { fmtDate } from "@/lib/format";
import { WEATHER } from "@/lib/labels";
import {
  DailyLogForm, EditDailyLogForm, DeleteDailyLogButton, DailyLogItemsView, DailyLogPhotos,
  type DailyLogVatTuOption,
} from "../forms";
import { ScheduleTabs } from "../ScheduleTabs";

export const dynamic = "force-dynamic";

export default async function DailyLogPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const duAn = await prisma.duAn.findFirst({ orderBy: { id: "asc" } });

  const [phases, dailyLogs, vatTuDuAnList] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
      include: { milestones: { select: { id: true, name: true }, orderBy: { plannedDate: "asc" } } },
    }),
    prisma.dailyLog.findMany({
      where: { projectId: project.id },
      orderBy: { logDate: "desc" },
      take: 14,
      include: {
        milestones: { select: { id: true, name: true } },
        vatTuDuAn: { select: { id: true, vatTu: { select: { tenVatTu: true } } } },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            milestone: { select: { name: true } },
            vatTuDuAn: { select: { vatTu: { select: { tenVatTu: true } } } },
          },
        },
        documents: { where: { docType: "SITE_PHOTO" }, orderBy: { uploadedAt: "asc" } },
      },
    }),
    duAn
      ? prisma.vatTuDuAn.findMany({
          where: { idDuAn: duAn.id },
          include: { vatTu: { include: { nhom: true } } },
          orderBy: [{ vatTu: { nhom: { thuTu: "asc" } } }, { id: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const phasesForDailyLog = phases.map((p) => ({
    name: p.name,
    milestones: p.milestones.map((m) => ({ id: m.id, name: m.name })),
  }));
  const vatTuOptions: DailyLogVatTuOption[] = vatTuDuAnList.map((v) => ({
    id: v.id.toString(),
    name: v.vatTu.tenVatTu,
    groupName: v.vatTu.nhom.tenNhomVatTu,
  }));
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs.find((d) => d.logDate.toISOString().slice(0, 10) === todayStr);

  // Ảnh hiện trường: tạo signed URL (bucket private) cho mọi ảnh của 14 ngày đang hiện
  const photosByLog = new Map<string, { id: string; url: string; title: string }[]>();
  await Promise.all(
    dailyLogs.map(async (d) => {
      const urls = await Promise.all(d.documents.map((doc) => getSignedUrl(doc.fileUrl)));
      photosByLog.set(
        d.id,
        d.documents.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title })).filter((p) => p.url),
      );
    }),
  );

  return (
    <div className="space-y-3">
      <ScheduleTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📆 Nhật ký công trình</h1>
        <div className="ml-auto flex gap-2">
          <DailyLogForm
            projectId={project.id}
            phases={phasesForDailyLog}
            defaultMilestoneIds={todayLog?.milestones.map((m) => m.id) ?? []}
            vatTuOptions={vatTuOptions}
          />
        </div>
      </header>

      <Card title={`Nhật ký công trình (14 ngày gần nhất)`}>
        {dailyLogs.length === 0 ? (
          <EmptyState title="Chưa có nhật ký" sub="Ghi thời tiết & nhân công mỗi ngày — bằng chứng gia hạn tiến độ hợp lệ" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Ngày</th>
                <th className="py-1 pr-2 font-semibold">Thời tiết</th>
                <th className="py-1 pr-2 font-semibold">Nhân công</th>
                <th className="py-1 pr-2 font-semibold">Công việc</th>
                <th className="py-1 pr-2 font-semibold">Gia hạn hợp lệ</th>
                <th className="py-1 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {dailyLogs.map((d) => (
                <tr key={d.id} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2 money">{fmtDate(d.logDate)}</td>
                  <td className="py-2 pr-2">
                    {WEATHER[d.weather]}
                    {d.rainHours && Number(d.rainHours) > 0 ? ` (${Number(d.rainHours)}h)` : ""}
                  </td>
                  <td className="py-2 pr-2">{d.workerCount} người</td>
                  <td className="py-2 pr-2 text-ink-2">
                    {d.items.length > 0 ? (
                      <DailyLogItemsView
                        items={d.items.map((it) => ({
                          id: it.id, label: it.label, isChecked: it.isChecked,
                          dueDate: it.dueDate?.toISOString() ?? null,
                          milestoneName: it.milestone?.name ?? null,
                          vatTuName: it.vatTuDuAn?.vatTu.tenVatTu ?? null,
                          workType: it.workType,
                        }))}
                        dayMilestoneNames={d.milestones.map((m) => m.name)}
                        dayVatTuNames={d.vatTuDuAn.map((v) => v.vatTu.tenVatTu)}
                      />
                    ) : (
                      <>
                        {d.workDescription ?? "—"}
                        {d.milestones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {d.milestones.map((m) => (
                              <span key={m.id} className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2">🔹 {m.name}</span>
                            ))}
                          </div>
                        )}
                        {d.vatTuDuAn.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {d.vatTuDuAn.map((v) => (
                              <span key={v.id.toString()} className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2">🧱 {v.vatTu.tenVatTu}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {d.items.length > 0 && d.workDescription && (
                      <div className="text-xs text-muted mt-1 italic">{d.workDescription}</div>
                    )}
                    <DailyLogPhotos dailyLogId={d.id} projectId={project.id} photos={photosByLog.get(d.id) ?? []} />
                  </td>
                  <td className="py-2 pr-2">{d.isForceMajeure ? <Tag sev="warning">+1 ngày</Tag> : "—"}</td>
                  <td className="py-2">
                    <div className="flex gap-2 justify-end whitespace-nowrap">
                      <EditDailyLogForm
                        log={{
                          id: d.id,
                          logDate: d.logDate.toISOString(),
                          weather: d.weather,
                          rainHours: d.rainHours ? Number(d.rainHours) : null,
                          workerCount: d.workerCount,
                          isForceMajeure: d.isForceMajeure,
                          workDescription: d.workDescription,
                          milestoneIds: d.milestones.map((m) => m.id),
                          vatTuIds: d.vatTuDuAn.map((v) => v.id.toString()),
                          items: d.items.map((it) => ({
                            id: it.id, label: it.label, isChecked: it.isChecked,
                            dueDate: it.dueDate?.toISOString() ?? null,
                            milestoneId: it.milestoneId, vatTuDuAnId: it.vatTuDuAnId?.toString() ?? null,
                            workType: it.workType,
                          })),
                        }}
                        phases={phasesForDailyLog}
                        vatTuOptions={vatTuOptions}
                      />
                      <DeleteDailyLogButton id={d.id} logDate={d.logDate.toISOString()} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

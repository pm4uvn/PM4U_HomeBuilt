import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { getSignedUrl } from "@/lib/storage";
import { fmtDate } from "@/lib/format";
import { WEATHER } from "@/lib/labels";
import {
  DailyLogForm, EditDailyLogForm, DeleteDailyLogButton, DailyLogItemsView, DailyLogPhotos, VoiceNotes,
  type DailyLogVatTuOption, type DailyLogDocumentOption, type DailyLogContractOption,
} from "../forms";
import { uploadDailyLogVoiceNote, deleteDailyLogPhoto } from "../actions";
import { ScheduleTabs } from "../ScheduleTabs";

export const dynamic = "force-dynamic";

export default async function DailyLogPage() {
  const user = await requireUser();
  const myEmail = user.email ?? "";
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const duAn = await prisma.duAn.findFirst({ orderBy: { id: "asc" } });

  const [phases, dailyLogs, vatTuDuAnList, documents, contracts, stakeholders, existingPics] = await Promise.all([
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
            document: { select: { title: true } },
            contract: { select: { code: true, title: true, vendor: { select: { name: true } } } },
            comments: { orderBy: { createdAt: "asc" } },
            reactions: true,
          },
        },
        documents: { where: { docType: { in: ["SITE_PHOTO", "VOICE_NOTE"] } }, orderBy: { uploadedAt: "asc" } },
      },
    }),
    duAn
      ? prisma.vatTuDuAn.findMany({
          where: { idDuAn: duAn.id },
          include: { vatTu: { include: { nhom: true } } },
          orderBy: [{ vatTu: { nhom: { thuTu: "asc" } } }, { id: "asc" }],
        })
      : Promise.resolve([]),
    prisma.document.findMany({
      where: { projectId: project.id },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, title: true, docType: true },
    }),
    prisma.contract.findMany({
      where: { projectId: project.id },
      include: { vendor: { select: { name: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.stakeholder.findMany({ where: { projectId: project.id }, select: { name: true } }),
    prisma.dailyLogItem.findMany({
      where: { dailyLog: { projectId: project.id }, pic: { not: null } },
      select: { pic: true },
      distinct: ["pic"],
    }),
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
  const documentOptions: DailyLogDocumentOption[] = documents.map((d) => ({ id: d.id, title: d.title, docType: d.docType }));
  const contractOptions: DailyLogContractOption[] = contracts.map((c) => ({
    id: c.id,
    label: `${c.code} — ${c.title} (${c.vendor.name})`,
  }));
  // Gợi ý PIC: vai trò phổ biến luôn có sẵn + stakeholder + nhà thầu trong hợp đồng + tên đã gõ trước đó — vẫn cho gõ tên mới
  const COMMON_PIC_ROLES = ["Chủ đầu tư", "Giám sát công trình", "Kỹ sư kết cấu", "Kỹ sư M&E", "Đơn vị thiết kế"];
  const picOptions = Array.from(
    new Set([
      ...COMMON_PIC_ROLES,
      ...stakeholders.map((s) => s.name),
      ...contracts.map((c) => c.vendor.name),
      ...existingPics.map((p) => p.pic).filter((p): p is string => !!p),
    ]),
  ).sort((a, b) => a.localeCompare(b));
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs.find((d) => d.logDate.toISOString().slice(0, 10) === todayStr);

  // Ảnh hiện trường + ghi âm giọng nói: tạo signed URL (bucket private) cho mọi file của 14 ngày đang hiện
  const photosByLog = new Map<string, { id: string; url: string; title: string }[]>();
  const voiceNotesByLog = new Map<string, { id: string; url: string; title: string }[]>();
  await Promise.all(
    dailyLogs.map(async (d) => {
      const urls = await Promise.all(d.documents.map((doc) => getSignedUrl(doc.fileUrl)));
      const resolved = d.documents.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title, docType: doc.docType })).filter((p) => p.url);
      photosByLog.set(d.id, resolved.filter((p) => p.docType === "SITE_PHOTO"));
      voiceNotesByLog.set(d.id, resolved.filter((p) => p.docType === "VOICE_NOTE"));
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
            documentOptions={documentOptions}
            contractOptions={contractOptions}
            picOptions={picOptions}
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
                    {d.isForceMajeure && (
                      <div className="mt-0.5"><Tag sev="warning">+1 ngày gia hạn</Tag></div>
                    )}
                  </td>
                  <td className="py-2 pr-2">{d.workerCount} người</td>
                  <td className="py-2 pr-2 text-ink-2">
                    {d.items.length > 0 ? (
                      <DailyLogItemsView
                        items={d.items.map((it) => {
                          const reactionGroups = new Map<string, { count: number; reactedByMe: boolean }>();
                          for (const r of it.reactions) {
                            const g = reactionGroups.get(r.emoji) ?? { count: 0, reactedByMe: false };
                            g.count++;
                            if (r.authorEmail === myEmail) g.reactedByMe = true;
                            reactionGroups.set(r.emoji, g);
                          }
                          return {
                            id: it.id, label: it.label, isChecked: it.isChecked,
                            dueDate: it.dueDate?.toISOString() ?? null,
                            milestoneName: it.milestone?.name ?? null,
                            vatTuName: it.vatTuDuAn?.vatTu.tenVatTu ?? null,
                            workType: it.workType,
                            documentTitle: it.document?.title ?? null,
                            contractLabel: it.contract ? `${it.contract.code} — ${it.contract.title} (${it.contract.vendor.name})` : null,
                            pic: it.pic,
                            comments: it.comments.map((c) => ({ id: c.id, authorEmail: c.authorEmail, body: c.body, createdAt: c.createdAt.toISOString() })),
                            reactions: [...reactionGroups.entries()].map(([emoji, g]) => ({ emoji, ...g })),
                          };
                        })}
                        dayMilestoneNames={d.milestones.map((m) => m.name)}
                        dayVatTuNames={d.vatTuDuAn.map((v) => v.vatTu.tenVatTu)}
                        myEmail={myEmail}
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
                    <div className="flex flex-wrap gap-3 items-start">
                      <DailyLogPhotos dailyLogId={d.id} projectId={project.id} photos={photosByLog.get(d.id) ?? []} />
                      <VoiceNotes
                        notes={voiceNotesByLog.get(d.id) ?? []}
                        entityId={d.id}
                        projectId={project.id}
                        uploadAction={uploadDailyLogVoiceNote}
                        onDelete={deleteDailyLogPhoto}
                      />
                    </div>
                  </td>
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
                            documentId: it.documentId, contractId: it.contractId, pic: it.pic,
                          })),
                        }}
                        phases={phasesForDailyLog}
                        vatTuOptions={vatTuOptions}
                        documentOptions={documentOptions}
                        contractOptions={contractOptions}
                        picOptions={picOptions}
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

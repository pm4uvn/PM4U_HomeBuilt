/**
 * To-do tổng hợp — gộp mọi việc từ 6 nguồn trong hệ thống thành 1 danh sách duy nhất (cả CHƯA XONG
 * lẫn ĐÃ XONG, phân biệt qua field isDone), để CĐT biết cần hoàn thành hoạt động gì và xem lại việc
 * đã hoàn thành mà không phải mở từng trang riêng lẻ.
 * Compute-on-read, không lưu bảng riêng — luôn phản ánh đúng trạng thái thật hiện tại.
 */
import { prisma } from "@/lib/prisma";
import { fmtDate, todayVN } from "@/lib/format";
import { getSignedUrl } from "@/lib/storage";

export type TodoSource = "DAILY_LOG" | "MILESTONE_TASK" | "MILESTONE_CHECKLIST" | "RISK_MITIGATION" | "ISSUE" | "DEFECT";

export type TodoMedia = { id: string; url: string; title: string };
export type TodoComment = { id: string; authorEmail: string; body: string; createdAt: string };
export type TodoReaction = { emoji: string; count: number; reactedByMe: boolean };

export type TodoItem = {
  id: string;
  source: TodoSource;
  label: string;
  context: string;
  pic: string | null;
  startDate: string | null;
  dueDate: string | null;
  percentComplete: number | null;
  isOverdue: boolean;
  delayDays: number | null; // số ngày trễ hạn (chỉ có khi isOverdue)
  isDone: boolean;
  href: string;
  projectId: string;
  // Thứ tự giai đoạn (Phase.sortOrder) — chỉ có ở MILESTONE_TASK/MILESTONE_CHECKLIST (2 nguồn duy
  // nhất gắn trực tiếp với 1 giai đoạn thi công cụ thể), dùng để sắp WBS theo đúng trình tự I → II → III...
  phaseOrder: number | null;
  // Mọi nguồn đều có bình luận/cảm xúc chung (bảng TodoComment/TodoReaction, polymorphic theo
  // source+id). Riêng ảnh/ghi âm chỉ DAILY_LOG, MILESTONE_TASK, MILESTONE_CHECKLIST có (gắn ở cấp
  // DailyLogItem/MilestoneTask/MilestoneChecklistItem).
  comments?: TodoComment[];
  reactions?: TodoReaction[];
  photos?: TodoMedia[];
  voiceNotes?: TodoMedia[];
};

export async function getTodoItems(projectId: string, myEmail = ""): Promise<TodoItem[]> {
  const [dailyLogItems, milestoneTasks, checklistItems, mitigationActions, issues, defects] = await Promise.all([
    prisma.dailyLogItem.findMany({
      where: { dailyLog: { projectId } },
      include: {
        dailyLog: { select: { logDate: true } },
        photos: { where: { docType: { in: ["SITE_PHOTO", "VOICE_NOTE"] } }, orderBy: { uploadedAt: "asc" } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.milestoneTask.findMany({
      where: { milestone: { phase: { projectId } } },
      include: { milestone: { include: { phase: { select: { name: true, sortOrder: true } } } }, documents: true },
    }),
    prisma.milestoneChecklistItem.findMany({
      where: { milestone: { phase: { projectId } } },
      include: { milestone: { include: { phase: { select: { name: true, sortOrder: true } } } }, documents: true },
    }),
    prisma.riskMitigationAction.findMany({
      where: { risk: { projectId } },
      include: { risk: { select: { title: true, severity: true } } },
    }),
    prisma.issueLog.findMany({
      where: { projectId },
      orderBy: { dueDate: "asc" },
    }),
    prisma.defectLog.findMany({
      where: { projectId },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const now = todayVN();
  const nowDate = new Date(now); // mốc UTC-midnight của ngày hôm nay theo giờ VN — khớp cách dueDate được lưu (cũng UTC-midnight của ngày chọn)
  const items: TodoItem[] = [];

  /** Trễ bao nhiêu ngày (làm tròn xuống theo ngày dương lịch), null nếu chưa trễ/chưa có hạn/đã xong */
  function overdueInfo(dueDate: string | null, isDone: boolean): { isOverdue: boolean; delayDays: number | null } {
    if (isDone || !dueDate || dueDate.slice(0, 10) >= now) return { isOverdue: false, delayDays: null };
    const days = Math.floor((nowDate.getTime() - new Date(dueDate).getTime()) / 86_400_000);
    return { isOverdue: true, delayDays: Math.max(1, days) };
  }

  for (const it of dailyLogItems) {
    const dueDate = it.dueDate?.toISOString() ?? null;
    const urls = await Promise.all(it.photos.map((doc) => getSignedUrl(doc.fileUrl)));
    const resolvedDocs = it.photos.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title, docType: doc.docType })).filter((d) => d.url);
    items.push({
      id: it.id,
      source: "DAILY_LOG",
      label: it.label,
      context: `Nhật ký ${fmtDate(it.dailyLog.logDate)}`,
      pic: it.pic,
      startDate: it.startDate?.toISOString() ?? it.dailyLog.logDate.toISOString(), // trống thì mặc định = ngày ghi nhật ký
      dueDate,
      percentComplete: it.percentComplete,
      ...overdueInfo(dueDate, it.isChecked),
      isDone: it.isChecked,
      href: "/schedule/daily-log",
      projectId,
      phaseOrder: null,
      photos: resolvedDocs.filter((d) => d.docType === "SITE_PHOTO"),
      voiceNotes: resolvedDocs.filter((d) => d.docType === "VOICE_NOTE"),
    });
  }

  for (const t of milestoneTasks) {
    const dueDate = t.dueDate?.toISOString() ?? null;
    const startDate = dueDate ? new Date(new Date(dueDate).getTime() - t.durationDays * 86_400_000).toISOString() : null;
    const urls = await Promise.all(t.documents.map((doc) => getSignedUrl(doc.fileUrl)));
    const resolvedDocs = t.documents.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title, docType: doc.docType })).filter((d) => d.url);
    items.push({
      id: t.id,
      source: "MILESTONE_TASK",
      label: t.name,
      context: `${t.milestone.phase.name} · ${t.milestone.name}`,
      pic: t.responsible,
      startDate,
      dueDate,
      percentComplete: t.percentComplete,
      ...overdueInfo(dueDate, t.isDone),
      isDone: t.isDone,
      href: "/schedule",
      projectId,
      phaseOrder: t.milestone.phase.sortOrder,
      photos: resolvedDocs.filter((d) => d.docType === "SITE_PHOTO"),
      voiceNotes: resolvedDocs.filter((d) => d.docType === "VOICE_NOTE"),
    });
  }

  for (const c of checklistItems) {
    const urls = await Promise.all(c.documents.map((doc) => getSignedUrl(doc.fileUrl)));
    const resolvedDocs = c.documents.map((doc, i) => ({ id: doc.id, url: urls[i] ?? "", title: doc.title, docType: doc.docType })).filter((d) => d.url);
    items.push({
      id: c.id,
      source: "MILESTONE_CHECKLIST",
      label: c.label,
      context: `${c.milestone.phase.name} · ${c.milestone.name}`,
      pic: null,
      startDate: null,
      dueDate: null,
      percentComplete: null,
      isOverdue: false,
      delayDays: null,
      isDone: c.isChecked,
      href: "/schedule",
      projectId,
      phaseOrder: c.milestone.phase.sortOrder,
      photos: resolvedDocs.filter((d) => d.docType === "SITE_PHOTO"),
      voiceNotes: resolvedDocs.filter((d) => d.docType === "VOICE_NOTE"),
    });
  }

  for (const m of mitigationActions) {
    items.push({
      id: m.id,
      source: "RISK_MITIGATION",
      label: m.label,
      context: `Rủi ro: ${m.risk.title}`,
      pic: null,
      startDate: null,
      dueDate: null,
      percentComplete: null,
      isOverdue: false,
      delayDays: null,
      isDone: m.isDone,
      href: "/risks",
      projectId,
      phaseOrder: null,
    });
  }

  for (const i of issues) {
    const dueDate = i.dueDate?.toISOString() ?? null;
    const isDone = i.status === "RESOLVED" || i.status === "CLOSED";
    items.push({
      id: i.id,
      source: "ISSUE",
      label: i.title,
      context: `Issue Log${i.category ? ` · ${i.category}` : ""}`,
      pic: i.owner,
      startDate: i.raisedDate.toISOString(),
      dueDate,
      percentComplete: null,
      ...overdueInfo(dueDate, isDone),
      isDone,
      href: "/issues",
      projectId,
      phaseOrder: null,
    });
  }

  for (const d of defects) {
    const dueDate = d.dueDate?.toISOString() ?? null;
    const isDone = d.status === "FIXED" || d.status === "CLOSED";
    items.push({
      id: d.id,
      source: "DEFECT",
      label: d.title,
      context: `Bảo hành${d.location ? ` · ${d.location}` : ""}`,
      pic: d.owner,
      startDate: d.reportedDate.toISOString(),
      dueDate,
      percentComplete: null,
      ...overdueInfo(dueDate, isDone),
      isDone,
      href: "/defects",
      projectId,
      phaseOrder: null,
    });
  }

  // Bình luận/cảm xúc chung cho mọi nguồn — gộp theo (source, entityId), fetch 1 lần cho toàn bộ
  // danh sách thay vì N+1 query. OR theo từng nhóm nguồn (tối đa 6 điều kiện) để tận dụng index.
  const idsBySource = new Map<TodoSource, string[]>();
  for (const it of items) {
    const arr = idsBySource.get(it.source) ?? [];
    arr.push(it.id);
    idsBySource.set(it.source, arr);
  }
  const sourceFilters = [...idsBySource.entries()].map(([source, ids]) => ({ source, entityId: { in: ids } }));
  const [commentRows, reactionRows] = sourceFilters.length
    ? await Promise.all([
        prisma.todoComment.findMany({ where: { OR: sourceFilters }, orderBy: { createdAt: "asc" } }),
        prisma.todoReaction.findMany({ where: { OR: sourceFilters } }),
      ])
    : [[], []];

  const commentsByKey = new Map<string, TodoComment[]>();
  for (const c of commentRows) {
    const key = `${c.source}:${c.entityId}`;
    const arr = commentsByKey.get(key) ?? [];
    arr.push({ id: c.id, authorEmail: c.authorEmail, body: c.body, createdAt: c.createdAt.toISOString() });
    commentsByKey.set(key, arr);
  }
  const reactionsByKey = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();
  for (const r of reactionRows) {
    const key = `${r.source}:${r.entityId}`;
    const groups = reactionsByKey.get(key) ?? new Map<string, { count: number; reactedByMe: boolean }>();
    const g = groups.get(r.emoji) ?? { count: 0, reactedByMe: false };
    g.count++;
    if (r.authorEmail === myEmail) g.reactedByMe = true;
    groups.set(r.emoji, g);
    reactionsByKey.set(key, groups);
  }
  for (const it of items) {
    const key = `${it.source}:${it.id}`;
    it.comments = commentsByKey.get(key) ?? [];
    it.reactions = [...(reactionsByKey.get(key) ?? new Map()).entries()].map(([emoji, g]) => ({ emoji, ...g }));
  }

  // Ưu tiên: trễ hạn trước -> có hạn gần nhất -> không có hạn xếp cuối
  items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return items;
}

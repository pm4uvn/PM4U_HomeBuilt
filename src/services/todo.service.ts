/**
 * To-do tổng hợp — gộp mọi việc từ 6 nguồn trong hệ thống thành 1 danh sách duy nhất (cả CHƯA XONG
 * lẫn ĐÃ XONG, phân biệt qua field isDone), để CĐT biết cần hoàn thành hoạt động gì và xem lại việc
 * đã hoàn thành mà không phải mở từng trang riêng lẻ.
 * Compute-on-read, không lưu bảng riêng — luôn phản ánh đúng trạng thái thật hiện tại.
 */
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";
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
  // Chỉ DAILY_LOG có bình luận/cảm xúc (gắn ở cấp DailyLogItem); chỉ MILESTONE_TASK có ảnh/ghi âm
  // (gắn ở cấp MilestoneTask) — nguồn khác luôn rỗng, không có chỗ lưu media/bình luận riêng.
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
        comments: { orderBy: { createdAt: "asc" } },
        reactions: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.milestoneTask.findMany({
      where: { milestone: { phase: { projectId } } },
      include: { milestone: { include: { phase: { select: { name: true, sortOrder: true } } } }, documents: true },
    }),
    prisma.milestoneChecklistItem.findMany({
      where: { milestone: { phase: { projectId } } },
      include: { milestone: { include: { phase: { select: { name: true, sortOrder: true } } } } },
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

  const nowDate = new Date();
  const now = nowDate.toISOString().slice(0, 10);
  const items: TodoItem[] = [];

  /** Trễ bao nhiêu ngày (làm tròn xuống theo ngày dương lịch), null nếu chưa trễ/chưa có hạn/đã xong */
  function overdueInfo(dueDate: string | null, isDone: boolean): { isOverdue: boolean; delayDays: number | null } {
    if (isDone || !dueDate || dueDate.slice(0, 10) >= now) return { isOverdue: false, delayDays: null };
    const days = Math.floor((nowDate.getTime() - new Date(dueDate).getTime()) / 86_400_000);
    return { isOverdue: true, delayDays: Math.max(1, days) };
  }

  for (const it of dailyLogItems) {
    const dueDate = it.dueDate?.toISOString() ?? null;
    const reactionGroups = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of it.reactions) {
      const g = reactionGroups.get(r.emoji) ?? { count: 0, reactedByMe: false };
      g.count++;
      if (r.authorEmail === myEmail) g.reactedByMe = true;
      reactionGroups.set(r.emoji, g);
    }
    items.push({
      id: it.id,
      source: "DAILY_LOG",
      label: it.label,
      context: `Nhật ký ${fmtDate(it.dailyLog.logDate)}`,
      pic: it.pic,
      startDate: it.dailyLog.logDate.toISOString(), // việc nhật ký chỉ trong 1 ngày -> bắt đầu = ngày ghi nhật ký
      dueDate,
      percentComplete: null,
      ...overdueInfo(dueDate, it.isChecked),
      isDone: it.isChecked,
      href: "/schedule/daily-log",
      projectId,
      phaseOrder: null,
      comments: it.comments.map((c) => ({ id: c.id, authorEmail: c.authorEmail, body: c.body, createdAt: c.createdAt.toISOString() })),
      reactions: [...reactionGroups.entries()].map(([emoji, g]) => ({ emoji, ...g })),
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

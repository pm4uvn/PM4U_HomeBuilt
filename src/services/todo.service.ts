/**
 * To-do tổng hợp — gộp mọi việc CHƯA XONG từ 4 nguồn trong hệ thống thành 1 danh sách duy nhất,
 * để CĐT biết cần hoàn thành hoạt động gì mà không phải mở từng trang riêng lẻ.
 * Compute-on-read, không lưu bảng riêng — luôn phản ánh đúng trạng thái thật hiện tại.
 */
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";

export type TodoSource = "DAILY_LOG" | "MILESTONE_TASK" | "MILESTONE_CHECKLIST" | "RISK_MITIGATION" | "ISSUE" | "DEFECT";

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
  href: string;
};

export async function getTodoItems(projectId: string): Promise<TodoItem[]> {
  const [dailyLogItems, milestoneTasks, checklistItems, mitigationActions, openIssues, openDefects] = await Promise.all([
    prisma.dailyLogItem.findMany({
      where: { dailyLog: { projectId }, isChecked: false },
      include: { dailyLog: { select: { logDate: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.milestoneTask.findMany({
      where: { milestone: { phase: { projectId } }, isDone: false },
      include: { milestone: { include: { phase: { select: { name: true } } } } },
    }),
    prisma.milestoneChecklistItem.findMany({
      where: { milestone: { phase: { projectId } }, isChecked: false },
      include: { milestone: { include: { phase: { select: { name: true } } } } },
    }),
    prisma.riskMitigationAction.findMany({
      where: { risk: { projectId }, isDone: false },
      include: { risk: { select: { title: true, severity: true } } },
    }),
    prisma.issueLog.findMany({
      where: { projectId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.defectLog.findMany({
      where: { projectId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const nowDate = new Date();
  const now = nowDate.toISOString().slice(0, 10);
  const items: TodoItem[] = [];

  /** Trễ bao nhiêu ngày (làm tròn xuống theo ngày dương lịch), null nếu chưa trễ/chưa có hạn */
  function overdueInfo(dueDate: string | null): { isOverdue: boolean; delayDays: number | null } {
    if (!dueDate || dueDate.slice(0, 10) >= now) return { isOverdue: false, delayDays: null };
    const days = Math.floor((nowDate.getTime() - new Date(dueDate).getTime()) / 86_400_000);
    return { isOverdue: true, delayDays: Math.max(1, days) };
  }

  for (const it of dailyLogItems) {
    const dueDate = it.dueDate?.toISOString() ?? null;
    items.push({
      id: it.id,
      source: "DAILY_LOG",
      label: it.label,
      context: `Nhật ký ${fmtDate(it.dailyLog.logDate)}`,
      pic: it.pic,
      startDate: it.dailyLog.logDate.toISOString(), // việc nhật ký chỉ trong 1 ngày -> bắt đầu = ngày ghi nhật ký
      dueDate,
      percentComplete: null,
      ...overdueInfo(dueDate),
      href: "/schedule/daily-log",
    });
  }

  for (const t of milestoneTasks) {
    const dueDate = t.dueDate?.toISOString() ?? null;
    const startDate = dueDate ? new Date(new Date(dueDate).getTime() - t.durationDays * 86_400_000).toISOString() : null;
    items.push({
      id: t.id,
      source: "MILESTONE_TASK",
      label: t.name,
      context: `${t.milestone.phase.name} · ${t.milestone.name}`,
      pic: t.responsible,
      startDate,
      dueDate,
      percentComplete: t.percentComplete,
      ...overdueInfo(dueDate),
      href: "/schedule",
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
      href: "/schedule",
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
      href: "/risks",
    });
  }

  for (const i of openIssues) {
    const dueDate = i.dueDate?.toISOString() ?? null;
    items.push({
      id: i.id,
      source: "ISSUE",
      label: i.title,
      context: `Issue Log${i.category ? ` · ${i.category}` : ""}`,
      pic: i.owner,
      startDate: i.raisedDate.toISOString(),
      dueDate,
      percentComplete: null,
      ...overdueInfo(dueDate),
      href: "/issues",
    });
  }

  for (const d of openDefects) {
    const dueDate = d.dueDate?.toISOString() ?? null;
    items.push({
      id: d.id,
      source: "DEFECT",
      label: d.title,
      context: `Bảo hành${d.location ? ` · ${d.location}` : ""}`,
      pic: d.owner,
      startDate: d.reportedDate.toISOString(),
      dueDate,
      percentComplete: null,
      ...overdueInfo(dueDate),
      href: "/defects",
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

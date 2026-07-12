/**
 * To-do tổng hợp — gộp mọi việc CHƯA XONG từ 4 nguồn trong hệ thống thành 1 danh sách duy nhất,
 * để CĐT biết cần hoàn thành hoạt động gì mà không phải mở từng trang riêng lẻ.
 * Compute-on-read, không lưu bảng riêng — luôn phản ánh đúng trạng thái thật hiện tại.
 */
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";

export type TodoSource = "DAILY_LOG" | "MILESTONE_TASK" | "MILESTONE_CHECKLIST" | "RISK_MITIGATION";

export type TodoItem = {
  id: string;
  source: TodoSource;
  label: string;
  context: string;
  pic: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  href: string;
};

export async function getTodoItems(projectId: string): Promise<TodoItem[]> {
  const [dailyLogItems, milestoneTasks, checklistItems, mitigationActions] = await Promise.all([
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
  ]);

  const now = new Date().toISOString().slice(0, 10);
  const items: TodoItem[] = [];

  for (const it of dailyLogItems) {
    const dueDate = it.dueDate?.toISOString() ?? null;
    items.push({
      id: it.id,
      source: "DAILY_LOG",
      label: it.label,
      context: `Nhật ký ${fmtDate(it.dailyLog.logDate)}`,
      pic: it.pic,
      dueDate,
      isOverdue: !!dueDate && dueDate.slice(0, 10) < now,
      href: "/schedule/daily-log",
    });
  }

  for (const t of milestoneTasks) {
    items.push({
      id: t.id,
      source: "MILESTONE_TASK",
      label: t.name,
      context: `${t.milestone.phase.name} · ${t.milestone.name}`,
      pic: t.responsible,
      dueDate: null,
      isOverdue: false,
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
      dueDate: null,
      isOverdue: false,
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
      dueDate: null,
      isOverdue: false,
      href: "/risks",
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

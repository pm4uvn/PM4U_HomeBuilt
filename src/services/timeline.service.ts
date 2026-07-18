/**
 * "Tiến độ trực quan" — gộp % tiến độ + ảnh công trường theo đúng giai đoạn/mốc nghiệm thu thành 1
 * timeline kể chuyện, dùng chung cho trang nội bộ VÀ trang chia sẻ công khai (/share/[token]).
 * CHỈ được query Phase/Milestone/MilestoneTask/DailyLogItem/InspectionRecord + Document lọc cứng
 * docType="SITE_PHOTO" — không bao giờ chạm Contract/PaymentStage/PenaltyRule hay các DocType khác
 * (CONTRACT_FILE, INVOICE...) vì dữ liệu này có thể lộ ra trang public không đăng nhập.
 */
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage";
import { getProjectProgress } from "./disbursement.service";

export type TimelinePhoto = { id: string; url: string; title: string };
export type TimelineMilestone = {
  id: string;
  name: string;
  isDone: boolean;
  date: string | null; // ngày nghiệm thu thật nếu đã đạt, không thì ngày kế hoạch
  photos: TimelinePhoto[];
};
export type TimelinePhase = {
  id: string;
  name: string;
  sortOrder: number;
  progressPct: number;
  milestones: TimelineMilestone[];
};
export type ProjectTimeline = {
  projectName: string;
  overallPct: number;
  expectedHandover: string | null;
  phases: TimelinePhase[];
};

const SITE_PHOTO = { docType: "SITE_PHOTO" as const };

export async function getProjectTimeline(projectId: string): Promise<ProjectTimeline> {
  const [project, phases, overallPct] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } }),
    prisma.phase.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        milestones: {
          orderBy: { plannedDate: "asc" },
          include: {
            documents: { where: SITE_PHOTO, orderBy: { uploadedAt: "asc" } },
            tasks: { include: { documents: { where: SITE_PHOTO, orderBy: { uploadedAt: "asc" } } } },
            dailyLogItems: { include: { photos: { where: SITE_PHOTO, orderBy: { uploadedAt: "asc" } } } },
            inspections: {
              where: { result: { in: ["PASS", "PASS_WITH_NOTES"] } },
              orderBy: { confirmedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    getProjectProgress(projectId),
  ]);

  const expectedHandover = phases.reduce<Date | null>(
    (max, p) => (p.plannedEnd && (!max || p.plannedEnd > max) ? p.plannedEnd : max),
    null,
  );

  const timelinePhases: TimelinePhase[] = await Promise.all(
    phases.map(async (phase) => ({
      id: phase.id,
      name: phase.name,
      sortOrder: phase.sortOrder,
      progressPct: Number(phase.progressPct),
      milestones: await Promise.all(
        phase.milestones.map(async (m) => {
          const docs = [
            ...m.documents,
            ...m.tasks.flatMap((t) => t.documents),
            ...m.dailyLogItems.flatMap((it) => it.photos),
          ];
          const urls = await Promise.all(docs.map((d) => getSignedUrl(d.fileUrl)));
          const photos: TimelinePhoto[] = docs
            .map((d, i) => ({ id: d.id, url: urls[i] ?? "", title: d.title }))
            .filter((p) => p.url);

          const isDone = m.status === "APPROVED" || m.status === "AUTO_APPROVED";
          const actualDate = m.inspections[0]?.confirmedAt ?? null;
          const date = (actualDate ?? m.plannedDate)?.toISOString() ?? null;

          return { id: m.id, name: m.name, isDone, date, photos };
        }),
      ),
    })),
  );

  return {
    projectName: project.name,
    overallPct,
    expectedHandover: expectedHandover?.toISOString() ?? null,
    phases: timelinePhases,
  };
}

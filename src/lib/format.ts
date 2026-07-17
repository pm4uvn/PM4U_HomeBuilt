import { format } from "date-fns";

/** 320000000 -> "320.000.000₫" */
export const fmtVND = (n: number | string | bigint) =>
  new Intl.NumberFormat("vi-VN").format(Number(n)) + "₫";

/** 3500000000 -> "3,5 tỷ" | 320000000 -> "320tr" */
export const fmtTr = (n: number | string) => {
  const v = Number(n);
  if (Math.abs(v) >= 1e9)
    return v / 1e9 >= 100
      ? Math.round(v / 1e9).toLocaleString("vi-VN") + " tỷ"
      : (v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " tỷ";
  return Math.round(v / 1e6).toLocaleString("vi-VN") + "tr";
};

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), "dd/MM/yyyy") : "—";

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—";

/** Prisma Decimal | null -> number (để truyền xuống client components) */
export const num = (d: unknown): number => (d == null ? 0 : Number(d));

export const MS_PER_DAY = 86_400_000;
export const daysBetween = (from: Date | string, to: Date | string) =>
  Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY));

/**
 * Ngày "hôm nay" theo YYYY-MM-DD — LUÔN tính theo giờ Việt Nam (UTC+7), không dùng
 * `new Date().toISOString().slice(0,10)` vì toISOString() chuẩn hóa về UTC bất kể máy chủ/trình
 * duyệt chạy múi giờ nào. Vercel chạy UTC nên nếu tính theo UTC, mọi việc "quá hạn" sẽ trễ mất tới
 * 7 tiếng đồng hồ vào buổi tối/đêm giờ VN (UTC chưa sang ngày mới trong khi VN đã sang ngày mới) —
 * gây báo trễ hạn sai/chậm cho toàn bộ tính năng "Trễ hạn" (Việc cần làm, Gantt, Dashboard...).
 */
export const todayVN = (): string => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

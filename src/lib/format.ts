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

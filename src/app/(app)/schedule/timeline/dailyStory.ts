import type { TodoItem } from "@/services/todo.service";

export type StoryDay = { date: string; items: TodoItem[] };

/**
 * Gộp TOÀN BỘ việc (đã xong lẫn chưa xong) từ 6 nguồn — Nhật ký, WBS, Checklist mốc, Rủi ro, Issue
 * Log, Bảo hành — thành 1 story line theo từng ngày, ngày cũ trước tăng dần lên ngày mới. Chỉ dùng nội bộ (trang
 * /schedule/timeline có đăng nhập) — KHÔNG đưa vào trang chia sẻ công khai, vì nội dung ở đây (rủi
 * ro, issue, checklist còn thiếu...) chi tiết/nhạy hơn nhiều so với timeline ảnh+% dành cho public.
 *
 * Ngày gắn cho mỗi việc = startDate nếu có (ngày việc bắt đầu/được ghi nhận — sát với "câu chuyện"
 * hơn hạn chót), không có thì dùng dueDate; việc nào không có ngày nào cả (Checklist mốc, Rủi ro —
 * 2 nguồn duy nhất không có field ngày riêng) rơi vào nhóm "Không có ngày cụ thể".
 */
export function groupTodoItemsByDay(items: TodoItem[]): { days: StoryDay[]; noDate: TodoItem[] } {
  const map = new Map<string, TodoItem[]>();
  const noDate: TodoItem[] = [];
  for (const it of items) {
    const day = (it.startDate ?? it.dueDate)?.slice(0, 10);
    if (!day) {
      noDate.push(it);
      continue;
    }
    const arr = map.get(day) ?? [];
    arr.push(it);
    map.set(day, arr);
  }
  const days = [...map.entries()]
    .map(([date, dayItems]) => ({ date, items: dayItems }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { days, noDate };
}

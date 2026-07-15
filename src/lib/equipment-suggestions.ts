/**
 * Gợi ý tự động thiết bị điện tử theo quy mô nhà (số phòng khách/ngủ/bếp/WC lấy từ
 * ProjectCharter -> CharterFloorPlan) — ánh xạ tên hạng mục cố định sang danh mục ThietBi
 * (khớp theo tenHangMuc chính xác). Đây là gói gợi ý CƠ BẢN, người dùng xem trước và bỏ chọn
 * từng dòng trước khi thêm thật vào dự án — không tự thêm ngầm.
 */

export type RoomKey = "soPhongKhach" | "soPhongNgu" | "soBep" | "soWc";

export const ROOM_LABELS: Record<RoomKey, string> = {
  soPhongKhach: "Phòng khách",
  soPhongNgu: "Phòng ngủ",
  soBep: "Bếp",
  soWc: "WC",
};

const ROOM_RULES: { roomKey: RoomKey; items: string[] }[] = [
  { roomKey: "soPhongKhach", items: ["Smart TV 65 inch 4K", "Máy lạnh treo tường 2HP", "Loa thông minh/loa multi-room"] },
  { roomKey: "soPhongNgu", items: ["Máy lạnh treo tường 1HP", "Smart TV 32–43 inch"] },
  { roomKey: "soBep", items: ["Bếp từ đôi âm", "Máy hút mùi âm tủ", "Lò vi sóng để bàn", "Máy lọc nước RO để tủ/đứng"] },
  { roomKey: "soWc", items: ["Máy nước nóng gián tiếp 15–30L", "Quạt hút âm trần/tường"] },
];

/** Thiết bị dùng chung cả nhà — thêm 1 lần duy nhất (không nhân theo số phòng) */
const WHOLE_HOUSE_ITEMS = [
  "Modem/Router quang ONT",
  "Router WiFi 6/6E/7 gia đình",
  "Máy giặt cửa trước 9–12kg",
  "Tủ lạnh ngăn đá trên 200–400L",
  "Hub/Controller Smart Home",
];

export interface RoomCounts {
  soPhongKhach: number;
  soPhongNgu: number;
  soBep: number;
  soWc: number;
}

export interface CatalogForSuggestion {
  id: string;
  tenHangMuc: string;
  donViTinh: string | null;
  giaThap: number | null;
  giaTrungBinh: number | null;
  giaCao: number | null;
}

export interface EquipmentSuggestion {
  idThietBi: string;
  tenHangMuc: string;
  donViTinh: string | null;
  giaThap: number | null;
  giaTrungBinh: number | null;
  giaCao: number | null;
  soLuong: number;
  nguon: string; // "Phòng khách (x2)" hoặc "Cả nhà"
}

/** Cộng dồn số phòng qua tất cả các tầng */
export function sumRoomCounts(floorPlans: RoomCounts[]): RoomCounts {
  return floorPlans.reduce(
    (acc, f) => ({
      soPhongKhach: acc.soPhongKhach + f.soPhongKhach,
      soPhongNgu: acc.soPhongNgu + f.soPhongNgu,
      soBep: acc.soBep + f.soBep,
      soWc: acc.soWc + f.soWc,
    }),
    { soPhongKhach: 0, soPhongNgu: 0, soBep: 0, soWc: 0 },
  );
}

export function buildEquipmentSuggestions(
  roomCounts: RoomCounts,
  catalog: CatalogForSuggestion[],
  alreadyAddedIds: Set<string>,
): EquipmentSuggestion[] {
  const byName = new Map(catalog.map((c) => [c.tenHangMuc, c]));
  const out: EquipmentSuggestion[] = [];

  for (const rule of ROOM_RULES) {
    const count = roomCounts[rule.roomKey];
    if (count <= 0) continue;
    for (const ten of rule.items) {
      const tb = byName.get(ten);
      if (!tb || alreadyAddedIds.has(tb.id)) continue;
      out.push({
        idThietBi: tb.id,
        tenHangMuc: tb.tenHangMuc,
        donViTinh: tb.donViTinh,
        giaThap: tb.giaThap,
        giaTrungBinh: tb.giaTrungBinh,
        giaCao: tb.giaCao,
        soLuong: count,
        nguon: `${ROOM_LABELS[rule.roomKey]} (x${count})`,
      });
    }
  }

  const hasAnyRoom = roomCounts.soPhongKhach + roomCounts.soPhongNgu + roomCounts.soBep + roomCounts.soWc > 0;
  if (hasAnyRoom) {
    for (const ten of WHOLE_HOUSE_ITEMS) {
      const tb = byName.get(ten);
      if (!tb || alreadyAddedIds.has(tb.id)) continue;
      out.push({
        idThietBi: tb.id,
        tenHangMuc: tb.tenHangMuc,
        donViTinh: tb.donViTinh,
        giaThap: tb.giaThap,
        giaTrungBinh: tb.giaTrungBinh,
        giaCao: tb.giaCao,
        soLuong: 1,
        nguon: "Cả nhà",
      });
    }
  }

  return out;
}

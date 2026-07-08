/**
 * WBS cấp 4 — công việc thi công con dưới mỗi mốc nghiệm thu, kèm thời lượng dự kiến
 * (ngày) và người/đơn vị phụ trách, đúc kết theo thông lệ thi công nhà ở dân dụng VN.
 * Khớp tên với STANDARD_MILESTONES/buildStructureMilestones (src/lib/standard-milestones.ts).
 */

export type WbsTaskTemplate = {
  name: string;
  durationDays: number;
  responsible: string;
};

const EXACT_TASKS: Record<string, WbsTaskTemplate[]> = {
  "Duyệt hồ sơ năng lực nhà thầu": [
    { name: "Thu thập báo giá từ tối thiểu 3 nhà thầu", durationDays: 5, responsible: "CĐT" },
    { name: "Đi khảo sát công trình thực tế nhà thầu đã thi công", durationDays: 2, responsible: "CĐT" },
    { name: "So sánh, đánh giá và chọn nhà thầu", durationDays: 2, responsible: "CĐT" },
  ],
  "Ký hợp đồng thi công": [
    { name: "Soạn thảo hợp đồng, phụ lục kèm bản vẽ/tiến độ", durationDays: 3, responsible: "CĐT" },
    { name: "Đàm phán điều khoản, đơn giá vật tư", durationDays: 2, responsible: "CĐT" },
    { name: "Ký kết chính thức", durationDays: 1, responsible: "CĐT" },
  ],
  "Duyệt phương án mặt bằng công năng": [
    { name: "Phác thảo 2-3 phương án mặt bằng công năng", durationDays: 5, responsible: "Đơn vị thiết kế" },
    { name: "Họp gia đình thống nhất phương án", durationDays: 2, responsible: "CĐT" },
  ],
  "Duyệt phối cảnh 3D mặt tiền": [
    { name: "Dựng phối cảnh 3D mặt tiền", durationDays: 4, responsible: "Đơn vị thiết kế" },
    { name: "Chỉnh sửa theo góp ý CĐT (tối đa 2 lần)", durationDays: 3, responsible: "Đơn vị thiết kế" },
  ],
  "Duyệt hồ sơ thiết kế kết cấu": [
    { name: "Tính toán kết cấu móng, cột, dầm, sàn", durationDays: 7, responsible: "Kỹ sư kết cấu" },
    { name: "Vẽ triển khai bản vẽ kết cấu chi tiết", durationDays: 5, responsible: "Kỹ sư kết cấu" },
  ],
  "Duyệt hồ sơ thiết kế điện nước (M&E)": [
    { name: "Thiết kế sơ đồ điện, cấp thoát nước", durationDays: 5, responsible: "Kỹ sư M&E" },
    { name: "Tính toán tải điện, đường ống theo nhu cầu sử dụng", durationDays: 3, responsible: "Kỹ sư M&E" },
  ],
  "Duyệt bản vẽ xin phép xây dựng": [
    { name: "Tổng hợp hồ sơ bản vẽ xin phép theo mẫu quy định", durationDays: 3, responsible: "Đơn vị thiết kế" },
  ],
  "Nộp hồ sơ xin phép xây dựng": [
    { name: "Chuẩn bị hồ sơ pháp lý đất + bản vẽ", durationDays: 2, responsible: "CĐT" },
    { name: "Nộp hồ sơ tại cơ quan cấp phép", durationDays: 1, responsible: "CĐT" },
  ],
  "Nhận Giấy phép xây dựng": [
    { name: "Theo dõi, bổ sung hồ sơ nếu cơ quan yêu cầu", durationDays: 15, responsible: "CĐT" },
    { name: "Nhận giấy phép, đóng phí/lệ phí", durationDays: 1, responsible: "CĐT" },
  ],
  "Nghiệm thu cọc ép thử": [
    { name: "Tập kết cọc thử, máy ép đến công trình", durationDays: 1, responsible: "Nhà thầu ép cọc" },
    { name: "Ép thử cọc, ghi biểu đồ lực ép", durationDays: 1, responsible: "Nhà thầu ép cọc" },
    { name: "Nghiệm thu, đối chiếu với thiết kế", durationDays: 1, responsible: "CĐT + Kỹ sư" },
  ],
  "Nghiệm thu cọc ép đại trà": [
    { name: "Ép cọc đại trà toàn bộ mặt bằng", durationDays: 5, responsible: "Nhà thầu ép cọc" },
    { name: "Ghi nhật ký ép từng cây, xử lý cọc lỗi", durationDays: 1, responsible: "Nhà thầu ép cọc" },
    { name: "Nghiệm thu tổng thể toàn bộ cọc", durationDays: 1, responsible: "CĐT + Kỹ sư" },
  ],
  "Nghiệm thu định vị tim trục, cốt nền": [
    { name: "Trắc đạc định vị tim trục, cao độ cốt nền", durationDays: 1, responsible: "Đơn vị trắc đạc" },
    { name: "Nghiệm thu, lập biên bản trắc đạc", durationDays: 1, responsible: "CĐT" },
  ],
  "Nghiệm thu đào đất hố móng": [
    { name: "Đào đất hố móng theo bản vẽ", durationDays: 3, responsible: "Nhà thầu thô" },
    { name: "Xử lý nước ngầm/bơm nước đọng (nếu có)", durationDays: 1, responsible: "Nhà thầu thô" },
  ],
  "Nghiệm thu cốt thép móng": [
    { name: "Gia công, lắp dựng cốt thép móng", durationDays: 3, responsible: "Nhà thầu thô" },
    { name: "Nghiệm thu cốt thép trước khi đổ bê tông", durationDays: 1, responsible: "CĐT + Kỹ sư" },
  ],
  "Nghiệm thu đổ bê tông móng": [
    { name: "Đổ bê tông móng, lấy mẫu nén thử", durationDays: 1, responsible: "Nhà thầu thô" },
    { name: "Bảo dưỡng bê tông (tưới nước tối thiểu 7 ngày)", durationDays: 7, responsible: "Nhà thầu thô" },
  ],
  "Nghiệm thu cốt thép giằng móng": [
    { name: "Gia công, lắp dựng cốt thép giằng móng", durationDays: 2, responsible: "Nhà thầu thô" },
    { name: "Đổ bê tông giằng móng", durationDays: 1, responsible: "Nhà thầu thô" },
  ],
  "Nghiệm thu hệ thống điện nước âm sàn/âm tường (trước khi tô trát)": [
    { name: "Đi ống điện, ống nước âm sàn/tường", durationDays: 4, responsible: "Thầu điện nước" },
    { name: "Thử áp lực đường ống nước", durationDays: 1, responsible: "Thầu điện nước" },
    { name: "Chụp ảnh nghiệm thu trước khi tô trát che lấp", durationDays: 1, responsible: "CĐT" },
  ],
  "Nghiệm thu xây tô tường bao che": [
    { name: "Xây tường bao che toàn bộ", durationDays: 10, responsible: "Nhà thầu thô" },
    { name: "Tô trát tường trong/ngoài", durationDays: 10, responsible: "Nhà thầu thô" },
  ],
  "Nghiệm thu chống thấm sàn mái, sân thượng, WC": [
    { name: "Thi công lớp chống thấm", durationDays: 2, responsible: "Thầu chống thấm" },
    { name: "Ngâm nước thử tối thiểu 24-48h", durationDays: 2, responsible: "CĐT" },
  ],
  "Nghiệm thu chống thấm sàn tum, mái tum": [
    { name: "Thi công lớp chống thấm tum", durationDays: 1, responsible: "Thầu chống thấm" },
    { name: "Ngâm nước thử tối thiểu 24h", durationDays: 1, responsible: "CĐT" },
  ],
  "Duyệt báo giá vật tư & nhân công hoàn thiện": [
    { name: "Thu thập báo giá từ 2-3 nhà thầu/nhà cung cấp hoàn thiện", durationDays: 5, responsible: "CĐT" },
    { name: "So sánh, đối chiếu chủng loại vật tư và chốt nhà thầu", durationDays: 2, responsible: "CĐT" },
  ],
  "Nghiệm thu ốp lát gạch nền, tường": [
    { name: "Ốp lát gạch nền, tường toàn bộ", durationDays: 10, responsible: "Nhà thầu hoàn thiện" },
    { name: "Chà ron, vệ sinh bề mặt gạch", durationDays: 2, responsible: "Nhà thầu hoàn thiện" },
  ],
  "Nghiệm thu bả matit, sơn nước hoàn thiện": [
    { name: "Bả matit toàn bộ tường trong/ngoài", durationDays: 7, responsible: "Thầu sơn" },
    { name: "Sơn lót + sơn phủ 2 lớp hoàn thiện", durationDays: 5, responsible: "Thầu sơn" },
  ],
  "Nghiệm thu lắp đặt cửa, cửa sổ": [
    { name: "Lắp đặt khung, cánh cửa toàn bộ", durationDays: 3, responsible: "Thầu cửa" },
    { name: "Chỉnh khe hở, kiểm tra vận hành đóng mở", durationDays: 1, responsible: "Thầu cửa" },
  ],
  "Nghiệm thu lắp đặt thiết bị vệ sinh": [
    { name: "Lắp đặt lavabo, bồn cầu, sen vòi", durationDays: 2, responsible: "Thầu điện nước" },
    { name: "Test xả nước, kiểm tra rò rỉ", durationDays: 1, responsible: "Thầu điện nước" },
  ],
  "Nghiệm thu hệ thống điện nước hoàn thiện": [
    { name: "Lắp đặt công tắc, ổ cắm, đèn hoàn thiện", durationDays: 3, responsible: "Thầu điện nước" },
    { name: "Đo thông mạch, cách điện toàn hệ thống", durationDays: 1, responsible: "Thầu điện nước" },
  ],
  "Thử nước chống thấm ban công, sân thượng (ngâm 24h)": [
    { name: "Bịt kín miệng thoát, đổ nước ngâm thử", durationDays: 1, responsible: "CĐT" },
    { name: "Kiểm tra trần bên dưới sau 24h", durationDays: 1, responsible: "CĐT" },
  ],
  "Duyệt thiết kế nội thất (bản vẽ, phối cảnh 3D)": [
    { name: "Đo đạc thực tế thi công thô làm căn cứ thiết kế", durationDays: 2, responsible: "Đơn vị thiết kế nội thất" },
    { name: "Thiết kế bản vẽ + phối cảnh 3D nội thất", durationDays: 10, responsible: "Đơn vị thiết kế nội thất" },
    { name: "Chỉnh sửa theo góp ý CĐT (tối đa 2 lần)", durationDays: 5, responsible: "Đơn vị thiết kế nội thất" },
  ],
  "Nghiệm thu lắp đặt tủ bếp, nội thất gắn liền": [
    { name: "Lắp đặt tủ bếp, tủ áo âm tường", durationDays: 3, responsible: "Thầu nội thất" },
    { name: "Kiểm tra cân bằng, chắc chắn", durationDays: 1, responsible: "CĐT" },
  ],
  "Nghiệm thu lắp đặt đèn, rèm trang trí": [
    { name: "Lắp đèn trang trí, đèn thả", durationDays: 2, responsible: "Thầu điện nước" },
    { name: "Lắp rèm cửa các phòng", durationDays: 1, responsible: "Thầu rèm" },
  ],
  "Vệ sinh công nghiệp trước bàn giao": [
    { name: "Dọn vệ sinh công nghiệp toàn bộ công trình", durationDays: 2, responsible: "Đơn vị vệ sinh" },
  ],
  "Nghiệm thu tổng thể trước bàn giao": [
    { name: "Rà soát, khắc phục lỗi tồn đọng", durationDays: 5, responsible: "Nhà thầu chính" },
    { name: "Test vận hành điện, nước, thiết bị toàn bộ", durationDays: 1, responsible: "CĐT + Kỹ sư" },
  ],
  "Hoàn thiện bản vẽ hoàn công": [
    { name: "Cập nhật bản vẽ theo đúng thực tế thi công", durationDays: 5, responsible: "Đơn vị thiết kế" },
  ],
  "Nghiệm thu bàn giao công trình": [
    { name: "Lập biên bản bàn giao, bàn giao chìa khóa", durationDays: 1, responsible: "CĐT + Nhà thầu" },
  ],
};

/** Áp dụng cho mọi mốc "cốt thép + đổ bê tông cột/sàn/mái ..." lặp lại theo từng tầng */
const SLAB_TASKS: WbsTaskTemplate[] = [
  { name: "Lắp dựng cốp pha cột, sàn", durationDays: 3, responsible: "Nhà thầu thô" },
  { name: "Gia công, lắp dựng cốt thép cột, sàn", durationDays: 3, responsible: "Nhà thầu thô" },
  { name: "Đổ bê tông cột, sàn, lấy mẫu nén thử", durationDays: 1, responsible: "Nhà thầu thô" },
  { name: "Bảo dưỡng, tháo cốp pha đúng thời gian dưỡng hộ", durationDays: 7, responsible: "Nhà thầu thô" },
];

/** Áp dụng cho milestone tự đặt tên, không khớp thư viện chuẩn */
const GENERIC_FALLBACK_TASKS: WbsTaskTemplate[] = [
  { name: "Chuẩn bị vật tư, nhân công", durationDays: 1, responsible: "Nhà thầu" },
  { name: "Thi công theo bản vẽ/thiết kế đã duyệt", durationDays: 2, responsible: "Nhà thầu" },
  { name: "Nghiệm thu, ghi nhận vào nhật ký công trình", durationDays: 1, responsible: "CĐT" },
];

export function getTasksForMilestoneName(name: string): WbsTaskTemplate[] {
  if (EXACT_TASKS[name]) return EXACT_TASKS[name];
  if (name.includes("cốt thép") && name.includes("đổ bê tông") && (name.includes("sàn") || name.includes("cột") || name.includes("mái"))) {
    return SLAB_TASKS;
  }
  return GENERIC_FALLBACK_TASKS;
}

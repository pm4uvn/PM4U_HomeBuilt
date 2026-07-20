/* Nhãn tiếng Việt cho toàn bộ enum trong schema — dùng chung mọi module */

export const STAKEHOLDER_LEVEL: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

export const VENDOR_TYPE: Record<string, string> = {
  DESIGN: "Thầu thiết kế",
  PILING: "Thầu ép cọc",
  STRUCTURE: "Thầu thô",
  FINISHING: "Thầu hoàn thiện",
  INTERIOR: "Thầu nội thất",
  MATERIAL_SUPPLIER: "NCC vật tư",
  OTHER: "Khác",
};

export const CONTRACT_STATUS: Record<string, string> = {
  DRAFT: "Nháp",
  SIGNED: "Đã ký",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  TERMINATED: "Hủy ngang",
};

export const PENALTY_TYPE: Record<string, string> = {
  CONTRACTOR_LATE_PROGRESS: "Thầu trễ tiến độ",
  OWNER_LATE_PAYMENT: "CĐT chậm thanh toán",
  TERMINATION: "Hủy ngang hợp đồng",
  FAKE_MATERIAL: "Vật tư giả/sai xuất xứ",
  OWNER_IDLE_WAIT: "CĐT gây chờ việc",
  CUSTOM: "Tùy chỉnh",
};

export const PENALTY_PARTY: Record<string, string> = {
  CONTRACTOR: "Nhà thầu",
  OWNER: "Chủ đầu tư",
  EITHER: "Cả 2 bên",
};

export const PENALTY_BASIS: Record<string, string> = {
  PCT_OF_CONTRACT_PER_DAY: "% giá trị HĐ / ngày",
  PCT_OF_CONTRACT: "% giá trị HĐ",
  PCT_OF_ITEM_VALUE: "% giá trị vật tư",
  FIXED_PER_DAY: "VND / ngày",
  FIXED_ONE_TIME: "VND (1 lần)",
};

export const DISCOUNT_TYPE: Record<string, string> = {
  DESIGN_FEE_WAIVER: "Miễn phí thiết kế (có điều kiện)",
  PROMOTION: "Khuyến mãi",
  NEGOTIATED: "Thỏa thuận",
};

export const PAYMENT_STATUS: Record<string, string> = {
  UPCOMING: "Chưa tới",
  DUE: "Tới hạn",
  OVERDUE: "QUÁ HẠN",
  PARTIAL: "Đã trả một phần",
  PAID: "Đã trả đủ",
};

export const VARIATION_REASON: Record<string, string> = {
  DESIGN_CHANGE: "Thay đổi thiết kế",
  MATERIAL_UPGRADE: "Nâng cấp vật tư",
  SITE_CONDITION: "Điều kiện hiện trường",
  OWNER_REQUEST: "CĐT yêu cầu",
};

export const VARIATION_STATUS: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const OWNER_SUPPLY_CATEGORY: Record<string, string> = {
  TILES: "Gạch ốp lát",
  SANITARY_WARE: "Thiết bị vệ sinh",
  APPLIANCES: "Điện máy",
  LOOSE_FURNITURE: "Nội thất rời",
  OTHER: "Khác",
};

export const PURCHASE_STATUS: Record<string, string> = {
  PLANNED: "Kế hoạch",
  ORDERED: "Đã đặt hàng",
  DELIVERED: "Đã giao",
  INSTALLED: "Đã lắp đặt",
};

export const OTHER_EXPENSE_CATEGORY: Record<string, string> = {
  LEGAL_PERMIT: "Pháp lý / xin phép",
  UTILITIES_CONNECTION: "Đấu nối điện/nước/internet tạm",
  CEREMONY: "Lễ động thổ / cất nóc / nhập trạch",
  SITE_PREP: "Dọn mặt bằng / phá dỡ nhà cũ",
  TRANSPORT: "Vận chuyển / di dời",
  GRATUITY: "Bồi dưỡng / đối ngoại",
  FINANCING_INTEREST: "Lãi vay ngân hàng",
  TEMP_HOUSING: "Thuê nhà tạm / chuyển đồ",
  UNEXPECTED: "Phát sinh không lường trước",
  OTHER: "Khác",
};

export const OTHER_EXPENSE_STATUS: Record<string, string> = {
  PLANNED: "Kế hoạch",
  PAID: "Đã chi",
};

export const PHASE_TYPE: Record<string, string> = {
  TENDERING: "Tìm thầu",
  DESIGN_CONCEPT: "Thiết kế concept",
  DESIGN_TECHNICAL: "Thiết kế kỹ thuật",
  PERMIT: "Xin phép XD",
  PILING: "Ép cọc",
  STRUCTURE: "Thi công thô",
  FINISHING: "Hoàn thiện",
  INTERIOR_INSTALL: "Lắp đặt nội thất",
  AS_BUILT: "Hoàn công",
};

export const MILESTONE_STATUS: Record<string, string> = {
  PENDING: "Chưa tới",
  AWAITING_INSPECTION: "Chờ nghiệm thu",
  APPROVED: "Đã nghiệm thu",
  REJECTED: "Không đạt",
  AUTO_APPROVED: "Tự động thông qua",
};

export const INSPECTION_METHOD: Record<string, string> = {
  SITE_MINUTES: "Biên bản tại công trình",
  APP_CONFIRM: "Xác nhận qua App",
  ZALO_CONFIRM: "Xác nhận qua Zalo",
};

export const INSPECTION_RESULT: Record<string, string> = {
  PASS: "Đạt",
  PASS_WITH_NOTES: "Đạt (có ghi chú)",
  FAIL: "Không đạt",
};

export const WEATHER: Record<string, string> = {
  SUNNY: "☀️ Nắng",
  CLOUDY: "⛅ Nhiều mây",
  LIGHT_RAIN: "🌦️ Mưa nhỏ",
  HEAVY_RAIN: "☔ Mưa lớn",
  STORM: "🌪️ Bão",
};

export const DAILY_LOG_WORK_TYPE: Record<string, string> = {
  LEGAL_DOCS: "Hồ sơ pháp lý",
  SITE_PREPARATION: "Chuẩn bị mặt bằng",
  LAND_BOUNDARY: "Ranh đất",
  NEIGHBOR_CONDITION: "Hiện trạng nhà bên cạnh",
  GROUNDBREAKING: "Động thổ",
  DEMOLITION: "Phá dỡ",
  PILING: "Ép cọc",
  EXCAVATION: "Đào móng",
  STRUCTURE_WORK: "Thi công thô",
  MEP_WORK: "Điện nước (M&E)",
  WATERPROOFING: "Chống thấm",
  FINISHING_WORK: "Hoàn thiện",
  INTERIOR_WORK: "Lắp đặt nội thất",
  HANDOVER: "Bàn giao / hoàn công",
  SAFETY: "An toàn lao động",
  MATERIAL_DELIVERY: "Giao nhận vật tư",
  ACCEPTANCE: "Nghiệm thu",
  VARIATION: "Phát sinh",
};

export const RISK_CATEGORY: Record<string, string> = {
  DESIGN_TECHNICAL: "Thiết kế / kỹ thuật",
  LEGAL_PERMIT: "Pháp lý / giấy phép",
  CONTRACTOR_VENDOR: "Nhà thầu / nhà cung cấp",
  QUALITY: "Chất lượng thi công",
  SAFETY: "An toàn lao động",
  SCHEDULE: "Tiến độ",
  COST: "Chi phí / ngân sách",
  NEIGHBOR_SETTLEMENT_CRACK: "Lún nứt nhà hàng xóm",
  UNDERGROUND_OBSTACLE: "Chướng ngại vật ngầm / địa chất",
  PILE_QUANTITY_VARIANCE: "Chênh lệch khối lượng cọc",
  OWNER_CAUSED_IDLE: "Chờ việc do lỗi CĐT",
  WEATHER: "Thời tiết",
  OTHER: "Khác",
};

export const RISK_SEVERITY: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

export const RISK_STATUS: Record<string, string> = {
  OPEN: "Đang mở",
  MONITORING: "Theo dõi",
  MITIGATED: "Đã giảm thiểu",
  CLOSED: "Đã đóng",
};

export const RISK_PROBABILITY: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

export const RISK_RESPONSE_STRATEGY: Record<string, string> = {
  AVOID: "Né tránh",
  MITIGATE: "Giảm thiểu",
  TRANSFER: "Chuyển giao",
  ACCEPT: "Chấp nhận",
};

export const ISSUE_CATEGORY: Record<string, string> = {
  DESIGN_TECHNICAL: "Thiết kế / kỹ thuật",
  CONTRACTOR_VENDOR: "Nhà thầu / nhà cung cấp",
  QUALITY: "Chất lượng thi công",
  SAFETY: "An toàn lao động",
  SCHEDULE: "Tiến độ",
  COST: "Chi phí / ngân sách",
  MATERIAL_SUPPLY: "Cung ứng vật tư",
  NEIGHBOR_COMPLAINT: "Khiếu nại hàng xóm",
  LEGAL_PERMIT: "Pháp lý / giấy phép",
  OTHER: "Khác",
};

export const ISSUE_SEVERITY: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

export const ISSUE_STATUS: Record<string, string> = {
  OPEN: "Đang mở",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
};

export const DEFECT_CATEGORY: Record<string, string> = {
  WATERPROOFING: "Chống thấm",
  ELECTRICAL_MEP: "Điện nước",
  FINISHING: "Hoàn thiện",
  STRUCTURAL: "Kết cấu",
  DOOR_WINDOW: "Cửa đi / cửa sổ",
  PAINT_WALL: "Sơn / tường / trần",
  FLOORING: "Sàn / ốp lát",
  ROOFING: "Mái / sân thượng",
  OTHER: "Khác",
};

export const DEFECT_SEVERITY: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

export const DEFECT_STATUS: Record<string, string> = {
  OPEN: "Đang mở",
  IN_PROGRESS: "Đang xử lý",
  FIXED: "Đã sửa",
  CLOSED: "Đã đóng",
};

export const IDLE_CAUSE: Record<string, string> = {
  SITE_NOT_CLEARED: "Chưa dọn mặt bằng",
  NEIGHBOR_COMPLAINT: "Hàng xóm khiếu nại",
  OWNER_DECISION_PENDING: "Chờ CĐT quyết định",
  OWNER_PAYMENT_PENDING: "Chờ CĐT thanh toán",
};

// ================ MODULE 6: VẬT TƯ HOÀN THIỆN =========================
// Các giá trị này là check constraint (VARCHAR) trong DB, không phải Prisma enum

export const VT_NGUOI_MUA: Record<string, string> = {
  chu_dau_tu: "Chủ đầu tư mua",
  nha_thau: "Nhà thầu mua",
  chua_xac_dinh: "Chưa xác định",
};

export const VT_NGUON_MUA_MAC_DINH: Record<string, string> = {
  chu_dau_tu_mua: "Chủ đầu tư mua",
  nha_thau_mua: "Nhà thầu mua",
  chua_xac_dinh: "Chưa xác định",
};

export const VT_TRANG_THAI_CHOT_MAU: Record<string, string> = {
  chua_chot: "Chưa chốt",
  dang_xem_mau: "Đang xem mẫu",
  da_chot: "Đã chốt",
  can_doi_mau: "Cần đổi mẫu",
};

export const VT_TRANG_THAI_DAT_HANG: Record<string, string> = {
  chua_dat: "Chưa đặt",
  dang_bao_gia: "Đang báo giá",
  da_duyet_gia: "Đã duyệt giá",
  da_dat: "Đã đặt hàng",
  da_mua: "Đã mua",
  huy: "Hủy",
};

export const VT_TRANG_THAI_GIAO_HANG: Record<string, string> = {
  chua_giao: "Chưa giao",
  giao_mot_phan: "Giao một phần",
  da_giao: "Đã giao",
  tre_hen: "Trễ hẹn",
  loi_vat_tu: "Lỗi vật tư",
};

export const VT_TRANG_THAI_THI_CONG: Record<string, string> = {
  chua_thi_cong: "Chưa thi công",
  dang_thi_cong: "Đang thi công",
  da_thi_cong: "Đã thi công",
  dang_nghiem_thu: "Đang nghiệm thu",
  da_nghiem_thu: "Đã nghiệm thu",
  can_sua_loi: "Cần sửa lỗi",
};

export const VT_TRANG_THAI_CONG_VIEC: Record<string, string> = {
  chua_lam: "Chưa làm",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
  tre_han: "Trễ hạn",
  tam_dung: "Tạm dừng",
  huy: "Hủy",
};

// ================ MODULE: THIẾT BỊ ĐIỆN TỬ THEO DỰ ÁN =========================
export const TB_NGUOI_MUA: Record<string, string> = {
  chu_dau_tu: "Chủ đầu tư mua",
  nha_thau: "Nhà thầu mua",
  chua_xac_dinh: "Chưa xác định",
};

export const TB_TRANG_THAI_CHON_MODEL: Record<string, string> = {
  chua_chon: "Chưa chọn",
  da_chon: "Đã chọn",
};

export const TB_TRANG_THAI_DAT_HANG: Record<string, string> = {
  chua_dat: "Chưa đặt",
  da_dat: "Đã đặt hàng",
  da_mua: "Đã mua",
};

export const TB_TRANG_THAI_GIAO_HANG: Record<string, string> = {
  chua_giao: "Chưa giao",
  da_giao: "Đã giao",
};

export const TB_TRANG_THAI_LAP_DAT: Record<string, string> = {
  chua_lap_dat: "Chưa lắp đặt",
  dang_lap_dat: "Đang lắp đặt",
  da_lap_dat: "Đã lắp đặt",
  can_sua_loi: "Cần sửa lỗi",
};

export const TB_DO_TIN_CAY: Record<string, string> = {
  cao: "Cao",
  trung_binh: "Trung bình",
  thap: "Thấp",
};

export const TB_TRANG_THAI: Record<string, string> = {
  dang_su_dung: "Đang sử dụng",
  ngung_ban: "Ngừng bán",
  thay_the: "Đã thay thế",
};

export const DOC_TYPE: Record<string, string> = {
  PERMIT_DRAWING: "Bản vẽ xin phép",
  TECHNICAL_DRAWING: "Bản vẽ kỹ thuật",
  INTERIOR_3D: "Bản vẽ nội thất 3D",
  AS_BUILT_DRAWING: "Bản vẽ hoàn công",
  CONTRACT_FILE: "Hợp đồng",
  INSPECTION_MINUTES: "Biên bản nghiệm thu",
  SURVEY_MEDIA: "Ảnh/video khảo sát",
  INVOICE: "Hóa đơn",
  SITE_PHOTO: "Ảnh công trình",
  OTHER: "Khác",
};

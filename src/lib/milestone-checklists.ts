/**
 * Checklist chuẩn cho từng loại mốc nghiệm thu — theo tiêu chí giám sát công trình
 * nhà ở thực tế tại VN. Khớp tên với STANDARD_MILESTONES/buildStructureMilestones
 * (src/lib/standard-milestones.ts). Milestone tự tạo tay không có trong danh sách
 * này sẽ không có checklist mặc định — người dùng tự thêm nếu cần.
 */
const EXACT_CHECKLISTS: Record<string, string[]> = {
  "Duyệt hồ sơ năng lực nhà thầu": [
    "Đã kiểm tra giấy phép kinh doanh, mã số thuế nhà thầu",
    "Đã tham khảo công trình nhà thầu đã thi công trước đó (đi xem thực tế)",
    "Đã đối chiếu năng lực nhân sự, thiết bị thi công",
    "Báo giá rõ ràng, chi tiết theo từng hạng mục",
  ],
  "Ký hợp đồng thi công": [
    "Đã đọc kỹ điều khoản phạt vi phạm (chậm tiến độ, chậm thanh toán, vật tư giả)",
    "Đã quy định rõ đơn giá, chủng loại, xuất xứ vật tư trong hợp đồng",
    "Có phụ lục bản vẽ, tiến độ thi công kèm theo hợp đồng",
    "Đã thống nhất các đợt thanh toán gắn với mốc nghiệm thu",
    "Đã kiểm tra người đại diện ký đúng pháp nhân, có ủy quyền hợp lệ",
  ],
  "Duyệt phương án mặt bằng công năng": [
    "Công năng phù hợp nhu cầu sử dụng thực tế của gia đình",
    "Đã kiểm tra hướng nhà, hướng gió, ánh sáng tự nhiên",
    "Diện tích các phòng hợp lý, không lãng phí không gian",
  ],
  "Duyệt phối cảnh 3D mặt tiền": [
    "Đúng phong cách kiến trúc đã thống nhất ban đầu",
    "Vật liệu mặt tiền khả thi về chi phí thi công",
    "Đã đối chiếu quy định chiều cao, khoảng lùi với quy hoạch",
  ],
  "Duyệt hồ sơ thiết kế kết cấu": [
    "Đã có kỹ sư kết cấu có chứng chỉ hành nghề ký duyệt",
    "Kích thước móng, cột, dầm, sàn đã tính toán tải trọng phù hợp",
    "Đã khớp với hồ sơ khảo sát địa chất (nếu có)",
  ],
  "Duyệt hồ sơ thiết kế điện nước (M&E)": [
    "Sơ đồ đi dây điện, đường ống nước rõ ràng, đủ chi tiết",
    "Đã tính toán đủ công suất tải điện dự kiến sử dụng",
    "Vị trí công tắc, ổ cắm, đèn phù hợp công năng từng phòng",
  ],
  "Duyệt bản vẽ xin phép xây dựng": [
    "Đúng chỉ tiêu quy hoạch được phép (mật độ, tầng cao, khoảng lùi)",
    "Khớp với bản vẽ kỹ thuật thi công thực tế",
    "Đầy đủ chữ ký, con dấu đơn vị thiết kế có pháp nhân",
  ],
  "Nộp hồ sơ xin phép xây dựng": [
    "Hồ sơ đầy đủ theo quy định (đơn xin phép, bản vẽ, giấy tờ đất...)",
    "Đã nộp đúng cơ quan có thẩm quyền",
    "Đã lưu biên nhận, mã hồ sơ để tra cứu tiến độ",
  ],
  "Nhận Giấy phép xây dựng": [
    "Đúng thông tin chủ đầu tư, thửa đất",
    "Đúng chỉ tiêu quy hoạch (mật độ, tầng cao, khoảng lùi)",
    "Đã đóng phí, lệ phí đầy đủ",
  ],
  "Nghiệm thu cọc ép thử": [
    "Đúng chiều sâu ép theo thiết kế hoặc đạt lực ép dừng (Pmin)",
    "Có biên bản ép cọc, biểu đồ lực ép",
    "Không nghiêng lệch vượt dung sai cho phép",
  ],
  "Nghiệm thu cọc ép đại trà": [
    "Số lượng cọc đúng bản vẽ",
    "Đối chiếu độ sâu ép với cọc thử",
    "Có nhật ký ép từng cây cọc",
    "Đã xử lý các cọc không đạt yêu cầu (nếu có)",
  ],
  "Nghiệm thu định vị tim trục, cốt nền": [
    "Đúng tọa độ tim trục theo bản vẽ",
    "Đúng cao độ cốt nền so với mốc chuẩn",
    "Đã có biên bản trắc đạc",
  ],
  "Nghiệm thu đào đất hố móng": [
    "Đúng kích thước, cao độ đáy móng",
    "Đất nền ổn định, không sụt lún",
    "Đã xử lý nước ngầm/bơm nước đọng (nếu có)",
    "Không phát hiện chướng ngại vật ngầm",
  ],
  "Nghiệm thu cốt thép móng": [
    "Đúng số lượng và đường kính thép theo bản vẽ",
    "Khoảng cách thép đúng thiết kế",
    "Thép sạch, không gỉ nặng",
    "Đã đặt đúng lớp bê tông bảo vệ (con kê)",
  ],
  "Nghiệm thu đổ bê tông móng": [
    "Đúng mác bê tông theo thiết kế",
    "Có phiếu xuất xưởng/hóa đơn bê tông",
    "Đã lấy mẫu nén thử (test cube)",
    "Đầm bê tông kỹ, không rỗ tổ ong",
    "Bảo dưỡng bê tông đúng quy trình (tưới nước)",
  ],
  "Nghiệm thu cốt thép giằng móng": [
    "Đúng số lượng, đường kính thép giằng",
    "Neo thép đúng chiều dài quy định",
    "Đã liên kết chắc với thép cột/móng",
  ],
  "Nghiệm thu hệ thống điện nước âm sàn/âm tường (trước khi tô trát)": [
    "Đường ống điện đi đúng sơ đồ, không đè chồng thép",
    "Đường ống nước cấp/thoát đúng độ dốc, kín nước",
    "Đã thử áp lực đường ống nước",
    "Đã chụp ảnh lưu hồ sơ vị trí trước khi tô trát",
  ],
  "Nghiệm thu xây tô tường bao che": [
    "Xây thẳng, vuông góc, đúng mạch vữa",
    "Tô trát phẳng, không nứt chân chim",
    "Đúng độ dày lớp tô theo thiết kế",
  ],
  "Nghiệm thu chống thấm sàn mái, sân thượng, WC": [
    "Đã xử lý sạch bề mặt trước khi chống thấm",
    "Thi công đủ số lớp chống thấm theo hướng dẫn NSX",
    "Đã thử ngâm nước tối thiểu 24h không thấm",
    "Có biên bản/ảnh test ngâm nước",
  ],
  "Nghiệm thu chống thấm sàn tum, mái tum": [
    "Đã xử lý sạch bề mặt trước khi chống thấm",
    "Thi công đủ số lớp chống thấm theo hướng dẫn NSX",
    "Đã thử ngâm nước tối thiểu 24h không thấm",
  ],
  "Nghiệm thu ốp lát gạch nền, tường": [
    "Gạch đúng chủng loại, mã đã duyệt",
    "Mạch gạch đều, thẳng hàng",
    "Không bị bộp, rỗng dưới gạch (gõ kiểm tra)",
    "Đúng độ dốc thoát nước khu vực ướt",
  ],
  "Nghiệm thu bả matit, sơn nước hoàn thiện": [
    "Bề mặt bả phẳng, không nứt",
    "Đúng mã màu đã duyệt",
    "Sơn đủ số lớp theo tiêu chuẩn NSX",
    "Không bị loang màu, chảy sơn",
  ],
  "Nghiệm thu lắp đặt cửa, cửa sổ": [
    "Đúng kích thước, chủng loại theo hợp đồng",
    "Đóng mở êm, không kẹt",
    "Kín khít, không hở gió/nước mưa",
    "Phụ kiện khóa, tay nắm hoạt động tốt",
  ],
  "Nghiệm thu lắp đặt thiết bị vệ sinh": [
    "Đúng model/màu theo hợp đồng",
    "Cấp thoát nước không rò rỉ",
    "Cố định chắc chắn",
    "Đã test xả nước, đóng mở vòi",
  ],
  "Nghiệm thu hệ thống điện nước hoàn thiện": [
    "Tất cả công tắc, ổ cắm hoạt động đúng",
    "Đã đo thông mạch, không chạm chập",
    "Đèn chiếu sáng đủ, đúng vị trí thiết kế",
    "Đã gắn CB/aptomat đúng công suất tải",
  ],
  "Thử nước chống thấm ban công, sân thượng (ngâm 24h)": [
    "Đã ngâm nước tối thiểu 24h",
    "Không phát hiện thấm dột trần bên dưới",
    "Đã chụp ảnh/quay video làm bằng chứng",
  ],
  "Nghiệm thu lắp đặt tủ bếp, nội thất gắn liền": [
    "Đúng kích thước, thiết kế đã duyệt",
    "Lắp đặt chắc chắn, cân bằng, không xô lệch",
    "Bề mặt, sơn phủ không trầy xước, đúng màu đã chọn",
  ],
  "Nghiệm thu lắp đặt đèn, rèm trang trí": [
    "Đúng vị trí, số lượng theo thiết kế",
    "Đèn chiếu sáng đủ, đúng công suất, không nhấp nháy",
    "Rèm vận hành êm, đúng kích thước che phủ",
  ],
  "Vệ sinh công nghiệp trước bàn giao": [
    "Đã dọn sạch bụi xây dựng toàn bộ sàn, tường, kính",
    "Đã lau chùi thiết bị vệ sinh, bếp, tủ",
    "Đã kiểm tra không còn xà bần, rác thải sót lại",
  ],
  "Nghiệm thu tổng thể trước bàn giao": [
    "Đã hoàn thiện toàn bộ hạng mục theo hợp đồng",
    "Đã khắc phục các lỗi tồn đọng trước đó",
    "Đã dọn vệ sinh công nghiệp toàn bộ công trình",
    "Đã test vận hành điện, nước, thiết bị",
  ],
  "Nghiệm thu bàn giao công trình": [
    "Đã bàn giao hồ sơ hoàn công",
    "Đã bàn giao chìa khóa, thiết bị đi kèm",
    "Đã lập biên bản bàn giao có đủ chữ ký hai bên",
    "Đã thống nhất thời hạn bảo hành",
  ],
  "Hoàn thiện bản vẽ hoàn công": [
    "Bản vẽ hoàn công khớp đúng thực tế thi công (không chỉ theo bản vẽ thiết kế ban đầu)",
    "Đã thể hiện đầy đủ các thay đổi phát sinh trong quá trình thi công",
    "Có xác nhận của đơn vị thiết kế/thi công trên bản vẽ hoàn công",
    "Đã lưu trữ đầy đủ trong hồ sơ dự án",
  ],
};

/** Checklist chung cho mọi mốc "cốt thép + đổ bê tông cột, sàn ..." (tên khác nhau theo tầng) */
const SLAB_CHECKLIST = [
  "Đúng số lượng, đường kính thép cột/sàn theo bản vẽ",
  "Cốp pha kín khít, đúng cao độ",
  "Đã nghiệm thu cốt thép trước khi đổ bê tông",
  "Đúng mác bê tông, có phiếu xuất xưởng",
  "Đã lấy mẫu nén thử (test cube)",
  "Đầm bê tông kỹ, không rỗ tổ ong",
  "Bảo dưỡng bê tông sau đổ (che phủ, tưới nước)",
];

/** Áp dụng cho milestone tự đặt tên, không khớp thư viện chuẩn lẫn nhóm gợi ý nào */
const GENERIC_FALLBACK_CHECKLIST = [
  "Đối chiếu đúng với bản vẽ/thiết kế đã duyệt",
  "Đã chụp ảnh/lưu hồ sơ làm bằng chứng nghiệm thu",
  "Đã ghi nhận vào nhật ký công trình",
];

export function getChecklistForMilestoneName(name: string): string[] {
  if (EXACT_CHECKLISTS[name]) return EXACT_CHECKLISTS[name];
  if (name.includes("cốt thép") && name.includes("đổ bê tông") && (name.includes("sàn") || name.includes("cột") || name.includes("mái"))) {
    return SLAB_CHECKLIST;
  }
  // Không khớp chính xác -> thử khớp theo nhóm gợi ý gần đúng nhất (dựa từ khóa)
  const relevant = getRelevantCategoryNames(name);
  if (relevant.length > 0) {
    const cat = SUGGESTED_CHECKLIST_CATEGORIES.find((c) => c.category === relevant[0]);
    if (cat) return cat.items;
  }
  // Không khớp gì cả -> checklist tổng quát tối thiểu, để KHÔNG milestone nào trống hoàn toàn
  return GENERIC_FALLBACK_CHECKLIST;
}

/**
 * Kho gợi ý mục kiểm tra theo kinh nghiệm giám sát công trình thực tế (không gắn cứng
 * theo tên milestone) — dùng để chọn nhanh khi thêm mục kiểm tra tùy chỉnh cho BẤT KỲ
 * milestone nào, kể cả loại không có trong bộ chuẩn ở trên.
 */
export const SUGGESTED_CHECKLIST_CATEGORIES: { category: string; items: string[] }[] = [
  {
    category: "Chọn thầu & hợp đồng",
    items: [
      "Đã kiểm tra giấy phép kinh doanh, mã số thuế nhà thầu",
      "Đã tham khảo công trình nhà thầu đã thi công trước đó",
      "Đã đối chiếu năng lực nhân sự, thiết bị thi công",
      "Đã đọc kỹ điều khoản phạt vi phạm trong hợp đồng",
      "Đã quy định rõ đơn giá, chủng loại, xuất xứ vật tư",
      "Đợt thanh toán gắn với mốc nghiệm thu rõ ràng",
    ],
  },
  {
    category: "Thiết kế & xin phép",
    items: [
      "Công năng phù hợp nhu cầu sử dụng thực tế",
      "Có kỹ sư kết cấu/thiết kế có chứng chỉ hành nghề ký duyệt",
      "Đúng chỉ tiêu quy hoạch được phép (mật độ, tầng cao, khoảng lùi)",
      "Hồ sơ xin phép đầy đủ theo quy định, nộp đúng cơ quan thẩm quyền",
    ],
  },
  {
    category: "Định vị & trắc đạc",
    items: [
      "Đúng tọa độ tim trục theo bản vẽ quy hoạch",
      "Đúng cao độ cốt nền so với mốc chuẩn (mốc lộ giới/mốc quy hoạch)",
      "Đã có biên bản trắc đạc xác nhận của đơn vị đo đạc",
      "Kiểm tra lại bằng máy toàn đạc/thủy bình trước khi triển khai móng",
      "Đã đối chiếu khoảng lùi, ranh đất với hàng xóm",
    ],
  },
  {
    category: "Ép cọc",
    items: [
      "Đúng chiều sâu ép hoặc đạt lực ép dừng (Pmin) theo thiết kế",
      "Có biên bản ép cọc, biểu đồ lực ép từng cây",
      "Không nghiêng lệch vượt dung sai cho phép",
      "Đối chiếu độ sâu ép đại trà với cọc ép thử",
      "Đã khảo sát hiện trạng nhà lân cận trước khi ép (đo vết nứt, rung chấn)",
    ],
  },
  {
    category: "Kết cấu bê tông cốt thép",
    items: [
      "Thép đúng mác, có chứng chỉ CO/CQ",
      "Nối thép đúng chiều dài neo/nối chồng theo tiêu chuẩn",
      "Đã nghiệm thu cốt thép trước khi đổ bê tông (không bị che khuất)",
      "Cốp pha kín khít, không biến dạng, đủ khả năng chịu tải",
      "Tháo cốp pha đúng thời gian dưỡng hộ tối thiểu",
      "Bê tông không bị phân tầng, tách nước khi đổ",
      "Đã xử lý mạch ngừng thi công đúng kỹ thuật",
      "Độ sụt bê tông (slump test) đạt yêu cầu trước khi đổ",
    ],
  },
  {
    category: "Chống thấm",
    items: [
      "Đã xử lý kỹ góc chân tường, cổ ống xuyên sàn",
      "Test ngâm nước tối thiểu 24–48h không thấm",
      "Có lớp bảo vệ chống thấm sau khi thi công (tránh bong tróc khi cán nền)",
      "Chống thấm trước khi cán nền/ốp lát, không làm ngược quy trình",
    ],
  },
  {
    category: "Điện",
    items: [
      "Dây điện đúng tiết diện theo tải sử dụng",
      "Đi ống luồn dây bảo vệ, không đi dây trần âm tường",
      "Đã đo cách điện, thông mạch từng tuyến trước khi đóng trần/tô trát",
      "Tủ điện có đủ CB tổng, CB nhánh, chống giật (ELCB/RCD)",
      "Đã lắp hệ thống tiếp địa (nối đất) an toàn",
      "Sơ đồ điện bàn giao khớp đúng thực tế thi công",
    ],
  },
  {
    category: "Cấp thoát nước",
    items: [
      "Đường ống cấp nước đã thử áp lực, không rò rỉ tại mối nối",
      "Đường ống thoát nước đúng độ dốc tối thiểu (~2%)",
      "Hố ga, bể phốt đúng vị trí, kích thước theo bản vẽ",
      "Đã lắp van khóa tổng và van khóa từng khu vực",
    ],
  },
  {
    category: "Chống mối, chống ẩm",
    items: [
      "Đã xử lý thuốc chống mối nền trước khi đổ bê tông",
      "Đã xử lý chống ẩm chân tường tiếp giáp đất",
    ],
  },
  {
    category: "An toàn lao động",
    items: [
      "Công nhân có đầy đủ đồ bảo hộ, dây an toàn khi làm việc trên cao",
      "Giàn giáo, cốp pha đã kiểm tra chắc chắn trước khi thi công",
      "Có biển báo, rào chắn khu vực nguy hiểm",
      "Điện thi công tạm có CB chống giật riêng biệt",
    ],
  },
  {
    category: "Vật tư",
    items: [
      "Đúng chủng loại, xuất xứ theo hợp đồng (không phải hàng giả/nhái)",
      "Có hóa đơn, chứng từ, CO/CQ đầy đủ",
      "Đã kiểm đếm số lượng, quy cách trước khi thi công",
      "Vật tư bảo quản đúng cách tại công trình (tránh ẩm ướt, mưa nắng làm hỏng)",
    ],
  },
  {
    category: "Hoàn thiện & thẩm mỹ",
    items: [
      "Bề mặt phẳng, không gợn sóng khi soi đèn rọi ngang",
      "Màu sắc đồng đều giữa các đợt thi công khác nhau",
      "Các đường ron, mạch thẳng đều, đúng khoảng cách",
      "Không có vết nứt, bong tróc, ố màu",
    ],
  },
  {
    category: "Vệ sinh & bàn giao",
    items: [
      "Đã dọn dẹp xà bần, rác thải xây dựng sau khi hoàn thành hạng mục",
      "Đã che chắn bảo vệ hạng mục hoàn thiện khỏi hư hại bởi công đoạn sau",
      "Đã vệ sinh công nghiệp khu vực trước khi bàn giao",
    ],
  },
  {
    category: "Pháp lý & hồ sơ",
    items: [
      "Đã lưu biên bản nghiệm thu công đoạn (giấy hoặc trong app)",
      "Đã chụp ảnh/quay video hiện trạng làm bằng chứng",
      "Đối chiếu đúng với bản vẽ đã được duyệt",
    ],
  },
];

/** Từ khóa trong tên milestone -> nhóm gợi ý liên quan (khớp nhiều từ khóa thì gộp nhiều nhóm) */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Chọn thầu & hợp đồng": ["năng lực nhà thầu", "hợp đồng thi công"],
  "Thiết kế & xin phép": ["duyệt phương án", "phối cảnh", "thiết kế kết cấu", "thiết kế điện nước", "bản vẽ xin phép", "nộp hồ sơ xin phép"],
  "Định vị & trắc đạc": ["tim trục", "cốt nền", "trắc đạc", "định vị"],
  "Ép cọc": ["cọc"],
  "Kết cấu bê tông cốt thép": ["cốt thép", "bê tông", "móng", "cột", "sàn", "giằng", "dầm", "mái", "tum", "sân thượng"],
  "Chống thấm": ["chống thấm", "thấm"],
  "Điện": ["điện"],
  "Cấp thoát nước": ["nước"],
  "Chống mối, chống ẩm": ["mối", "chống ẩm"],
  "An toàn lao động": ["an toàn"],
  "Vật tư": ["vật tư"],
  "Hoàn thiện & thẩm mỹ": ["ốp lát", "sơn", "bả matit", "cửa", "thiết bị vệ sinh", "tô ", "trát"],
  "Vệ sinh & bàn giao": ["bàn giao", "vệ sinh"],
  "Pháp lý & hồ sơ": ["giấy phép", "hồ sơ", "hoàn công"],
};

/**
 * Tên các nhóm liên quan tới 1 milestone, dựa vào từ khóa trong tên mốc —
 * để chỉ gợi ý checklist đúng chuyên môn (VD "Nghiệm thu định vị tim trục, cốt nền"
 * chỉ hiện nhóm "Định vị & trắc đạc", không hiện nhóm "Điện"). Không khớp từ khóa nào
 * thì trả về rỗng, nơi gọi tự quyết định hiện toàn bộ.
 */
export function getRelevantCategoryNames(milestoneName: string): string[] {
  const lower = milestoneName.toLowerCase();
  const matched = new Set<string>();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) matched.add(category);
  }
  return [...matched];
}

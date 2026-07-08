/**
 * Knowledge Base — module "Kiểm soát khởi công & nền móng" (Pre-Construction & Foundation Control).
 * Nội dung tham khảo thực tế, đúc kết theo kinh nghiệm quản lý dự án xây dựng nhà ở dân dụng VN.
 * Nội dung tĩnh (không lưu DB) — hiển thị làm tài liệu tra cứu nhanh, không phải checklist thao tác.
 */

export type KnowledgeArticle = {
  topic: string;
  summary: string;
  points: string[];
};

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    topic: "Chuẩn bị trước khi thi công",
    summary: "Những việc phải xong trước ngày đầu tiên đưa quân vào công trường.",
    points: [
      "Hồ sơ pháp lý đầy đủ: giấy phép xây dựng, sổ hồng/sổ đỏ, bản vẽ đã duyệt",
      "Hợp đồng thi công đã ký, có phụ lục bản vẽ + tiến độ + đơn giá vật tư",
      "Đã khảo sát địa chất, có báo cáo khoan khảo sát (SPT) làm căn cứ thiết kế móng",
      "Đã khảo sát/ghi nhận hiện trạng nhà lân cận (nếu có nhà liền kề)",
      "Đã xác định ranh đất, tim móng, cao độ chuẩn bằng trắc đạc",
      "Đã chuẩn bị điện nước tạm phục vụ thi công",
      "Đã thông báo khởi công cho chính quyền địa phương và các hộ liền kề",
    ],
  },
  {
    topic: "Bảng tiến độ thi công",
    summary: "Cách lập và quản lý tiến độ tổng để kiểm soát toàn bộ dự án.",
    points: [
      "Chia dự án thành các giai đoạn lớn (WBS): tìm thầu, thiết kế, xin phép, ép cọc, thô, hoàn thiện, nội thất, hoàn công",
      "Mỗi giai đoạn gắn tỷ trọng (%) để tính tiến độ tổng gia quyền, không tính theo số ngày đơn thuần",
      "Mỗi giai đoạn có các mốc nghiệm thu (milestone) với ngày dự kiến rõ ràng, không chỉ nằm chung chung",
      "Đánh dấu rõ các Hold Point — bước bắt buộc nghiệm thu đạt mới được thi công tiếp",
      "Cập nhật tiến độ thực tế (% hoàn thành) định kỳ, so sánh với kế hoạch để phát hiện trễ sớm",
      "Lưu nhật ký công trình hằng ngày làm bằng chứng khi cần gia hạn tiến độ hợp lệ (mưa bão, sự cố)",
    ],
  },
  {
    topic: "Thông báo khởi công xây dựng",
    summary: "Thủ tục bắt buộc trước khi chính thức đưa máy móc, nhân công vào công trường.",
    points: [
      "Theo Luật Xây dựng, chủ đầu tư phải thông báo khởi công cho UBND cấp xã/phường nơi xây dựng",
      "Thông báo gửi kèm: giấy phép xây dựng, tên nhà thầu thi công, tên đơn vị giám sát (nếu có)",
      "Nên thông báo bằng văn bản, lưu biên nhận để đối chiếu khi có tranh chấp/kiểm tra sau này",
      "Nên thông báo/thỏa thuận thêm với các hộ liền kề về thời gian, giờ giấc thi công để tránh khiếu nại",
      "Thời điểm thông báo: trước ngày khởi công thực tế theo quy định của địa phương (thường vài ngày)",
    ],
  },
  {
    topic: "Điều kiện được khởi công",
    summary: "Các điều kiện pháp lý và kỹ thuật bắt buộc phải có trước khi khởi công.",
    points: [
      "Đã có Giấy phép xây dựng còn hiệu lực (trừ trường hợp được miễn phép theo quy định)",
      "Đã có mặt bằng xây dựng hợp pháp (đã giải phóng mặt bằng nếu cần)",
      "Đã có thiết kế bản vẽ thi công được duyệt, đủ điều kiện triển khai",
      "Đã có hợp đồng thi công với nhà thầu đủ năng lực",
      "Đã có biện pháp thi công, biện pháp an toàn lao động, phòng chống cháy nổ phù hợp",
      "Đã bố trí đủ nhân lực, thiết bị, biện pháp bảo vệ môi trường theo quy định",
      "Khởi công khi chưa đủ điều kiện có thể bị đình chỉ thi công và xử phạt hành chính",
    ],
  },
  {
    topic: "Xác định ranh lô đất xây dựng",
    summary: "Đo đạc, định vị chính xác ranh đất trước khi triển khai móng.",
    points: [
      "Thuê đơn vị trắc đạc có chuyên môn để đo đạc lại ranh đất thực tế, không chỉ dựa vào sổ hồng",
      "Đối chiếu số liệu đo đạc thực tế với ranh đất trên giấy chứng nhận quyền sử dụng đất",
      "Xác định đúng chỉ giới xây dựng, khoảng lùi theo quy hoạch được duyệt",
      "Mời các hộ liền kề cùng xác nhận ranh giới (nếu có thể) để tránh tranh chấp sau này",
      "Lập biên bản xác định ranh đất, tim móng, cao độ có chữ ký của đơn vị trắc đạc/thi công",
      "Đây là bước bắt buộc trước khi đào móng — sai ranh đất có thể dẫn đến buộc phá dỡ phần vi phạm",
    ],
  },
  {
    topic: "Ghi nhận hiện trạng nhà kế bên",
    summary: "Bằng chứng pháp lý quan trọng nhất khi có tranh chấp lún nứt.",
    points: [
      "Bắt buộc thực hiện TRƯỚC khi ép cọc/đào móng — không làm sau khi đã lỡ thi công",
      "Chụp ảnh/quay video toàn bộ hiện trạng: tường, trần, nền, các vết nứt sẵn có (nếu có)",
      "Lập biên bản ghi nhận hiện trạng có chữ ký xác nhận của chủ nhà liền kề",
      "Nếu chủ nhà liền kề không hợp tác, vẫn nên chụp ảnh/quay video từ bên ngoài và lập vi bằng nếu cần",
      "Lưu hồ sơ vào mục Hồ sơ dự án, gắn với module Rủi ro để dễ tra cứu khi có khiếu nại",
      "Khảo sát tương tự cho hạ tầng công cộng lân cận (vỉa hè, đường ống) nếu công trình sát ranh",
    ],
  },
  {
    topic: "Giám sát thi công",
    summary: "Vai trò và trách nhiệm của đơn vị/người giám sát công trình.",
    points: [
      "Giám sát thi công (giám sát kỹ thuật) chịu trách nhiệm kiểm tra chất lượng, khối lượng, tiến độ thực tế",
      "Có mặt tại các mốc nghiệm thu quan trọng: cốt thép, đổ bê tông, chống thấm, nghiệm thu công đoạn",
      "Kiểm tra vật tư đầu vào đúng chủng loại, xuất xứ so với hợp đồng trước khi cho phép sử dụng",
      "Lập biên bản nghiệm thu cho từng công đoạn, có chữ ký xác nhận",
      "Có thể là CĐT tự giám sát (nhà nhỏ) hoặc thuê đơn vị giám sát chuyên nghiệp (khuyến khích với nhà nhiều tầng)",
      "Giám sát độc lập với nhà thầu thi công để đảm bảo tính khách quan",
    ],
  },
  {
    topic: "Giám sát tác giả",
    summary: "Vai trò của đơn vị thiết kế trong quá trình thi công.",
    points: [
      "Giám sát tác giả là trách nhiệm của đơn vị/kiến trúc sư thiết kế theo dõi thi công có đúng bản vẽ",
      "Phát hiện và xử lý các sai khác giữa thiết kế và điều kiện thi công thực tế (địa chất, kết cấu lân cận...)",
      "Tham gia nghiệm thu các công đoạn quan trọng liên quan đến kết cấu, kiến trúc",
      "Đề xuất điều chỉnh thiết kế khi cần thiết, có văn bản xác nhận thay đổi (nếu có phát sinh)",
      "Khác với giám sát thi công: giám sát tác giả tập trung vào ĐÚNG Ý ĐỒ THIẾT KẾ, không chỉ chất lượng thi công",
    ],
  },
  {
    topic: "Động thổ – khởi công",
    summary: "Nghi thức và các bước thực tế khi bắt đầu thi công.",
    points: [
      "Động thổ thường là nghi lễ tâm linh trước khi thi công (chọn ngày giờ tốt theo phong thủy nếu gia chủ coi trọng)",
      "Khởi công thực tế là thời điểm chính thức đưa máy móc, nhân công vào công trường thi công",
      "Cần hoàn tất thông báo khởi công với chính quyền trước ngày này",
      "Chuẩn bị đầy đủ mặt bằng, hàng rào, biển báo công trình trước ngày động thổ",
      "Chụp ảnh/lưu hồ sơ ngày động thổ — mốc thời gian quan trọng để tính tiến độ hợp đồng",
    ],
  },
  {
    topic: "Chuẩn bị mặt bằng",
    summary: "Các công việc dọn dẹp, rào chắn, bố trí trước khi thi công.",
    points: [
      "Dọn dẹp cây cối, chướng ngại vật trên mặt bằng xây dựng",
      "Rào chắn công trình, biển báo an toàn, biển thông tin công trình theo quy định",
      "Bố trí lối vào cho xe vận chuyển vật tư, xe cẩu (nếu cần)",
      "Xác định vị trí tập kết vật tư, kho bãi tạm, nhà vệ sinh công nhân",
      "Đấu nối điện nước tạm phục vụ thi công",
      "Nếu thuê/mượn mặt bằng của bên thứ ba, cần có biên bản bàn giao mặt bằng rõ ràng",
    ],
  },
  {
    topic: "Phá dỡ công trình cũ",
    summary: "Quy trình phá dỡ an toàn khi xây lại trên nền nhà cũ.",
    points: [
      "Kiểm tra xem công trình cũ có cần xin phép phá dỡ riêng theo quy định địa phương",
      "Ngắt toàn bộ điện, nước, gas trước khi phá dỡ để đảm bảo an toàn",
      "Có biện pháp phá dỡ phù hợp, tránh ảnh hưởng kết cấu/nhà liền kề (đặc biệt nhà phố sát vách)",
      "Che chắn bụi, tiếng ồn, thời gian phá dỡ phù hợp quy định địa phương",
      "Xử lý phế thải xây dựng đúng nơi quy định, không đổ bừa bãi",
      "Ghi nhận hiện trạng nhà lân cận TRƯỚC khi phá dỡ (tương tự trước khi ép cọc)",
    ],
  },
  {
    topic: "Gia cố nền móng khi thi công tầng hầm",
    summary: "Các biện pháp kỹ thuật khi công trình có tầng hầm, cần chống sạt lở hố đào sâu.",
    points: [
      "Đào hố móng sâu (tầng hầm) có nguy cơ sạt lở, ảnh hưởng công trình lân cận — cần biện pháp chống đỡ",
      "Các biện pháp phổ biến: tường vây (barrette/cừ larsen), neo đất, chống văng (shoring)",
      "Cần có thiết kế biện pháp thi công hố đào riêng, do kỹ sư kết cấu tính toán",
      "Quan trắc lún, chuyển vị công trình lân cận trong suốt quá trình đào và thi công tầng hầm",
      "Có phương án thoát nước, chống ngập hố móng trong mùa mưa",
      "Đây là hạng mục rủi ro cao nhất về mặt an toàn — bắt buộc có biện pháp thi công được duyệt trước khi đào",
    ],
  },
  {
    topic: "Cọc tre / cừ tràm",
    summary: "Giải pháp gia cố nền truyền thống cho đất yếu, tải trọng nhẹ.",
    points: [
      "Phù hợp với nền đất yếu, công trình tải trọng nhẹ (nhà cấp 4, 1-2 tầng) ở khu vực đất bùn/sình",
      "Cọc tre/cừ tràm phải luôn ngập trong nước ngầm để không bị mục — nếu mực nước ngầm thấp sẽ giảm tuổi thọ",
      "Mật độ đóng cọc theo thiết kế địa phương/kinh nghiệm khu vực (thường 16-25 cọc/m²)",
      "Không phù hợp với công trình cao tầng hoặc tải trọng lớn — cần đánh giá kỹ trước khi chọn giải pháp này",
      "Chi phí thấp hơn nhiều so với cọc bê tông nhưng độ tin cậy lâu dài thấp hơn",
    ],
  },
  {
    topic: "Cọc bê tông cốt thép / cọc ly tâm",
    summary: "Giải pháp móng cọc phổ biến cho nhà phố, biệt thự nhiều tầng.",
    points: [
      "Cọc bê tông cốt thép (cọc vuông đúc sẵn) hoặc cọc ly tâm (ống tròn ứng suất trước) chịu tải tốt hơn cọc tre",
      "Chiều dài, số lượng cọc tính toán dựa trên kết quả khảo sát địa chất và tải trọng công trình",
      "Cần ép thử vài cọc trước để đối chiếu với thiết kế trước khi ép đại trà",
      "Kiểm tra chất lượng cọc trước khi ép: không nứt, không rỗ, đúng mác bê tông, có chứng chỉ xuất xưởng",
      "Theo dõi lực ép, độ sâu từng cây cọc — lập nhật ký ép cọc đầy đủ làm hồ sơ nghiệm thu",
      "Xử lý mối nối cọc đúng kỹ thuật (hàn, bản mã) nếu phải nối nhiều đoạn cọc",
    ],
  },
  {
    topic: "Ép cọc neo, ép tải, khoan nhồi",
    summary: "Các phương pháp thi công cọc phổ biến — chọn theo điều kiện mặt bằng và tải trọng.",
    points: [
      "Ép neo: dùng neo đất tạo phản lực ép cọc — phù hợp mặt bằng chật hẹp, nhà phố xen kẽ",
      "Ép tải (ép robot/ép bằng đối trọng): dùng khối tải bê tông tạo phản lực — cần mặt bằng rộng hơn, lực ép lớn hơn",
      "Khoan nhồi: khoan tạo lỗ rồi đổ bê tông tại chỗ — phù hợp công trình cao tầng, tải trọng rất lớn, ít gây rung chấn",
      "Ép neo/ép tải phù hợp nhà phố 1-5 tầng; khoan nhồi thường dùng cho công trình lớn hơn hoặc nền đất đặc biệt",
      "Rung chấn khi ép cọc (đặc biệt ép tải) có thể ảnh hưởng nhà lân cận — cần khảo sát hiện trạng trước",
      "Luôn yêu cầu biên bản ép cọc + biểu đồ lực ép cho từng cây, lưu làm hồ sơ nghiệm thu",
    ],
  },
];

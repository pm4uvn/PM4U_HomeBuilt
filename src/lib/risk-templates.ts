import type { PhaseType, RiskCategory, RiskSeverity } from "@prisma/client";

export type RiskTemplateItem = {
  title: string;
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  mitigationActions: string[];
};

/**
 * Danh mục rủi ro thường gặp theo từng giai đoạn xây nhà phố/biệt thự tại VN,
 * đúc kết từ kinh nghiệm quản lý dự án xây dựng dân dụng thực tế (top 10/giai đoạn).
 * Mỗi rủi ro kèm nhiều hoạt động giảm thiểu cụ thể (không chỉ 1 câu chung chung).
 * Dùng làm gợi ý để CĐT thêm nhanh vào Sổ rủi ro, không phải rủi ro đã xảy ra.
 */
export const RISK_TEMPLATES: Partial<Record<PhaseType, RiskTemplateItem[]>> = {
  TENDERING: [
    {
      title: "Chọn nhà thầu bỏ giá thấp bất thường",
      category: "CONTRACTOR_VENDOR",
      severity: "HIGH",
      description: "Giá thầu thấp hơn hẳn mặt bằng chung thường dẫn tới bớt xén vật tư hoặc phát sinh đội giá về sau.",
      mitigationActions: [
        "So sánh tối thiểu 3 báo giá cùng một hạng mục công việc",
        "Yêu cầu bóc tách khối lượng chi tiết trước khi ký, không chọn theo giá thấp nhất",
        "Hỏi rõ lý do nếu giá chênh lệch quá 15-20% so với mặt bằng chung",
      ],
    },
    {
      title: "Hợp đồng thiếu điều khoản phạt chậm tiến độ / bảo lãnh thực hiện",
      category: "CONTRACTOR_VENDOR",
      severity: "HIGH",
      description: "Không có ràng buộc phạt/bảo lãnh khiến nhà thầu không chịu áp lực giữ tiến độ và chất lượng.",
      mitigationActions: [
        "Thêm điều khoản phạt trễ tiến độ theo ngày/tuần vào hợp đồng",
        "Giữ lại tiền bảo hành (retention 3-5%) đến hết thời gian bảo hành",
        "Quy định rõ các mốc nghiệm thu gắn với từng đợt thanh toán",
      ],
    },
    {
      title: "Không kiểm tra năng lực thực tế của nhà thầu",
      category: "CONTRACTOR_VENDOR",
      severity: "MEDIUM",
      description: "Chỉ xem hồ sơ năng lực trên giấy, không đi xem công trình thực tế đã/đang thi công.",
      mitigationActions: [
        "Đến trực tiếp 1-2 công trình nhà thầu đã làm để xem chất lượng thực tế",
        "Hỏi chủ nhà cũ về thái độ xử lý phát sinh và bảo hành",
        "Kiểm tra đội ngũ nhân sự cố định vs thuê ngoài theo công trình",
      ],
    },
    {
      title: "Thiếu hợp đồng bằng văn bản, chỉ thỏa thuận miệng",
      category: "CONTRACTOR_VENDOR",
      severity: "HIGH",
      description: "Thỏa thuận miệng không có giá trị pháp lý khi xảy ra tranh chấp về khối lượng, giá cả, tiến độ.",
      mitigationActions: [
        "Luôn ký hợp đồng văn bản đầy đủ điều khoản trước khi cho vào công trường",
        "Áp dụng kể cả với nhà thầu quen biết/người thân",
        "Lưu giữ các phụ lục/biên bản thỏa thuận bổ sung bằng văn bản",
      ],
    },
    {
      title: "Không rõ ràng khoán trọn gói hay vật tư CĐT cung cấp",
      category: "CONTRACTOR_VENDOR",
      severity: "MEDIUM",
      description: "Mập mờ giữa nhân công/vật tư khoán và phần CĐT tự mua dễ gây tranh cãi khi quyết toán.",
      mitigationActions: [
        "Ghi rõ trong hợp đồng danh mục vật tư nhà thầu cung cấp và danh mục CĐT tự mua",
        "Kèm đơn giá tham chiếu cho từng loại vật tư",
        "Thống nhất cách xử lý khi CĐT đổi ý muốn tự mua thêm hạng mục",
      ],
    },
    {
      title: "Chọn nhà thầu ở xa, khó giám sát khi có sự cố",
      category: "CONTRACTOR_VENDOR",
      severity: "MEDIUM",
      description: "Thầu ở xa phản hồi chậm khi có sự cố phát sinh, tăng chi phí đi lại và khó kiểm soát chất lượng thường xuyên.",
      mitigationActions: [
        "Ưu tiên nhà thầu có đội thi công tại địa phương",
        "Yêu cầu cam kết thời gian phản hồi sự cố cụ thể trong hợp đồng",
        "Chỉ định người giám sát công trình có mặt thường xuyên nếu thầu ở xa",
      ],
    },
    {
      title: "Không kiểm tra pháp lý/bảo hiểm của nhà thầu",
      category: "CONTRACTOR_VENDOR",
      severity: "MEDIUM",
      description: "Nhà thầu không có đăng ký kinh doanh hoặc bảo hiểm tai nạn lao động gây rủi ro pháp lý cho CĐT khi có sự cố.",
      mitigationActions: [
        "Yêu cầu bản sao giấy phép kinh doanh/mã số thuế",
        "Xác nhận có mua bảo hiểm tai nạn lao động cho công nhân",
        "Lưu hồ sơ pháp lý nhà thầu kèm hợp đồng",
      ],
    },
    {
      title: "Thiếu quy định rõ tiến độ thanh toán theo khối lượng thực tế",
      category: "COST",
      severity: "MEDIUM",
      description: "Thanh toán theo % ước lượng thay vì khối lượng nghiệm thu thực tế dễ bị trả vượt so với tiến độ thật.",
      mitigationActions: [
        "Gắn mỗi đợt thanh toán với mốc nghiệm thu khối lượng cụ thể",
        "Yêu cầu biên bản xác nhận khối lượng trước khi giải ngân",
        "Không tạm ứng vượt quá % khối lượng đã hoàn thành thực tế",
      ],
    },
    {
      title: "Không có điều khoản xử lý khi nhà thầu bỏ ngang công trình",
      category: "CONTRACTOR_VENDOR",
      severity: "HIGH",
      description: "Thiếu cơ chế xử phạt/thay thế khi nhà thầu ngưng thi công giữa chừng khiến dự án đình trệ kéo dài.",
      mitigationActions: [
        "Quy định rõ mức phạt khi đơn phương ngừng thi công không lý do",
        "Quy định quyền CĐT thuê đơn vị khác tiếp tục và trừ vào tiền giữ lại",
        "Lập biên bản nghiệm thu khối lượng dở dang nếu buộc phải chấm dứt hợp đồng",
      ],
    },
    {
      title: "Báo giá mập mờ, không tách rõ hạng mục",
      category: "COST",
      severity: "MEDIUM",
      description: "Báo giá gộp chung nhiều hạng mục khiến khó so sánh giữa các nhà thầu và dễ bị đội giá phát sinh sau này.",
      mitigationActions: [
        "Yêu cầu báo giá bóc tách theo từng đầu mục công việc/vật tư riêng biệt",
        "Yêu cầu ghi rõ đơn giá và khối lượng cho từng hạng mục",
        "So sánh báo giá theo cùng 1 mẫu bảng bóc tách giữa các nhà thầu",
      ],
    },
  ],
  DESIGN_CONCEPT: [
    {
      title: "Thay đổi thiết kế giữa chừng do chưa chốt công năng",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Đổi ý về công năng/phong thủy sau khi đã thi công gây đập bỏ làm lại, phát sinh chi phí và thời gian.",
      mitigationActions: [
        "Duyệt kỹ mặt bằng công năng và phối cảnh 3D trước khi chuyển sang thiết kế kỹ thuật",
        "Tổ chức họp chốt phương án cuối cùng có ký xác nhận trước khi thi công",
        "Hạn chế đổi ý sau khi đã ký duyệt bản vẽ",
      ],
    },
    {
      title: "Chưa khảo sát địa chất trước khi thiết kế móng",
      category: "UNDERGROUND_OBSTACLE",
      severity: "HIGH",
      description: "Thiết kế móng dựa trên giả định thay vì số liệu khoan khảo sát thực tế, dễ sai tải trọng/độ sâu cọc.",
      mitigationActions: [
        "Thuê đơn vị khoan khảo sát địa chất (SPT) tại vị trí xây dựng",
        "Chờ có báo cáo địa chất trước khi kỹ sư kết cấu tính toán móng",
        "So sánh kết quả khảo sát với các công trình lân cận đã xây",
      ],
    },
    {
      title: "Thiếu khảo sát hạ tầng xung quanh (cấp thoát nước, điện, lối vào)",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Không kiểm tra điểm đấu nối điện nước, đường vào cho xe chở vật tư/cẩu, gây phát sinh khi thi công.",
      mitigationActions: [
        "Khảo sát hiện trạng hạ tầng lân cận trước khi thiết kế",
        "Thỏa thuận lối vào công trình cho xe vật tư trước khi khởi công",
        "Xác định điểm đấu nối điện nước tạm thi công",
      ],
    },
    {
      title: "Thiết kế không phù hợp phong thủy dẫn đến sửa lại",
      category: "DESIGN_TECHNICAL",
      severity: "LOW",
      description: "Chưa xem phong thủy trước khi chốt phương án khiến phải sửa hướng cửa, cầu thang, bếp sau khi đã thiết kế xong.",
      mitigationActions: [
        "Tham vấn phong thủy song song với giai đoạn concept nếu gia chủ coi trọng",
        "Chốt hướng cửa chính, bếp, cầu thang trước khi vẽ thiết kế kỹ thuật",
      ],
    },
    {
      title: "Không tính đến hướng nắng/gió khi bố trí phòng",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Bố trí phòng ngủ/bếp sai hướng gây nóng bức, tốn điện làm mát về lâu dài, khó khắc phục sau khi xây xong.",
      mitigationActions: [
        "Yêu cầu kiến trúc sư phân tích hướng nắng/gió khu đất",
        "Ưu tiên hướng Đông/Đông Nam cho phòng ngủ, tránh Tây cho phòng sinh hoạt chính",
        "Bố trí ô thoáng/giếng trời hỗ trợ đối lưu không khí",
      ],
    },
    {
      title: "Diện tích đất thực tế khác với giấy tờ",
      category: "LEGAL_PERMIT",
      severity: "HIGH",
      description: "Đo đạc thiết kế theo sổ hồng nhưng thực tế đất bị lấn chiếm/sai lệch ranh giới gây tranh chấp khi thi công.",
      mitigationActions: [
        "Thuê trắc đạc đo đạc lại ranh đất thực tế",
        "Đối chiếu số liệu đo đạc với sổ hồng trước khi chốt thiết kế",
        "Giải quyết dứt điểm tranh chấp ranh giới (nếu có) trước khi xây dựng",
      ],
    },
    {
      title: "Chưa thống nhất ý kiến các thành viên gia đình trước khi chốt phương án",
      category: "DESIGN_TECHNICAL",
      severity: "LOW",
      description: "Thiếu đồng thuận trong gia đình dễ dẫn đến yêu cầu sửa thiết kế nhiều lần, kéo dài giai đoạn concept.",
      mitigationActions: [
        "Tổ chức họp thống nhất phương án với đầy đủ thành viên liên quan",
        "Chốt và ký duyệt phương án cuối cùng trước khi chuyển bước thiết kế kỹ thuật",
      ],
    },
    {
      title: "Thiết kế vượt quá ngân sách dự kiến ngay từ đầu",
      category: "COST",
      severity: "HIGH",
      description: "Phương án thiết kế đẹp nhưng vượt xa ngân sách khiến phải cắt giảm hạng mục giữa chừng, ảnh hưởng chất lượng tổng thể.",
      mitigationActions: [
        "Chốt khung ngân sách rõ ràng trước khi thiết kế",
        "Yêu cầu kiến trúc sư dự toán sơ bộ theo m2 xây dựng ngay ở bước concept",
        "Rà soát lại phương án nếu dự toán sơ bộ vượt ngân sách quá 10%",
      ],
    },
    {
      title: "Không dự trù không gian kỹ thuật (phòng máy, hộp gen, ống kỹ thuật)",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Thiếu không gian cho máy bơm nước, máy lạnh trung tâm, ống kỹ thuật khiến phải xử lý chắp vá sau này.",
      mitigationActions: [
        "Yêu cầu bố trí sẵn hộp kỹ thuật, vị trí đặt máy móc trong bản vẽ concept",
        "Xác định sớm nhu cầu máy lạnh trung tâm/năng lượng mặt trời để chừa không gian kỹ thuật",
      ],
    },
    {
      title: "Bỏ qua khả năng mở rộng/sửa chữa trong tương lai",
      category: "DESIGN_TECHNICAL",
      severity: "LOW",
      description: "Thiết kế cứng nhắc không chừa phương án nâng tầng hoặc cải tạo sau này gây tốn kém khi có nhu cầu mở rộng.",
      mitigationActions: [
        "Trao đổi với kỹ sư kết cấu về khả năng chịu tải dự phòng nếu có kế hoạch nâng tầng",
        "Cân nhắc chừa sẵn cầu thang/không gian kỹ thuật cho việc mở rộng sau này",
      ],
    },
  ],
  DESIGN_TECHNICAL: [
    {
      title: "Bản vẽ kết cấu và điện nước (M&E) xung đột",
      category: "DESIGN_TECHNICAL",
      severity: "HIGH",
      description: "Đường ống điện nước đi xuyên dầm sai vị trí, đục phá kết cấu khi thi công để sửa cho khớp.",
      mitigationActions: [
        "Yêu cầu kiến trúc sư/kỹ sư kết cấu và M&E rà soát chồng bản vẽ (overlay)",
        "Xử lý mọi xung đột trên bản vẽ trước khi thi công, không để đến hiện trường mới phát hiện",
      ],
    },
    {
      title: "Thiếu bản vẽ chi tiết chống thấm sàn mái/sân thượng/WC",
      category: "DESIGN_TECHNICAL",
      severity: "HIGH",
      description: "Đây là nguyên nhân gây thấm dột phổ biến nhất ở nhà phố nếu không có chi tiết chống thấm rõ ràng.",
      mitigationActions: [
        "Yêu cầu bản vẽ chi tiết lớp chống thấm và độ dốc thoát nước cho từng khu vực",
        "Quy định quy trình nghiệm thu chống thấm trước khi cán nền/lát gạch",
        "Chọn vật liệu chống thấm có bảo hành rõ ràng",
      ],
    },
    {
      title: "Khối lượng dự toán (BOQ) sai sót, thiếu hạng mục",
      category: "COST",
      severity: "MEDIUM",
      description: "Bóc tách khối lượng thiếu dẫn đến báo giá ban đầu thấp hơn thực tế, phát sinh nhiều lần sau này.",
      mitigationActions: [
        "Rà soát BOQ với đơn vị bóc tách độc lập trước khi ký hợp đồng thi công",
        "Đối chiếu BOQ với bản vẽ kỹ thuật đầy đủ các hạng mục",
      ],
    },
    {
      title: "Thiếu bản vẽ shop drawing chi tiết cho nhà thầu thi công",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Nhà thầu tự suy diễn chi tiết thi công khi thiếu shop drawing, dễ sai lệch so với ý đồ thiết kế.",
      mitigationActions: [
        "Yêu cầu đơn vị thiết kế cung cấp shop drawing cho chi tiết phức tạp (cầu thang, mái, ban công)",
        "Duyệt shop drawing trước khi nhà thầu triển khai thi công thực tế",
      ],
    },
    {
      title: "Tải trọng thiết kế chưa tính đến thay đổi công năng sau này",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Dự định làm hồ bơi/sân vườn trên mái nhưng kết cấu ban đầu không tính tải trọng này gây nguy hiểm hoặc phải gia cố tốn kém.",
      mitigationActions: [
        "Thông báo rõ dự định sử dụng đặc biệt trên mái/sân thượng cho kỹ sư kết cấu",
        "Tính toán tải trọng dự phòng ngay từ bước thiết kế kỹ thuật",
      ],
    },
    {
      title: "Thiếu thiết kế hệ thống thoát nước mưa/nước thải",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Hệ thống thoát nước tính toán sơ sài gây ngập úng sân, ứ đọng nước thải khi mưa lớn.",
      mitigationActions: [
        "Tính toán lưu lượng thoát nước theo diện tích mái/sân thực tế",
        "Bố trí đủ số lượng phễu thu và đảm bảo độ dốc ống thoát",
      ],
    },
    {
      title: "Chọn vật liệu không có sẵn tại địa phương",
      category: "SCHEDULE",
      severity: "LOW",
      description: "Vật liệu đặc chủng phải đặt hàng/nhập khẩu có thời gian giao hàng dài, dễ làm chậm tiến độ nếu không tính trước.",
      mitigationActions: [
        "Kiểm tra thời gian cung ứng thực tế của vật liệu đặc chủng trước khi chốt thiết kế",
        "Chuẩn bị phương án thay thế dự phòng nếu vật liệu chính bị chậm hàng",
      ],
    },
    {
      title: "Thiếu phối hợp giữa kiến trúc và nội thất (âm tủ, hộp kỹ thuật)",
      category: "DESIGN_TECHNICAL",
      severity: "MEDIUM",
      description: "Vị trí âm tủ, hộp kỹ thuật không được tính trong bản vẽ kiến trúc khiến đơn vị nội thất khó thi công sau này.",
      mitigationActions: [
        "Mời đơn vị thiết kế nội thất góp ý bản vẽ kỹ thuật từ sớm",
        "Chốt vị trí âm tủ/hộp kỹ thuật khu vực bếp và phòng ngủ trước khi thi công thô",
      ],
    },
    {
      title: "Bản vẽ điện nhẹ (camera, mạng, nhà thông minh) làm sau",
      category: "DESIGN_TECHNICAL",
      severity: "LOW",
      description: "Thiết kế điện nhẹ bổ sung sau khi đã thi công thô buộc phải đục tường/đi dây nổi, ảnh hưởng thẩm mỹ.",
      mitigationActions: [
        "Chốt nhu cầu hệ thống điện nhẹ/nhà thông minh ngay từ giai đoạn thiết kế kỹ thuật",
        "Đi ống chờ điện nhẹ cùng lúc với điện chính để tránh đục phá sau này",
      ],
    },
    {
      title: "Không thẩm tra thiết kế kết cấu độc lập trước khi thi công",
      category: "QUALITY",
      severity: "HIGH",
      description: "Thiếu bên thứ hai rà soát an toàn kết cấu khiến sai sót tính toán (nếu có) không được phát hiện sớm.",
      mitigationActions: [
        "Thuê đơn vị thẩm tra thiết kế độc lập, đặc biệt với nhà nhiều tầng/kết cấu đặc biệt",
        "Xử lý các điểm thẩm tra góp ý trước khi thi công phần thô",
      ],
    },
  ],
  PERMIT: [
    {
      title: "Chậm giấy phép xây dựng làm trễ khởi công",
      category: "LEGAL_PERMIT",
      severity: "HIGH",
      description: "Trễ giấy phép kéo lùi toàn bộ tiến độ, có thể bị nhà thầu tính phạt chờ việc nếu hợp đồng đã ký.",
      mitigationActions: [
        "Nộp hồ sơ xin phép sớm song song với thiết kế kỹ thuật",
        "Theo dõi tiến độ xử lý hồ sơ định kỳ tại cơ quan cấp phép",
        "Chỉ ký hợp đồng thi công với ngày khởi công dự kiến sau khi có giấy phép",
      ],
    },
    {
      title: "Xây sai chỉ giới/mật độ xây dựng/tầng cao so với giấy phép",
      category: "LEGAL_PERMIT",
      severity: "CRITICAL",
      description: "Vi phạm giấy phép có thể bị đình chỉ thi công, phạt hành chính hoặc buộc phá dỡ phần sai phạm.",
      mitigationActions: [
        "Đo đạc định vị tim trục, chỉ giới bằng trắc đạc chuyên nghiệp trước khi đổ móng",
        "Đối chiếu kết quả đo đạc đúng với giấy phép trước khi thi công mỗi tầng",
        "Kiểm tra lại chiều cao/số tầng thực tế so với giấy phép trước khi đổ sàn mỗi tầng",
      ],
    },
    {
      title: "Chưa thỏa thuận với hàng xóm/đấu nối hạ tầng trước khi thi công",
      category: "LEGAL_PERMIT",
      severity: "MEDIUM",
      description: "Tranh chấp ranh giới hoặc bị phản ánh lên phường có thể làm đình trệ thi công.",
      mitigationActions: [
        "Thông báo/thỏa thuận bằng văn bản với các hộ liền kề trước khi khởi công",
        "Thống nhất rõ về giờ giấc thi công và lối đi chung",
      ],
    },
    {
      title: "Hồ sơ pháp lý đất chưa đầy đủ",
      category: "LEGAL_PERMIT",
      severity: "HIGH",
      description: "Sổ hồng chưa cập nhật hiện trạng, đang thế chấp hoặc tranh chấp khiến hồ sơ xin phép bị từ chối/kéo dài.",
      mitigationActions: [
        "Rà soát tình trạng pháp lý đất (sổ hồng, thế chấp, tranh chấp)",
        "Hoàn tất các thủ tục pháp lý cần thiết trước khi nộp hồ sơ xin phép",
      ],
    },
    {
      title: "Vướng quy hoạch treo/lộ giới chưa cập nhật",
      category: "LEGAL_PERMIT",
      severity: "CRITICAL",
      description: "Đất nằm trong khu quy hoạch/lộ giới mở rộng có thể bị hạn chế cấp phép hoặc buộc lùi diện tích xây dựng.",
      mitigationActions: [
        "Xin thông tin quy hoạch chi tiết tại phòng quản lý đô thị/địa chính trước khi thiết kế",
        "Điều chỉnh phương án thiết kế phù hợp lộ giới/quy hoạch được xác nhận",
      ],
    },
    {
      title: "Chưa hoàn tất đấu nối hạ tầng công cộng",
      category: "LEGAL_PERMIT",
      severity: "MEDIUM",
      description: "Chưa xin đấu nối điện/nước/thoát nước với hạ tầng công cộng khiến chậm trễ khi cần sử dụng trong thi công.",
      mitigationActions: [
        "Làm thủ tục đấu nối điện nước tạm thi công song song với xin giấy phép xây dựng",
        "Xác định điểm đấu nối thoát nước với hệ thống công cộng trước khi thi công móng",
      ],
    },
    {
      title: "Thiếu giấy phép thi công tạm (chiếm dụng vỉa hè, lô cốt)",
      category: "LEGAL_PERMIT",
      severity: "LOW",
      description: "Tập kết vật tư/rào chắn công trình lấn vỉa hè mà chưa xin phép có thể bị xử phạt hoặc buộc tháo dỡ.",
      mitigationActions: [
        "Xin giấy phép sử dụng tạm vỉa hè/lòng đường (nếu cần) trước khi tập kết vật tư",
        "Rào chắn công trình gọn gàng, đúng phạm vi được cấp phép",
      ],
    },
    {
      title: "Chưa đóng đầy đủ phí/lệ phí liên quan trước khi khởi công",
      category: "LEGAL_PERMIT",
      severity: "LOW",
      description: "Thiếu các khoản phí xây dựng, phí môi trường theo quy định địa phương có thể bị nhắc nhở/xử phạt khi kiểm tra.",
      mitigationActions: [
        "Rà soát đầy đủ danh mục phí/lệ phí theo quy định địa phương",
        "Hoàn tất nộp phí trước ngày khởi công",
      ],
    },
    {
      title: "Thiết kế không đúng quy chuẩn PCCC khu dân cư",
      category: "LEGAL_PERMIT",
      severity: "MEDIUM",
      description: "Thiếu lối thoát hiểm hoặc khoảng lùi theo quy chuẩn PCCC có thể bị yêu cầu điều chỉnh giữa chừng.",
      mitigationActions: [
        "Kiểm tra yêu cầu PCCC áp dụng cho nhà ở riêng lẻ tại địa phương từ bước thiết kế kỹ thuật",
        "Bố trí lối thoát hiểm/khoảng lùi đúng quy chuẩn trước khi xin phép",
      ],
    },
    {
      title: "Chưa thông báo khởi công cho chính quyền địa phương",
      category: "LEGAL_PERMIT",
      severity: "LOW",
      description: "Thi công mà chưa gửi thông báo khởi công theo quy định có thể bị lập biên bản, ảnh hưởng tiến độ.",
      mitigationActions: [
        "Gửi thông báo khởi công kèm hồ sơ liên quan cho UBND phường/xã",
        "Lưu biên nhận thông báo khởi công để đối chiếu khi cần",
      ],
    },
  ],
  PILING: [
    {
      title: "Chưa khảo sát hiện trạng nhà lân cận trước khi ép cọc",
      category: "NEIGHBOR_SETTLEMENT_CRACK",
      severity: "CRITICAL",
      description: "Không có bằng chứng hiện trạng trước khi ép cọc khiến CĐT bất lợi khi bị khiếu nại lún nứt sau này.",
      mitigationActions: [
        "Chụp ảnh/quay video hiện trạng toàn bộ nhà lân cận trước ngày ép cọc",
        "Lập biên bản hiện trạng có chữ ký xác nhận của chủ nhà lân cận",
        "Lưu hồ sơ khảo sát vào mục Hồ sơ dự án làm bằng chứng pháp lý",
      ],
    },
    {
      title: "Cọc ép không đạt độ sâu thiết kế (gặp địa chất khác dự đoán)",
      category: "PILE_QUANTITY_VARIANCE",
      severity: "HIGH",
      description: "Địa chất thực tế khác khảo sát khiến cọc phải cắt/nối, phát sinh vật tư và chi phí nhân công.",
      mitigationActions: [
        "Ép thử vài cọc đầu tiên để đối chiếu với thiết kế",
        "Chuẩn bị phương án dự phòng nối cọc/đổi loại cọc",
        "Thống nhất trước đơn giá xử lý phát sinh với nhà thầu ép cọc",
      ],
    },
    {
      title: "Rung chấn/tiếng ồn ép cọc ảnh hưởng nhà lân cận",
      category: "NEIGHBOR_SETTLEMENT_CRACK",
      severity: "MEDIUM",
      description: "Ép cọc ngoài giờ quy định hoặc rung chấn mạnh gây khiếu nại, có thể bị đình chỉ thi công.",
      mitigationActions: [
        "Chỉ ép cọc trong khung giờ cho phép của địa phương",
        "Ưu tiên phương pháp ép êm/khoan nhồi nếu gần nhà dân",
        "Thông báo trước cho hàng xóm về lịch ép cọc",
      ],
    },
    {
      title: "Sự cố đứt/nghiêng cọc khi ép",
      category: "QUALITY",
      severity: "HIGH",
      description: "Cọc bị lệch tâm hoặc gãy khi ép làm giảm khả năng chịu lực của móng.",
      mitigationActions: [
        "Giám sát chặt độ thẳng đứng từng cọc trong quá trình ép",
        "Yêu cầu đơn vị ép cọc lập biên bản và phương án xử lý ngay khi có sự cố",
        "Không che lấp cọc lỗi trước khi kỹ sư kết cấu xác nhận phương án xử lý",
      ],
    },
    {
      title: "Cọc dư quá nhiều so với thiết kế",
      category: "PILE_QUANTITY_VARIANCE",
      severity: "MEDIUM",
      description: "Đặt cọc dài hơn cần thiết vì địa chất tốt hơn dự kiến, gây lãng phí và tốn phí cắt/trả cọc dư.",
      mitigationActions: [
        "Đối chiếu chiều dài cọc thực tế với thiết kế ngay sau khi ép thử",
        "Điều chỉnh số lượng/chiều dài đặt hàng đại trà cho sát thực tế",
      ],
    },
    {
      title: "Không giám sát hồ sơ nghiệm thu từng cây cọc",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Thiếu biên bản nghiệm thu độ sâu/lực ép từng cọc khiến khó truy xuất khi có sự cố lún sau này.",
      mitigationActions: [
        "Yêu cầu lập biên bản nghiệm thu cho từng cây cọc (độ sâu, lực ép, thời gian)",
        "Lưu hồ sơ nghiệm thu cọc ngay khi ép xong, không gộp làm sau",
      ],
    },
    {
      title: "Máy ép cọc gây lún nứt vỉa hè, đường ống công cộng",
      category: "OTHER",
      severity: "MEDIUM",
      description: "Xe cẩu/máy ép cọc trọng tải lớn có thể làm hư hại hạ tầng công cộng xung quanh công trình.",
      mitigationActions: [
        "Khảo sát tải trọng cho phép của vỉa hè/đường trước khi đưa máy móc nặng vào",
        "Lót thép/gỗ bảo vệ vỉa hè tại vị trí đặt máy",
      ],
    },
    {
      title: "Chưa thử tải tĩnh cọc trước khi ép đại trà",
      category: "QUALITY",
      severity: "HIGH",
      description: "Bỏ qua bước thử tải tĩnh khiến không có cơ sở xác nhận khả năng chịu lực thực tế của cọc trước khi ép hàng loạt.",
      mitigationActions: [
        "Thực hiện thử tải tĩnh (nén tĩnh) tối thiểu 1 cọc đại diện",
        "Chỉ triển khai ép đại trà sau khi có kết quả thử tải đạt yêu cầu",
      ],
    },
    {
      title: "Thời gian ép cọc kéo dài do vướng giờ giấc địa phương",
      category: "SCHEDULE",
      severity: "LOW",
      description: "Quy định giờ thi công nghiêm ngặt ở khu dân cư đông đúc làm kéo dài thời gian hoàn thành ép cọc.",
      mitigationActions: [
        "Lên lịch ép cọc chi tiết theo khung giờ cho phép",
        "Thông báo trước cho các hộ dân để giảm khiếu nại làm gián đoạn",
      ],
    },
    {
      title: "Chưa mua bảo hiểm công trình trong giai đoạn ép cọc",
      category: "COST",
      severity: "MEDIUM",
      description: "Đây là giai đoạn rủi ro ảnh hưởng nhà lân cận cao nhất nhưng lại thường bị bỏ qua bảo hiểm.",
      mitigationActions: [
        "Mua bảo hiểm công trình xây dựng bao gồm rủi ro bên thứ ba",
        "Xác nhận hiệu lực bảo hiểm trước ngày ép cọc đầu tiên",
      ],
    },
  ],
  STRUCTURE: [
    {
      title: "Chất lượng bê tông không đạt (đổ trời mưa, không lấy mẫu nén)",
      category: "QUALITY",
      severity: "CRITICAL",
      description: "Bê tông không đạt cường độ ảnh hưởng trực tiếp đến an toàn kết cấu, khó phát hiện bằng mắt thường.",
      mitigationActions: [
        "Bắt buộc lấy mẫu nén cho mỗi đợt đổ bê tông quan trọng (móng, cột, dầm sàn)",
        "Không đổ bê tông khi trời mưa to",
        "Lưu kết quả nén mẫu 7/28 ngày vào hồ sơ dự án",
      ],
    },
    {
      title: "Cốt thép sai chủng loại/số lượng so với thiết kế",
      category: "QUALITY",
      severity: "CRITICAL",
      description: "Nhà thầu bớt xén hoặc đổi loại thép rẻ hơn so với bản vẽ kết cấu.",
      mitigationActions: [
        "Kiểm tra chứng chỉ xuất xứ thép khi nhập về công trường",
        "Đối chiếu số lượng/đường kính thép thực tế với bản vẽ trước khi đổ bê tông",
        "Chụp ảnh nghiệm thu cốt thép trước khi đổ bê tông che khuất",
      ],
    },
    {
      title: "Sai lệch trắc địa (tim trục, cao độ sàn) phát hiện trễ",
      category: "QUALITY",
      severity: "HIGH",
      description: "Phát hiện sai lệch sau khi đã đổ bê tông buộc phải đập bỏ làm lại, tốn kém thời gian và chi phí.",
      mitigationActions: [
        "Đo trắc địa nghiệm thu tim trục và cao độ trước mỗi lần đổ bê tông",
        "Không chờ đến khi hoàn thiện mới kiểm tra sai lệch",
      ],
    },
    {
      title: "An toàn lao động (giàn giáo, ngã cao, thiết bị nâng)",
      category: "SAFETY",
      severity: "CRITICAL",
      description: "Công trường thi công thô có rủi ro tai nạn lao động cao nhất trong toàn bộ dự án.",
      mitigationActions: [
        "Yêu cầu nhà thầu trang bị bảo hộ đầy đủ cho công nhân",
        "Kiểm tra giàn giáo đạt chuẩn trước khi cho công nhân làm việc trên cao",
        "Xác nhận có bảo hiểm tai nạn lao động cho toàn bộ nhân công",
      ],
    },
    {
      title: "Thời tiết mưa bão làm chậm tiến độ, ngập úng mặt bằng",
      category: "WEATHER",
      severity: "MEDIUM",
      description: "Mùa mưa có thể làm trễ tiến độ nhiều tuần nếu không có phương án thoát nước mặt bằng.",
      mitigationActions: [
        "Lập phương án thoát nước/che chắn mặt bằng trước mùa mưa",
        "Dự trù thêm thời gian đệm trong tiến độ tổng cho các tháng mưa nhiều",
      ],
    },
    {
      title: "Thi công điện nước âm tường sai vị trí so với bản vẽ",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Đường ống/dây điện đi sai vị trí so với thiết kế gây khó khăn khi lắp thiết bị hoàn thiện, phải đục sửa lại.",
      mitigationActions: [
        "Đối chiếu vị trí đục âm với bản vẽ M&E trước khi thi công",
        "Chụp ảnh lưu hồ sơ trước khi tô trát che lấp đường ống/dây điện",
      ],
    },
    {
      title: "Cốp pha không đảm bảo gây phình/nứt bê tông",
      category: "QUALITY",
      severity: "HIGH",
      description: "Cốp pha kê chống sơ sài hoặc kém chất lượng khiến bê tông bị phình, rỗ, sai kích thước cấu kiện.",
      mitigationActions: [
        "Kiểm tra hệ cốp pha, cây chống đạt chuẩn trước mỗi đợt đổ bê tông",
        "Không tái sử dụng cốp pha đã hư hỏng nhiều lần",
      ],
    },
    {
      title: "Thiếu giám sát khi đổ bê tông ngoài giờ/ban đêm",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Đổ bê tông ban đêm để tránh nắng nhưng thiếu giám sát dễ dẫn đến gian lận về khối lượng/chất lượng.",
      mitigationActions: [
        "Bố trí giám sát hoặc CĐT có mặt trong các đợt đổ bê tông quan trọng",
        "Yêu cầu báo trước lịch đổ bê tông ít nhất 1 ngày dù thi công ngoài giờ",
      ],
    },
    {
      title: "Vật tư thô (xi măng, cát, đá) không rõ nguồn gốc",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Vật tư thô kém chất lượng hoặc trộn lẫn không đúng tỷ lệ ảnh hưởng trực tiếp đến độ bền công trình.",
      mitigationActions: [
        "Yêu cầu hóa đơn/nguồn gốc vật tư thô rõ ràng khi nhập về công trường",
        "Kiểm tra ngẫu nhiên chất lượng cát/đá/xi măng định kỳ",
      ],
    },
    {
      title: "Xây tường không đúng loại gạch chống thấm/cách âm theo thiết kế",
      category: "QUALITY",
      severity: "LOW",
      description: "Đổi loại gạch xây rẻ hơn so với thiết kế làm giảm khả năng chống thấm/cách âm của tường.",
      mitigationActions: [
        "Kiểm tra loại gạch thực tế nhập về công trường đúng chủng loại đã thống nhất",
        "Đối chiếu với mẫu gạch đã duyệt trong hợp đồng/bản vẽ",
      ],
    },
  ],
  FINISHING: [
    {
      title: "Thấm dột sàn mái, sân thượng, WC, hộp kỹ thuật",
      category: "QUALITY",
      severity: "CRITICAL",
      description: "Lỗi thấm dột phổ biến nhất ở nhà phố, khó xử lý triệt để nếu phát hiện sau khi đã hoàn thiện.",
      mitigationActions: [
        "Bắt buộc thử nước (ngâm nước 24-48h) trước khi cán nền/lát gạch",
        "Áp dụng cho tất cả khu vực có chống thấm (mái, sân thượng, WC, hộp kỹ thuật)",
        "Chụp ảnh/quay video quá trình thử nước làm bằng chứng nghiệm thu",
      ],
    },
    {
      title: "Ốp lát sai màu/lô gạch giữa các đợt giao hàng",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Gạch khác lô (dù cùng mã) có thể lệch tông màu rõ rệt khi lát cạnh nhau.",
      mitigationActions: [
        "Đặt hàng đủ số lượng gạch cho toàn bộ khu vực cùng lúc",
        "Kiểm tra cùng lô (số batch) trước khi thi công",
      ],
    },
    {
      title: "Sơn bả bong tróc do chưa xử lý ẩm tường",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Sơn phủ lên tường còn ẩm hoặc chưa đủ thời gian khô sẽ bong tróc sau vài tháng sử dụng.",
      mitigationActions: [
        "Đo độ ẩm tường trước khi sơn",
        "Đảm bảo thời gian khô tối thiểu theo khuyến cáo nhà sản xuất trước khi bả/sơn",
      ],
    },
    {
      title: "Vật tư hoàn thiện giao sai chủng loại/model đã chọn",
      category: "CONTRACTOR_VENDOR",
      severity: "HIGH",
      description: "Nhà cung cấp giao hàng khác mẫu/thương hiệu đã chốt để trục lợi chênh lệch giá.",
      mitigationActions: [
        "Đối chiếu mã sản phẩm, tem nhãn thực tế với báo giá đã chốt khi nhận hàng",
        "Lưu ảnh vật tư nhận hàng làm bằng chứng đối chiếu",
      ],
    },
    {
      title: "Cửa, sê nô, máng xối thiết kế/thi công sai gây đọng nước",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Độ dốc sê nô/máng xối không đủ hoặc kích thước quá nhỏ khiến nước mưa tràn ngược vào nhà.",
      mitigationActions: [
        "Kiểm tra độ dốc thoát nước thực tế bằng cách xả nước thử",
        "Thực hiện trước khi nghiệm thu hoàn thiện mái/ban công",
      ],
    },
    {
      title: "Trần thạch cao/trần nhựa bị võng, nứt do độ ẩm",
      category: "QUALITY",
      severity: "LOW",
      description: "Thi công trần khi mái/sàn phía trên chưa xử lý chống thấm triệt để khiến trần bị ố, võng sau một thời gian.",
      mitigationActions: [
        "Chỉ thi công trần sau khi đã nghiệm thu chống thấm khu vực phía trên",
        "Thử nước đạt yêu cầu trước khi lắp trần",
      ],
    },
    {
      title: "Lát gạch sai độ dốc thoát nước ban công/sân thượng",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Nền không đủ độ dốc về phễu thu khiến nước đọng vũng, lâu ngày gây thấm ngược.",
      mitigationActions: [
        "Kiểm tra độ dốc tối thiểu (khoảng 1-2%) về phễu thu",
        "Đổ nước thử trước khi nghiệm thu hoàn thiện",
      ],
    },
    {
      title: "Hệ thống điện nước hoàn thiện rò rỉ chưa phát hiện trước nghiệm thu",
      category: "QUALITY",
      severity: "HIGH",
      description: "Rò rỉ nhỏ ở mối nối ống nước/điện không phát hiện kịp sẽ gây hư hỏng vật tư hoàn thiện sau khi bàn giao.",
      mitigationActions: [
        "Thử áp lực đường ống nước trước khi lắp đặt thiết bị hoàn thiện che khuất",
        "Đo cách điện hệ thống điện trước khi đóng trần/ốp tường",
      ],
    },
    {
      title: "Sai lệch màu sơn ngoại thất so với mẫu đã duyệt",
      category: "QUALITY",
      severity: "LOW",
      description: "Màu sơn thực tế trên tường khác với mẫu duyệt trong nhà do ảnh hưởng ánh sáng tự nhiên/pha màu không chuẩn.",
      mitigationActions: [
        "Sơn thử một mảng tường nhỏ ngoài trời",
        "Duyệt màu thực tế dưới ánh sáng ban ngày trước khi sơn đại trà",
      ],
    },
    {
      title: "Thiết bị vệ sinh, khóa vòi lắp sai cao độ chuẩn",
      category: "QUALITY",
      severity: "LOW",
      description: "Lắp đặt sai cao độ tiêu chuẩn (lavabo, sen vòi, bồn cầu) gây bất tiện sử dụng, khó điều chỉnh sau khi đã ốp lát.",
      mitigationActions: [
        "Đối chiếu cao độ lắp đặt thiết bị vệ sinh theo tiêu chuẩn/yêu cầu gia chủ",
        "Xác nhận cao độ trước khi khoan lắp cố định",
      ],
    },
  ],
  INTERIOR_INSTALL: [
    {
      title: "Đo đạc nội thất sai kích thước thực tế thi công",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Kích thước thô thực tế lệch so với bản vẽ khiến tủ/nội thất đóng sẵn không vừa khít.",
      mitigationActions: [
        "Đo đạc thực tế lại toàn bộ trước khi đặt hàng sản xuất nội thất",
        "Không dùng bản vẽ thiết kế ban đầu làm căn cứ đặt hàng",
      ],
    },
    {
      title: "Xung đột giữa thi công nội thất và điện nước âm tường",
      category: "QUALITY",
      severity: "HIGH",
      description: "Khoan lắp nội thất có thể trúng đường ống nước hoặc dây điện âm tường đã đi trước đó.",
      mitigationActions: [
        "Yêu cầu bản vẽ hoàn công điện nước trước khi khoan/đục lắp đặt nội thất",
        "Dò đường ống/dây điện bằng máy dò trước khi khoan các vị trí quan trọng",
      ],
    },
    {
      title: "Đồ nội thất đặt hàng chậm tiến độ so với ngày bàn giao",
      category: "SCHEDULE",
      severity: "MEDIUM",
      description: "Thời gian sản xuất/nhập khẩu nội thất kéo dài hơn dự kiến làm trễ ngày bàn giao nhà.",
      mitigationActions: [
        "Đặt hàng nội thất sớm ngay khi thi công thô gần hoàn tất",
        "Có buffer thời gian dự phòng so với ngày bàn giao dự kiến",
      ],
    },
    {
      title: "Trầy xước, hư hỏng bề mặt hoàn thiện khi lắp đặt nội thất",
      category: "QUALITY",
      severity: "LOW",
      description: "Vận chuyển/lắp đặt nội thất va chạm làm trầy sàn, tường đã hoàn thiện trước đó.",
      mitigationActions: [
        "Che chắn bảo vệ sàn/góc tường bằng vật liệu lót trước khi vận chuyển",
        "Kiểm tra hiện trạng bề mặt trước và sau khi lắp đặt nội thất",
      ],
    },
    {
      title: "Đồ nội thất không đúng màu/vân gỗ như mẫu duyệt",
      category: "CONTRACTOR_VENDOR",
      severity: "MEDIUM",
      description: "Vật liệu thực tế (melamine, veneer, sơn) khác với mẫu duyệt ban đầu do lô hàng khác nhau.",
      mitigationActions: [
        "Yêu cầu xưởng gửi mẫu vật liệu thực tế để duyệt trước khi sản xuất hàng loạt",
        "Đối chiếu mẫu đã duyệt khi nhận hàng thành phẩm",
      ],
    },
    {
      title: "Thiếu phối hợp giữa đơn vị nội thất và điện thông minh/smarthome",
      category: "DESIGN_TECHNICAL",
      severity: "LOW",
      description: "Vị trí lắp cảm biến, công tắc thông minh không khớp với thiết kế tủ/vách nội thất.",
      mitigationActions: [
        "Họp phối hợp giữa đơn vị nội thất và đơn vị điện thông minh trước khi thi công lắp đặt",
        "Thống nhất vị trí lắp thiết bị điện thông minh trên bản vẽ nội thất",
      ],
    },
    {
      title: "Vận chuyển nội thất lớn không tính kích thước cửa/thang",
      category: "DESIGN_TECHNICAL",
      severity: "LOW",
      description: "Tủ, sofa, nệm kích thước lớn không đưa vào được phòng do cửa/thang/hành lang quá hẹp.",
      mitigationActions: [
        "Kiểm tra kích thước cửa ra vào, chiếu nghỉ cầu thang trước khi đặt hàng nội thất lớn",
        "Cân nhắc phương án tháo rời/lắp ráp tại chỗ nếu không gian hạn chế",
      ],
    },
    {
      title: "Mùi sơn/keo nội thất chưa bay hết trước khi bàn giao",
      category: "QUALITY",
      severity: "LOW",
      description: "Bàn giao nhà khi mùi hóa chất từ sơn/keo nội thất còn nồng ảnh hưởng sức khỏe người sử dụng.",
      mitigationActions: [
        "Để thông thoáng, thông gió đủ thời gian sau khi lắp đặt nội thất",
        "Kiểm tra mùi trước khi gia chủ vào ở, đặc biệt phòng ngủ trẻ em",
      ],
    },
    {
      title: "Rèm, đèn trang trí lắp sai vị trí so với thiết kế ban đầu",
      category: "QUALITY",
      severity: "LOW",
      description: "Vị trí lắp rèm/đèn không khớp với bố trí nội thất khiến mất thẩm mỹ hoặc va chạm với đồ đạc khác.",
      mitigationActions: [
        "Đối chiếu vị trí lắp đặt rèm/đèn với bản vẽ bố trí nội thất",
        "Xác nhận vị trí trước khi khoan cố định",
      ],
    },
    {
      title: "Thiếu kiểm tra tải trọng treo tường cho tủ bếp/kệ nặng",
      category: "SAFETY",
      severity: "MEDIUM",
      description: "Treo tủ bếp trên/kệ nặng vào tường không đủ chịu lực gây nguy cơ sập đổ sau một thời gian sử dụng.",
      mitigationActions: [
        "Kiểm tra kết cấu tường tại vị trí treo tủ/kệ nặng",
        "Dùng phụ kiện treo phù hợp tải trọng thực tế trước khi lắp đặt",
      ],
    },
  ],
  AS_BUILT: [
    {
      title: "Hồ sơ hoàn công không khớp thực tế thi công",
      category: "LEGAL_PERMIT",
      severity: "HIGH",
      description: "Sai lệch giữa hồ sơ và thực tế gây khó khăn khi xin cấp/bổ sung giấy chứng nhận sau này.",
      mitigationActions: [
        "Cập nhật bản vẽ hoàn công theo đúng thực tế thi công trong suốt quá trình",
        "Không dồn việc lập hồ sơ hoàn công vào cuối dự án",
      ],
    },
    {
      title: "Nghiệm thu PCCC/hệ thống điện chậm hoặc không đạt",
      category: "LEGAL_PERMIT",
      severity: "MEDIUM",
      description: "Thiếu hồ sơ hoặc hệ thống không đạt chuẩn khiến việc nghiệm thu bị kéo dài.",
      mitigationActions: [
        "Rà soát yêu cầu PCCC/điện theo quy định địa phương từ giai đoạn thiết kế kỹ thuật",
        "Chuẩn bị đầy đủ hồ sơ nghiệm thu trước ngày hẹn kiểm tra",
      ],
    },
    {
      title: "Nhà thầu né tránh trách nhiệm bảo hành sau khi nhận đủ tiền",
      category: "CONTRACTOR_VENDOR",
      severity: "HIGH",
      description: "Sau khi thanh toán đợt cuối, nhà thầu thường chậm trễ xử lý các lỗi phát sinh trong thời gian bảo hành.",
      mitigationActions: [
        "Giữ lại khoản tiền bảo hành (retention) theo hợp đồng",
        "Chỉ thanh toán hết sau khi hết hạn bảo hành và không còn lỗi tồn đọng",
      ],
    },
    {
      title: "Chưa thanh lý hợp đồng, còn công nợ/phát sinh chưa quyết toán",
      category: "CONTRACTOR_VENDOR",
      severity: "MEDIUM",
      description: "Bỏ sót các khoản phát sinh chưa chốt gây tranh chấp về sau khi không còn hồ sơ đối chiếu.",
      mitigationActions: [
        "Lập biên bản thanh lý hợp đồng",
        "Đối chiếu toàn bộ phát sinh/giảm trừ trước khi tất toán cuối cùng",
      ],
    },
    {
      title: "Chưa lập biên bản nghiệm thu tổng thể trước khi bàn giao",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Bàn giao nhà không có biên bản nghiệm thu tổng thể khiến khó xác định trách nhiệm khi phát sinh lỗi sau này.",
      mitigationActions: [
        "Tổ chức nghiệm thu tổng thể toàn bộ hạng mục",
        "Lập biên bản có chữ ký hai bên trước khi bàn giao chính thức",
      ],
    },
    {
      title: "Thiếu hướng dẫn sử dụng/bảo trì thiết bị cho CĐT",
      category: "OTHER",
      severity: "LOW",
      description: "CĐT không được hướng dẫn vận hành thiết bị (máy bơm, điện mặt trời, hệ thống lọc nước...) gây hư hỏng do dùng sai cách.",
      mitigationActions: [
        "Yêu cầu nhà thầu/nhà cung cấp bàn giao tài liệu hướng dẫn sử dụng và bảo trì",
        "Yêu cầu hướng dẫn trực tiếp cách vận hành các thiết bị chính khi bàn giao",
      ],
    },
    {
      title: "Chưa test vận hành toàn bộ hệ thống trước khi bàn giao",
      category: "QUALITY",
      severity: "MEDIUM",
      description: "Hệ thống điện, nước, thang máy (nếu có) chưa được chạy thử toàn bộ khiến lỗi vận hành phát hiện sau khi đã ở.",
      mitigationActions: [
        "Chạy thử toàn bộ hệ thống kỹ thuật liên tục ít nhất 24-48h",
        "Thực hiện trước ngày bàn giao chính thức",
      ],
    },
    {
      title: "Vệ sinh công nghiệp sau xây dựng chưa đạt chuẩn bàn giao",
      category: "QUALITY",
      severity: "LOW",
      description: "Bụi xây dựng, keo dán, vết sơn còn sót lại khi bàn giao ảnh hưởng trải nghiệm và sức khỏe người sử dụng.",
      mitigationActions: [
        "Yêu cầu đơn vị vệ sinh công nghiệp chuyên nghiệp dọn dẹp toàn bộ",
        "Kiểm tra trước khi tổ chức nghiệm thu bàn giao",
      ],
    },
    {
      title: "Chưa xin cấp/cập nhật giấy chứng nhận sau hoàn công",
      category: "LEGAL_PERMIT",
      severity: "MEDIUM",
      description: "Không hoàn tất thủ tục cập nhật tài sản trên đất sau khi xây dựng gây khó khăn khi giao dịch/thế chấp nhà sau này.",
      mitigationActions: [
        "Nộp hồ sơ hoàn công ngay sau khi hoàn thành công trình",
        "Làm thủ tục cập nhật giấy chứng nhận quyền sở hữu nhà",
      ],
    },
    {
      title: "Còn tranh chấp với hàng xóm chưa giải quyết dứt điểm",
      category: "NEIGHBOR_SETTLEMENT_CRACK",
      severity: "MEDIUM",
      description: "Khiếu nại về lún nứt/ồn/bụi từ giai đoạn thi công chưa được giải quyết dứt điểm trước khi đóng hồ sơ dự án.",
      mitigationActions: [
        "Rà soát và xử lý dứt điểm mọi khiếu nại của hàng xóm",
        "Lập biên bản thống nhất trước khi kết thúc dự án",
      ],
    },
  ],
};

/** Toàn bộ mẫu rủi ro gộp thành 1 danh sách phẳng (bỏ trùng tên) — dùng cho nơi cần chọn rủi ro không phân theo giai đoạn, VD dropdown liên kết rủi ro ở Issue Log */
export const ALL_RISK_TEMPLATES: RiskTemplateItem[] = Array.from(
  new Map(Object.values(RISK_TEMPLATES).flat().map((t) => [t.title, t])).values(),
);

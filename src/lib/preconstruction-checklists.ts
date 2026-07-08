/**
 * Bộ mẫu checklist "Kiểm soát khởi công & nền móng" (Pre-Construction & Foundation Control).
 * Mỗi mục kèm đầy đủ: bắt buộc hay không, có cần bằng chứng không, loại bằng chứng,
 * rủi ro nếu thiếu, và module gợi ý để xử lý/lưu trữ.
 */

export type PreConstructionChecklistItem = {
  title: string;
  required: boolean;
  evidenceRequired: boolean;
  evidenceType?: string;
  riskIfMissing: string;
  suggestedModule: string;
};

export type PreConstructionChecklistGroup = {
  category: string;
  items: PreConstructionChecklistItem[];
};

export const PRECONSTRUCTION_CHECKLIST_TEMPLATES: PreConstructionChecklistGroup[] = [
  {
    category: "Chuẩn bị trước khởi công",
    items: [
      {
        title: "Giấy phép xây dựng còn hiệu lực",
        required: true,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Khởi công không phép có thể bị đình chỉ thi công, phạt hành chính, buộc phá dỡ",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Hợp đồng thi công đã ký với nhà thầu",
        required: true,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Không có căn cứ pháp lý xử lý khi có tranh chấp tiến độ/chất lượng/thanh toán",
        suggestedModule: "Hợp đồng",
      },
      {
        title: "Đã khảo sát địa chất (báo cáo khoan khảo sát)",
        required: true,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Thiết kế móng dựa trên giả định, dễ sai tải trọng/độ sâu cọc",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã chuẩn bị điện nước tạm phục vụ thi công",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Chậm tiến độ khi vào công trường không có điện nước sử dụng",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã thông báo khởi công cho chính quyền địa phương",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Vi phạm thủ tục hành chính, có thể bị lập biên bản khi kiểm tra",
        suggestedModule: "Hồ sơ",
      },
    ],
  },
  {
    category: "Ranh đất, tim móng, cao độ",
    items: [
      {
        title: "Đã đo đạc ranh đất thực tế bằng trắc đạc",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Xây sai ranh giới có thể bị buộc phá dỡ phần vi phạm",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đối chiếu ranh đất đo thực tế với sổ hồng/giấy chứng nhận",
        required: true,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Tranh chấp ranh giới với hàng xóm khi phát hiện sai lệch sau khi xây",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã định vị tim trục công trình đúng bản vẽ",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Sai tim trục phát hiện trễ phải đập bỏ làm lại, tốn kém thời gian và chi phí",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã xác định cao độ cốt nền chuẩn",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Sai cao độ gây ngập úng hoặc chênh cốt với nhà lân cận/đường",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã đối chiếu khoảng lùi, chỉ giới xây dựng với giấy phép",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Vi phạm chỉ giới xây dựng bị đình chỉ thi công, phạt hành chính",
        suggestedModule: "Hồ sơ",
      },
    ],
  },
  {
    category: "Ghi nhận hiện trạng nhà kế bên",
    items: [
      {
        title: "Đã chụp ảnh/quay video hiện trạng toàn bộ nhà lân cận",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh/Video",
        riskIfMissing: "Không có bằng chứng khi bị khiếu nại lún nứt sau khi thi công",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã lập biên bản hiện trạng có chữ ký chủ nhà lân cận",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Không có căn cứ pháp lý phân định trách nhiệm khi có tranh chấp",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã ghi nhận các vết nứt/hư hỏng sẵn có (nếu có)",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh",
        riskIfMissing: "Bị quy trách nhiệm oan cho các vết nứt đã tồn tại từ trước khi thi công",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã khảo sát hạ tầng công cộng lân cận (vỉa hè, đường ống)",
        required: false,
        evidenceRequired: false,
        riskIfMissing: "Không có căn cứ khi bị yêu cầu bồi thường hư hại hạ tầng công cộng",
        suggestedModule: "Hồ sơ",
      },
    ],
  },
  {
    category: "Động thổ & khởi công",
    items: [
      {
        title: "Đã hoàn tất thông báo khởi công xây dựng",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Thi công khi chưa thông báo có thể bị lập biên bản, đình chỉ",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã chuẩn bị hàng rào, biển báo công trình",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Không đảm bảo an toàn công trường, vi phạm quy định an toàn lao động",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã chọn ngày giờ động thổ (nếu gia chủ coi trọng)",
        required: false,
        evidenceRequired: false,
        riskIfMissing: "Không phải rủi ro kỹ thuật, chỉ ảnh hưởng tâm lý gia chủ",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã ghi nhận ngày khởi công thực tế làm mốc tính tiến độ hợp đồng",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh",
        riskIfMissing: "Khó xác định mốc tính phạt chậm tiến độ khi có tranh chấp với nhà thầu",
        suggestedModule: "Nhật ký",
      },
    ],
  },
  {
    category: "Chuẩn bị mặt bằng công trường",
    items: [
      {
        title: "Đã dọn dẹp cây cối, chướng ngại vật trên mặt bằng",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Cản trở thi công, phát sinh chi phí xử lý giữa chừng",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã bố trí lối vào cho xe vận chuyển vật tư/xe cẩu",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Không vận chuyển được vật tư/thiết bị lớn, chậm tiến độ",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã xác định vị trí tập kết vật tư, kho bãi tạm",
        required: false,
        evidenceRequired: false,
        riskIfMissing: "Vật tư để lộn xộn, dễ hư hỏng, mất mát",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Có biên bản bàn giao mặt bằng (nếu thuê/mượn mặt bằng)",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Tranh chấp trách nhiệm hiện trạng mặt bằng khi hoàn trả sau này",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã đấu nối điện nước tạm thi công",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Chậm tiến độ do thiếu điện nước thi công",
        suggestedModule: "Nhật ký",
      },
    ],
  },
  {
    category: "Phá dỡ công trình cũ",
    items: [
      {
        title: "Đã xin phép phá dỡ (nếu địa phương yêu cầu riêng)",
        required: false,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Phá dỡ không phép có thể bị xử phạt hành chính",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã ngắt điện, nước, gas trước khi phá dỡ",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Nguy cơ tai nạn cháy nổ, điện giật khi phá dỡ",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã có biện pháp che chắn bụi, giảm tiếng ồn",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Ảnh hưởng nhà lân cận, dễ bị khiếu nại lên chính quyền",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã ghi nhận hiện trạng nhà lân cận trước khi phá dỡ",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh/Video",
        riskIfMissing: "Không có bằng chứng khi bị khiếu nại hư hại do rung chấn phá dỡ",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã có phương án xử lý phế thải xây dựng đúng nơi quy định",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Đổ phế thải bừa bãi có thể bị xử phạt môi trường",
        suggestedModule: "Nhật ký",
      },
    ],
  },
  {
    category: "Phương án nền móng",
    items: [
      {
        title: "Đã có thiết kế kết cấu móng được kỹ sư ký duyệt",
        required: true,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Móng không đảm bảo an toàn kết cấu công trình",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã chọn giải pháp móng phù hợp (cọc tre/cọc BTCT/khoan nhồi...)",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Chọn sai giải pháp móng gây lún, nứt, mất an toàn công trình",
        suggestedModule: "Hồ sơ",
      },
      {
        title: "Đã có biện pháp thi công hố đào (nếu có tầng hầm)",
        required: false,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Sạt lở hố đào ảnh hưởng công trình lân cận, mất an toàn lao động",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã tính toán khối lượng, chi phí phương án móng đã chọn",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Phát sinh chi phí ngoài dự kiến khi triển khai thực tế",
        suggestedModule: "Dòng tiền",
      },
    ],
  },
  {
    category: "Ép cọc / xử lý nền",
    items: [
      {
        title: "Đã ép thử cọc trước khi ép đại trà",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Không có cơ sở đối chiếu khi cọc đại trà không đạt độ sâu thiết kế",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Có nhật ký ép cọc đầy đủ cho từng cây",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Không truy xuất được khi có sự cố lún/nứt liên quan đến cọc",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã kiểm tra chất lượng cọc trước khi ép (không nứt, đúng mác)",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh",
        riskIfMissing: "Cọc kém chất lượng ảnh hưởng khả năng chịu lực móng",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã xử lý mối nối cọc đúng kỹ thuật (nếu có nối cọc)",
        required: false,
        evidenceRequired: true,
        evidenceType: "Ảnh",
        riskIfMissing: "Mối nối yếu làm giảm khả năng chịu lực của cọc",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã đối chiếu độ sâu ép đại trà với cọc ép thử",
        required: true,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Không phát hiện kịp cọc dư/thiếu, gây phát sinh chi phí không kiểm soát",
        suggestedModule: "Rủi ro",
      },
    ],
  },
  {
    category: "Đào móng, gia cố hố móng, tầng hầm",
    items: [
      {
        title: "Đã đào đất hố móng đúng kích thước, cao độ thiết kế",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh",
        riskIfMissing: "Sai kích thước móng ảnh hưởng khả năng chịu lực công trình",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Có biện pháp chống sạt lở hố đào sâu (nếu có tầng hầm)",
        required: true,
        evidenceRequired: true,
        evidenceType: "Văn bản",
        riskIfMissing: "Sạt lở gây nguy hiểm tính mạng công nhân và ảnh hưởng nhà lân cận",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã quan trắc lún/chuyển vị công trình lân cận (nếu có tầng hầm)",
        required: false,
        evidenceRequired: true,
        evidenceType: "Biên bản",
        riskIfMissing: "Không phát hiện sớm nguy cơ ảnh hưởng nhà lân cận khi đào sâu",
        suggestedModule: "Rủi ro",
      },
      {
        title: "Đã có phương án thoát nước hố móng mùa mưa",
        required: true,
        evidenceRequired: false,
        riskIfMissing: "Ngập úng hố móng làm chậm tiến độ, ảnh hưởng chất lượng nền đất",
        suggestedModule: "Nhật ký",
      },
      {
        title: "Đã chụp ảnh nghiệm thu trước khi đổ bê tông móng",
        required: true,
        evidenceRequired: true,
        evidenceType: "Ảnh",
        riskIfMissing: "Không có bằng chứng cốt thép/kích thước móng khi bê tông đã che khuất",
        suggestedModule: "Nhật ký",
      },
    ],
  },
];

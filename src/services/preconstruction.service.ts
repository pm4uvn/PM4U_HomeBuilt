/**
 * Risk Rules — module "Kiểm soát khởi công & nền móng". Đánh giá compute-on-read dựa trên
 * dữ liệu thật của dự án (mốc cổng kiểm soát, nhật ký, khảo sát hiện trạng, hồ sơ nghiệm thu)
 * để tự động gợi ý cảnh báo rủi ro — không lưu DB, tính lại mỗi lần tải trang Rủi ro.
 */
import { prisma } from "@/lib/prisma";
import { PRE_CONSTRUCTION_GATE_NAME, PILING_GATE_NAME } from "@/lib/standard-milestones";
import type { RiskCategory, RiskSeverity } from "@prisma/client";

export type PreConstructionRiskAlert = {
  ruleId: string;
  title: string;
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  mitigationActions: string[];
};

export async function computePreConstructionRiskAlerts(projectId: string): Promise<PreConstructionRiskAlert[]> {
  const [permitPhase, pilingPhase, structurePhase, neighborSurveys, pilingRecords, pilingWorkLogs, excavationWorkLogs] =
    await Promise.all([
      prisma.phase.findFirst({
        where: { projectId, type: "PERMIT" },
        include: { milestones: { include: { checklistItems: true } } },
      }),
      prisma.phase.findFirst({
        where: { projectId, type: "PILING" },
        include: { milestones: { include: { checklistItems: true } } },
      }),
      prisma.phase.findFirst({ where: { projectId, type: "STRUCTURE" } }),
      prisma.neighborSurvey.count({ where: { projectId } }),
      prisma.pilingRecord.findMany({ where: { projectId }, include: { piles: true } }),
      prisma.dailyLogItem.count({ where: { dailyLog: { projectId }, workType: "PILING" } }),
      prisma.dailyLogItem.count({ where: { dailyLog: { projectId }, workType: "EXCAVATION" } }),
    ]);

  // "Đã khởi công" = giai đoạn Ép cọc hoặc Thi công thô đã có tiến độ thực tế > 0
  const hasStarted =
    (pilingPhase && Number(pilingPhase.progressPct) > 0) || (structurePhase && Number(structurePhase.progressPct) > 0);

  const permitGate = permitPhase?.milestones.find((m) => m.name === PRE_CONSTRUCTION_GATE_NAME);
  const pilingGate = pilingPhase?.milestones.find((m) => m.name === PILING_GATE_NAME);
  const permitGateChecked = (label: string) => permitGate?.checklistItems.find((c) => c.label === label)?.isChecked ?? false;
  const pilingGateChecked = (label: string) => pilingGate?.checklistItems.find((c) => c.label === label)?.isChecked ?? false;

  const alerts: PreConstructionRiskAlert[] = [];

  if (hasStarted && !permitGateChecked("Giấy phép xây dựng")) {
    alerts.push({
      ruleId: "PERMIT_MISSING_BUT_STARTED",
      title: "Chưa có giấy phép xây dựng nhưng đã khởi công",
      category: "LEGAL_PERMIT",
      severity: "CRITICAL",
      description: "Giai đoạn Ép cọc/Thi công thô đã có tiến độ thực tế nhưng mục \"Giấy phép xây dựng\" ở cổng kiểm soát Chuẩn bị khởi công chưa được xác nhận.",
      mitigationActions: [
        "Dừng thi công ngay và bổ sung/hoàn tất giấy phép xây dựng",
        "Liên hệ cơ quan cấp phép để xác nhận tình trạng hồ sơ",
        "Tick xác nhận mục \"Giấy phép xây dựng\" ở mốc Chuẩn bị khởi công sau khi có giấy phép hợp lệ",
      ],
    });
  }

  if (hasStarted && !permitGateChecked("Thông báo khởi công")) {
    alerts.push({
      ruleId: "NO_GROUNDBREAKING_NOTICE",
      title: "Chưa thông báo khởi công cho chính quyền địa phương",
      category: "LEGAL_PERMIT",
      severity: "HIGH",
      description: "Đã có tiến độ thi công thực tế nhưng chưa xác nhận đã gửi thông báo khởi công.",
      mitigationActions: [
        "Soạn và gửi thông báo khởi công kèm giấy phép xây dựng cho UBND phường/xã",
        "Lưu biên nhận thông báo vào Hồ sơ dự án",
        "Tick xác nhận mục \"Thông báo khởi công\" ở mốc Chuẩn bị khởi công",
      ],
    });
  }

  if (!permitGateChecked("Ranh đất/tim móng/cao độ")) {
    alerts.push({
      ruleId: "NO_LAND_BOUNDARY",
      title: "Chưa xác định ranh đất/tim móng/cao độ",
      category: "LEGAL_PERMIT",
      severity: "CRITICAL",
      description: "Chưa xác nhận đã đo đạc, định vị ranh đất/tim móng/cao độ trước khi thi công móng.",
      mitigationActions: [
        "Thuê đơn vị trắc đạc đo đạc ranh đất, tim trục, cao độ thực tế",
        "Đối chiếu với sổ hồng và giấy phép xây dựng",
        "Lập biên bản trắc đạc, lưu hồ sơ và tick xác nhận ở mốc Chuẩn bị khởi công",
      ],
    });
  }

  if (hasStarted && neighborSurveys === 0) {
    alerts.push({
      ruleId: "NO_NEIGHBOR_SURVEY",
      title: "Chưa có biên bản hiện trạng nhà bên cạnh",
      category: "NEIGHBOR_SETTLEMENT_CRACK",
      severity: "HIGH",
      description: "Đã bắt đầu thi công nhưng chưa ghi nhận khảo sát hiện trạng nhà lân cận nào trong hệ thống (mục Khảo sát hiện trạng ở trang Rủi ro).",
      mitigationActions: [
        "Chụp ảnh/quay video hiện trạng toàn bộ nhà lân cận ngay (nếu chưa quá trễ)",
        "Lập biên bản hiện trạng có chữ ký chủ nhà lân cận",
        "Ghi nhận vào mục Khảo sát hiện trạng nhà lân cận ở trang Rủi ro",
      ],
    });
  }

  const hasPileData = pilingRecords.some((r) => r.piles.length > 0) || pilingWorkLogs > 0;
  if (pilingPhase && Number(pilingPhase.progressPct) > 0 && !pilingGateChecked("Nhật ký ép cọc") && !hasPileData) {
    alerts.push({
      ruleId: "PILING_NO_LOG",
      title: "Có ép cọc nhưng chưa có nhật ký ép cọc",
      category: "PILE_QUANTITY_VARIANCE",
      severity: "HIGH",
      description: "Giai đoạn Ép cọc đã có tiến độ thực tế nhưng chưa ghi nhận cây cọc nào ở Đối soát cọc lẫn nhật ký công trình.",
      mitigationActions: [
        "Ghi nhận nhật ký ép cọc cho từng cây (độ sâu, lực ép, ngày ép) ở mục Đối soát cọc — trang Rủi ro",
        "Hoặc ghi nhận vào Nhật ký công trình với loại công việc \"Ép cọc\"",
        "Tick xác nhận mục \"Nhật ký ép cọc\" ở mốc Ép cọc / nền móng",
      ],
    });
  }

  if (excavationWorkLogs > 0 && !pilingGateChecked("Xác nhận giám sát")) {
    alerts.push({
      ruleId: "EXCAVATION_NO_SAFETY_CONFIRM",
      title: "Có đào móng nhưng chưa có biện pháp/xác nhận giám sát an toàn hố đào",
      category: "OTHER",
      severity: "CRITICAL",
      description: "Đã ghi nhận công việc đào móng trong nhật ký nhưng chưa xác nhận giám sát ở cổng kiểm soát Ép cọc / nền móng — rủi ro sạt lở hố đào chưa được kiểm soát.",
      mitigationActions: [
        "Kiểm tra biện pháp chống sạt lở hố đào (nếu đào sâu/có tầng hầm) đã được duyệt và thực hiện",
        "Yêu cầu giám sát công trình xác nhận đã kiểm tra an toàn hố đào",
        "Tick xác nhận mục \"Xác nhận giám sát\" ở mốc Ép cọc / nền móng",
      ],
    });
  }

  if (pilingGate) {
    const approvedFoundationInspections = await prisma.inspectionRecord.findMany({
      where: {
        milestone: { phase: { projectId }, name: { contains: "cốt thép móng" } },
        result: { in: ["PASS", "PASS_WITH_NOTES"] },
      },
      include: { documents: true },
    });
    const missingPhotoEvidence = approvedFoundationInspections.filter((r) => r.documents.length === 0);
    if (missingPhotoEvidence.length > 0) {
      alerts.push({
        ruleId: "NO_PRE_POUR_PHOTOS",
        title: "Chưa có ảnh nghiệm thu trước khi đổ bê tông",
        category: "OTHER",
        severity: "HIGH",
        description: `${missingPhotoEvidence.length} biên bản nghiệm thu cốt thép móng đã đạt nhưng chưa đính kèm ảnh bằng chứng — bê tông sẽ che khuất, khó truy xuất sau này.`,
        mitigationActions: [
          "Nếu chưa đổ bê tông: chụp ảnh cốt thép ngay và đính kèm vào biên bản nghiệm thu tương ứng",
          "Đính kèm ảnh qua mục Hồ sơ, liên kết với biên bản nghiệm thu (Inspection Record)",
          "Áp dụng bắt buộc cho các lần nghiệm thu cốt thép tiếp theo",
        ],
      });
    }
  }

  return alerts;
}

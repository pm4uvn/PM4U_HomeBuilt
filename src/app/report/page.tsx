import { requireUser } from "@/lib/auth";
import { getDashboardData, getDefaultProject } from "@/services/dashboard.service";
import { fmtVND, fmtDate } from "@/lib/format";
import { RISK_SEVERITY } from "@/lib/labels";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

const HEALTH_COLOR: Record<string, string> = { good: "#0ca30c", warning: "#b8860b", critical: "#d03b3b" };
const RISK_COLOR: Record<string, string> = { CRITICAL: "#d03b3b", HIGH: "#d03b3b", MEDIUM: "#b8860b", LOW: "#555" };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e5e5" }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}

export default async function ReportPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <div style={{ padding: 32 }}>Chưa có dự án nào.</div>;
  }
  const data = await getDashboardData(project.id);
  const remaining = data.budget.planned - data.budget.totalSpent;
  const now = new Date();

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "1px solid #ddd", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#555" }}>Xem trước báo cáo — bấm nút để lưu thành PDF</span>
        <PrintButton />
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#888", letterSpacing: 1 }}>PM4U HOMEBUILD — BÁO CÁO TỔNG HỢP DỰ ÁN</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0" }}>{data.project.name}</h1>
          <div style={{ fontSize: 13, color: "#555" }}>Xuất báo cáo lúc {fmtDate(now)}</div>
        </div>

        {/* Sức khỏe dự án */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Sức khỏe dự án</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: HEALTH_COLOR[data.healthScore.sev], margin: "4px 0" }}>
            {data.healthScore.overall}/100
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: HEALTH_COLOR[data.healthScore.sev] }}>{data.healthScore.label}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 10, fontSize: 12, color: "#555" }}>
            <span>Tiến độ: <b style={{ color: "#111" }}>{data.healthScore.schedule}</b></span>
            <span>Ngân sách: <b style={{ color: "#111" }}>{data.healthScore.budget}</b></span>
            <span>Rủi ro: <b style={{ color: "#111" }}>{data.healthScore.risk}</b></span>
          </div>
        </div>

        {/* Ngân sách */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>💰 Ngân sách</h2>
        <div style={{ marginBottom: 20 }}>
          <Row label="Tổng ngân sách dự kiến" value={fmtVND(data.budget.planned)} strong />
          <Row label="Đã chi (thầu + CĐT mua + vật tư)" value={fmtVND(data.budget.totalSpent)} />
          <Row
            label="Còn lại"
            value={fmtVND(remaining)}
          />
          <Row
            label="Phát sinh đã duyệt"
            value={`${data.budget.approvedVariations >= 0 ? "+" : ""}${fmtVND(data.budget.approvedVariations)}`}
          />
          {data.budget.overrun && (
            <div style={{ color: "#d03b3b", fontSize: 12, fontWeight: 600, marginTop: 6 }}>⚠️ Đã vượt tổng ngân sách dự kiến</div>
          )}
        </div>

        {/* Tiến độ */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>📅 Tiến độ</h2>
        <div style={{ marginBottom: 20 }}>
          <Row label="Tiến độ tổng" value={`${data.progress.pct}%`} strong />
          <Row
            label="Số ngày trễ"
            value={data.progress.lateDays > 0 ? `${data.progress.lateDays} ngày` : "Đúng tiến độ"}
          />
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#888", borderBottom: "1px solid #ddd" }}>
                <th style={{ padding: "4px 0" }}>Giai đoạn</th>
                <th style={{ padding: "4px 0" }}>Dự kiến</th>
                <th style={{ padding: "4px 0", textAlign: "right" }}>% hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {data.phases.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "5px 0" }}>{p.name}</td>
                  <td style={{ padding: "5px 0", color: "#555" }}>
                    {p.plannedStart ? fmtDate(p.plannedStart) : "—"} → {p.plannedEnd ? fmtDate(p.plannedEnd) : "—"}
                  </td>
                  <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600 }}>{p.progressPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rủi ro nổi bật */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>⚠️ Rủi ro nổi bật</h2>
        <div style={{ marginBottom: 20 }}>
          {data.risks.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888" }}>Không có rủi ro đang mở.</p>
          ) : (
            data.risks.map((r, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLOR[r.severity] ?? "#555" }}>
                    {RISK_SEVERITY[r.severity] ?? r.severity}
                  </span>
                </div>
                {r.sub && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{r.sub}</div>}
              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 32, paddingTop: 12, borderTop: "1px solid #eee" }}>
          Xuất bởi PM4U HomeBuild lúc {fmtDate(now)}
        </div>
      </div>
    </div>
  );
}

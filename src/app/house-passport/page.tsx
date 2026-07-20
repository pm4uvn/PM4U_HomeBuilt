import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getSignedUrl } from "@/lib/storage";
import { fmtDate } from "@/lib/format";
import { VENDOR_TYPE, DEFECT_STATUS, DOC_TYPE, VT_TRANG_THAI_THI_CONG, TB_TRANG_THAI_LAP_DAT } from "@/lib/labels";
import { PrintButton } from "../report/PrintButton";

export const dynamic = "force-dynamic";

const DEFECT_STATUS_COLOR: Record<string, string> = {
  OPEN: "#d03b3b",
  IN_PROGRESS: "#b8860b",
  FIXED: "#0ca30c",
  CLOSED: "#888",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, marginTop: 24 }}>{children}</h2>;
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ padding: "4px 6px 4px 0", textAlign: right ? "right" : "left", fontWeight: 600 }}>
      {children}
    </th>
  );
}

function Td({ children, right, muted }: { children: React.ReactNode; right?: boolean; muted?: boolean }) {
  return (
    <td
      style={{
        padding: "5px 6px 5px 0",
        textAlign: right ? "right" : "left",
        color: muted ? "#666" : "#111",
      }}
    >
      {children}
    </td>
  );
}

export default async function HousePassportPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <div style={{ padding: 32 }}>Chưa có dự án nào.</div>;
  }

  const [contracts, vatTuDuAnList, thietBiDuAnList, defects, documents] = await Promise.all([
    prisma.contract.findMany({
      where: { projectId: project.id },
      include: { vendor: true },
      orderBy: { signedDate: "asc" },
    }),
    // Module vật tư (bảng riêng ngoài Prisma migrate, app single-project nên không lọc theo projectId)
    prisma.vatTuDuAn.findMany({
      include: { vatTu: { include: { nhom: true } }, nhaCungCap: true },
      orderBy: [{ vatTu: { nhom: { thuTu: "asc" } } }, { id: "asc" }],
    }),
    prisma.thietBiDuAn.findMany({
      include: { thietBi: true, nhaCungCap: true },
      orderBy: [{ thietBi: { maNhom: "asc" } }, { id: "asc" }],
    }),
    prisma.defectLog.findMany({
      where: { projectId: project.id },
      include: { contract: { include: { vendor: true } } },
      orderBy: { warrantyEndAt: "asc" },
    }),
    prisma.document.findMany({
      where: { projectId: project.id, docType: { in: ["PERMIT_DRAWING", "AS_BUILT_DRAWING", "CONTRACT_FILE"] } },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  const documentUrls = await Promise.all(documents.map((d) => getSignedUrl(d.fileUrl)));

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
        <span style={{ fontSize: 13, color: "#555" }}>Xem trước hồ sơ nhà — bấm nút để lưu thành PDF</span>
        <PrintButton />
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#888", letterSpacing: 1 }}>PM4U HOMEBUILD — HỒ SƠ NHÀ</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0" }}>{project.name}</h1>
          <div style={{ fontSize: 13, color: "#555" }}>Xuất lúc {fmtDate(now)}</div>
        </div>

        {/* Thông tin chung */}
        <SectionTitle>🏠 Thông tin chung</SectionTitle>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e5e5" }}>
            <span style={{ color: "#555" }}>Địa chỉ</span>
            <span style={{ fontWeight: 600 }}>{project.address}</span>
          </div>
          {(project.landArea || project.grossFloorArea) && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e5e5" }}>
              <span style={{ color: "#555" }}>Diện tích đất / sàn xây dựng</span>
              <span style={{ fontWeight: 600 }}>
                {project.landArea ? `${Number(project.landArea)}m²` : "—"} / {project.grossFloorArea ? `${Number(project.grossFloorArea)}m²` : "—"}
              </span>
            </div>
          )}
        </div>

        {/* Nhà thầu & liên hệ bảo hành */}
        <SectionTitle>👷 Nhà thầu &amp; liên hệ bảo hành</SectionTitle>
        {contracts.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>Chưa có hợp đồng nào.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 8 }}>
            <thead>
              <tr style={{ color: "#888", borderBottom: "1px solid #ddd" }}>
                <Th>Loại thầu</Th>
                <Th>Nhà thầu</Th>
                <Th>Liên hệ</Th>
                <Th>Ký / Hoàn thành</Th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                  <Td muted>{VENDOR_TYPE[c.vendor.type]}</Td>
                  <Td>{c.vendor.name}</Td>
                  <Td muted>{[c.vendor.contactName, c.vendor.phone].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td muted>{fmtDate(c.signedDate)} → {fmtDate(c.plannedEndDate)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Vật tư đã sử dụng */}
        <SectionTitle>🧱 Vật tư đã sử dụng</SectionTitle>
        {vatTuDuAnList.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>Chưa ghi nhận vật tư nào.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 8 }}>
            <thead>
              <tr style={{ color: "#888", borderBottom: "1px solid #ddd" }}>
                <Th>Vật tư</Th>
                <Th>Khu vực</Th>
                <Th>Thương hiệu</Th>
                <Th>Nhà cung cấp</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {vatTuDuAnList.map((r) => (
                <tr key={r.id.toString()} style={{ borderBottom: "1px solid #eee" }}>
                  <Td>{r.vatTu.tenVatTu}</Td>
                  <Td muted>{r.khuVucSuDung ?? "—"}</Td>
                  <Td muted>{r.vatTu.thuongHieuGoiY ?? "—"}</Td>
                  <Td muted>{r.nhaCungCap?.tenNhaCungCap ?? "—"}</Td>
                  <Td muted>{VT_TRANG_THAI_THI_CONG[r.trangThaiThiCong] ?? r.trangThaiThiCong}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Thiết bị điện tử đã lắp */}
        <SectionTitle>🔌 Thiết bị điện tử đã lắp</SectionTitle>
        {thietBiDuAnList.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>Chưa ghi nhận thiết bị nào.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 8 }}>
            <thead>
              <tr style={{ color: "#888", borderBottom: "1px solid #ddd" }}>
                <Th>Thiết bị</Th>
                <Th>Vị trí lắp đặt</Th>
                <Th>Bảo hành</Th>
                <Th>Nhà cung cấp</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {thietBiDuAnList.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <Td>{r.thietBi.tenHangMuc}</Td>
                  <Td muted>{r.viTriLapDat ?? "—"}</Td>
                  <Td muted>{r.thietBi.baoHanhThang ? `${r.thietBi.baoHanhThang} tháng` : "—"}</Td>
                  <Td muted>{r.nhaCungCap?.tenNhaCungCap ?? "—"}</Td>
                  <Td muted>{TB_TRANG_THAI_LAP_DAT[r.trangThaiLapDat] ?? r.trangThaiLapDat}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Bảo hành & khiếm khuyết đang theo dõi */}
        <SectionTitle>🛠️ Bảo hành &amp; khiếm khuyết đang theo dõi</SectionTitle>
        {defects.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>Chưa ghi nhận khiếm khuyết nào.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 8 }}>
            <thead>
              <tr style={{ color: "#888", borderBottom: "1px solid #ddd" }}>
                <Th>Hạng mục</Th>
                <Th>Nhà thầu chịu trách nhiệm</Th>
                <Th>Hạn bảo hành</Th>
                <Th right>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {defects.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #eee" }}>
                  <Td>{d.title}</Td>
                  <Td muted>{d.contract?.vendor.name ?? "—"}</Td>
                  <Td muted>{d.warrantyEndAt ? fmtDate(d.warrantyEndAt) : "—"}</Td>
                  <Td right>
                    <span style={{ fontWeight: 700, color: DEFECT_STATUS_COLOR[d.status] ?? "#555" }}>
                      {DEFECT_STATUS[d.status] ?? d.status}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Tài liệu quan trọng */}
        <SectionTitle>📄 Tài liệu quan trọng</SectionTitle>
        {documents.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>Chưa có tài liệu nào.</p>
        ) : (
          <ul style={{ fontSize: 12.5, paddingLeft: 0, listStyle: "none" }}>
            {documents.map((d, i) => (
              <li key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{d.title}</span>{" "}
                  <span style={{ color: "#888" }}>({DOC_TYPE[d.docType] ?? d.docType})</span>
                </span>
                {documentUrls[i] && (
                  <a href={documentUrls[i]!} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                    Tải xuống
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 32, paddingTop: 12, borderTop: "1px solid #eee" }}>
          Xuất bởi PM4U HomeBuild lúc {fmtDate(now)}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getSignedUrl, getServiceClient } from "@/lib/storage";
import { Card, Tag, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { DOC_TYPE } from "@/lib/labels";
import { UploadDocumentForm } from "./forms";
import { PreviewButton } from "@/components/FilePreview";

export const dynamic = "force-dynamic";

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const { type } = await searchParams;
  const hasServiceKey = getServiceClient() !== null;

  const [documents, contracts, risks] = await Promise.all([
    prisma.document.findMany({
      where: { projectId: project.id, ...(type ? { docType: type as never } : {}) },
      include: { contract: true, riskLog: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.contract.findMany({ where: { projectId: project.id }, include: { vendor: true } }),
    prisma.riskLog.findMany({ where: { projectId: project.id } }),
  ]);

  // Signed URL cho từng file (bucket private)
  const urls = await Promise.all(documents.map((d) => getSignedUrl(d.fileUrl)));

  // Đếm theo loại cho bộ lọc
  const counts = await prisma.document.groupBy({
    by: ["docType"],
    where: { projectId: project.id },
    _count: true,
  });

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📁 Hồ sơ & Tài liệu</h1>
        <div className="ml-auto">
          <UploadDocumentForm
            projectId={project.id}
            contracts={contracts.map((c) => ({ id: c.id, label: `${c.code} — ${c.vendor.name}` }))}
            risks={risks.map((r) => ({ id: r.id, label: r.title }))}
          />
        </div>
      </header>

      {!hasServiceKey && (
        <Card>
          <p className="text-sm" style={{ color: "var(--serious)" }}>
            ⚠️ Chưa cấu hình <code className="bg-page border border-line rounded px-1">SUPABASE_SERVICE_KEY</code> trong{" "}
            <code className="bg-page border border-line rounded px-1">.env</code> — upload và xem file sẽ không hoạt động.
            Lấy secret key (sb_secret_...) tại Supabase Dashboard → Project Settings → API Keys.
          </p>
        </Card>
      )}

      {/* Bộ lọc theo loại */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/documents"
          className={`text-[13px] font-semibold rounded-full px-3.5 py-1.5 border ${!type ? "bg-brand text-white border-brand" : "border-line bg-surface hover:bg-page"}`}
        >
          Tất cả ({counts.reduce((s, c) => s + c._count, 0)})
        </Link>
        {counts.map((c) => (
          <Link
            key={c.docType}
            href={`/documents?type=${c.docType}`}
            className={`text-[13px] font-semibold rounded-full px-3.5 py-1.5 border ${type === c.docType ? "bg-brand text-white border-brand" : "border-line bg-surface hover:bg-page"}`}
          >
            {DOC_TYPE[c.docType]} ({c._count})
          </Link>
        ))}
      </div>

      <Card>
        {documents.length === 0 ? (
          <EmptyState
            title="Chưa có hồ sơ nào"
            sub="Bản vẽ xin phép, bản vẽ kỹ thuật, biên bản nghiệm thu, ảnh khảo sát nhà lân cận…"
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Tài liệu</th>
                <th className="py-1 pr-2 font-semibold">Loại</th>
                <th className="py-1 pr-2 font-semibold">Tags / Liên kết</th>
                <th className="py-1 pr-2 font-semibold">Ngày tải</th>
                <th className="py-1 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d, i) => {
                const meta = d.meta as { cotNen?: number; khoangLui?: number; dienTichSan?: number; tum?: boolean } | null;
                return (
                  <tr key={d.id} className="border-b border-grid last:border-0 text-[13px]">
                    <td className="py-2.5 pr-2">
                      <div className="font-semibold">{d.title}</div>
                      <div className="text-xs text-muted">
                        {fmtSize(d.fileSize)}
                        {meta && (
                          <>
                            {" "}· {meta.cotNen != null && `cốt nền ${meta.cotNen}m · `}
                            {meta.khoangLui != null && `lùi ${meta.khoangLui}m · `}
                            {meta.dienTichSan != null && `sàn ${meta.dienTichSan}m² · `}
                            {meta.tum != null && (meta.tum ? "có tum" : "không tum")}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-2"><Tag sev="neutral">{DOC_TYPE[d.docType]}</Tag></td>
                    <td className="py-2.5 pr-2 text-xs text-ink-2">
                      {d.tags.length > 0 && <div>{d.tags.map((t) => `#${t}`).join(" ")}</div>}
                      {d.contract && <div>📋 {d.contract.code}</div>}
                      {d.riskLog && <div>⚠️ {d.riskLog.title}</div>}
                    </td>
                    <td className="py-2.5 pr-2 money">{fmtDate(d.uploadedAt)}</td>
                    <td className="py-2.5 text-right">
                      {urls[i] ? (
                        <PreviewButton url={urls[i]!} mimeType={d.mimeType} title={d.title} />
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

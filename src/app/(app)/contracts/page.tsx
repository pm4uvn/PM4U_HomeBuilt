import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, Tag, EmptyState } from "@/components/ui";
import { fmtVND, fmtDate } from "@/lib/format";
import { VENDOR_TYPE, CONTRACT_STATUS } from "@/lib/labels";
import {
  CreateProjectForm, CreateVendorForm, EditVendorForm, CreateContractForm, EditContractForm,
} from "./forms";

export const dynamic = "force-dynamic";

const STATUS_SEV: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  DRAFT: "neutral", SIGNED: "warning", IN_PROGRESS: "good",
  COMPLETED: "neutral", TERMINATED: "critical",
};

export default async function ContractsPage() {
  await requireUser();
  const project = await getDefaultProject();

  if (!project) {
    return (
      <Card>
        <div className="text-center py-10 space-y-3">
          <div className="text-4xl">🏗️</div>
          <p className="font-bold">Bắt đầu bằng việc tạo dự án</p>
          <CreateProjectForm />
        </div>
      </Card>
    );
  }

  const [vendors, contracts] = await Promise.all([
    prisma.vendor.findMany({ where: { projectId: project.id }, orderBy: { type: "asc" } }),
    prisma.contract.findMany({
      where: { projectId: project.id },
      include: {
        vendor: true,
        paymentStages: true,
      },
      orderBy: { signedDate: "asc" },
    }),
  ]);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📋 Hợp đồng & Nhà thầu</h1>
        <div className="ml-auto flex gap-2">
          <CreateVendorForm projectId={project.id} existingVendors={vendors} />
          {vendors.length > 0 && (
            <CreateContractForm
              projectId={project.id}
              vendors={vendors.map((v) => ({ id: v.id, name: v.name, type: v.type }))}
            />
          )}
        </div>
      </header>

      <Card title={`Nhà thầu & NCC (${vendors.length})`}>
        {vendors.length === 0 ? (
          <EmptyState title="Chưa có nhà thầu" sub="Thêm nhà thầu trước, sau đó số hóa hợp đồng" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {vendors.map((v) => (
              <span
                key={v.id}
                className="flex items-center gap-2 border border-line rounded-lg pl-3 pr-1.5 py-1.5 text-[13px]"
              >
                <span>
                  <b>{v.name}</b>
                  <span className="text-muted"> · {VENDOR_TYPE[v.type]}</span>
                  {v.phone && <span className="text-muted"> · {v.phone}</span>}
                </span>
                <EditVendorForm vendor={v} />
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Hợp đồng (${contracts.length})`}>
        {contracts.length === 0 ? (
          <EmptyState title="Chưa có hợp đồng nào" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Số HĐ</th>
                <th className="py-1 pr-2 font-semibold">Nhà thầu</th>
                <th className="py-1 pr-2 font-semibold text-right">Giá trị (gồm VAT)</th>
                <th className="py-1 pr-2 font-semibold">Thanh toán</th>
                <th className="py-1 pr-2 font-semibold">Hoàn thành</th>
                <th className="py-1 pr-2 font-semibold">Trạng thái</th>
                <th className="py-1 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const paid = c.paymentStages.filter((s) => s.status === "PAID").length;
                const valueWithVat = Number(c.contractValue) * (1 + Number(c.vatRate) / 100);
                return (
                  <tr key={c.id} className="border-b border-grid last:border-0 text-[13px] hover:bg-page">
                    <td className="py-2.5 pr-2">
                      <Link href={`/contracts/${c.id}`} className="font-semibold text-brand hover:underline">
                        {c.code}
                      </Link>
                      <div className="text-muted text-xs">{c.title}</div>
                    </td>
                    <td className="py-2.5 pr-2">
                      {c.vendor.name}
                      <div className="text-muted text-xs">{VENDOR_TYPE[c.vendor.type]}</div>
                    </td>
                    <td className="py-2.5 pr-2 text-right money font-bold">
                      {fmtVND(Math.round(valueWithVat))}
                      <div className="text-muted text-xs font-normal">
                        ({fmtVND(Number(c.contractValue))} + VAT {Number(c.vatRate)}%)
                      </div>
                    </td>
                    <td className="py-2.5 pr-2">{paid}/{c.paymentStages.length} đợt</td>
                    <td className="py-2.5 pr-2 money">{fmtDate(c.plannedEndDate)}</td>
                    <td className="py-2.5 pr-2"><Tag sev={STATUS_SEV[c.status]}>{CONTRACT_STATUS[c.status]}</Tag></td>
                    <td className="py-2.5 text-right">
                      <EditContractForm
                        contract={{
                          id: c.id,
                          vendorId: c.vendorId,
                          code: c.code,
                          title: c.title,
                          status: c.status,
                          contractValue: Number(c.contractValue),
                          vatRate: Number(c.vatRate),
                          retentionPct: Number(c.retentionPct),
                          signedDate: c.signedDate?.toISOString() ?? null,
                          startDate: c.startDate?.toISOString() ?? null,
                          plannedEndDate: c.plannedEndDate?.toISOString() ?? null,
                        }}
                        vendors={vendors.map((v) => ({ id: v.id, name: v.name, type: v.type }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

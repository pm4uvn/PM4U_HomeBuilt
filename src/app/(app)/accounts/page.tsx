import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState } from "@/components/ui";
import { fmtVND, fmtDate } from "@/lib/format";
import { VENDOR_TYPE } from "@/lib/labels";
import { CreateBankAccountForm, EditBankAccountForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [bankAccounts, vendors] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      include: {
        // Nguồn dữ liệu gốc: từng giao dịch thật (1 đợt có thể trả nhiều lần từ nhiều TK khác nhau)
        transactions: {
          where: { paymentStage: { contract: { projectId: project.id } } },
          include: { paymentStage: { include: { contract: { include: { vendor: true } } } } },
          orderBy: { paidDate: "desc" },
        },
      },
    }),
    prisma.vendor.findMany({ where: { projectId: project.id }, orderBy: { type: "asc" } }),
  ]);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🏦 Tài khoản ngân hàng</h1>
        <div className="ml-auto"><CreateBankAccountForm projectId={project.id} /></div>
      </header>

      {/* TK của CĐT — chi tiết + lịch sử giao dịch */}
      {bankAccounts.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có tài khoản nào"
            sub="Thêm tài khoản ngân hàng của bạn để chọn khi xác nhận thanh toán, tiện đối soát sao kê"
          />
        </Card>
      ) : (
        bankAccounts.map((a) => {
          const total = a.transactions.reduce((s, t) => s + Number(t.amount), 0);
          return (
            <Card key={a.id}>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h2 className="font-bold">{a.nickname}</h2>
                <span className="text-ink-2 text-[13px]">
                  {a.bankName} · {a.accountNumber}
                  {a.accountHolder && ` · ${a.accountHolder}`}
                </span>
                <span className="ml-auto text-right">
                  <span className="block text-xs text-muted">Tổng đã chi qua TK này</span>
                  <span className="font-bold money">{fmtVND(total)}</span>
                </span>
                <EditBankAccountForm
                  account={{
                    id: a.id, nickname: a.nickname, bankName: a.bankName,
                    accountNumber: a.accountNumber, accountHolder: a.accountHolder,
                  }}
                />
              </div>

              {a.transactions.length === 0 ? (
                <p className="text-[13px] text-muted">Chưa có giao dịch nào qua tài khoản này.</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] text-muted border-b border-grid">
                      <th className="py-1 pr-2 font-semibold">Ngày trả</th>
                      <th className="py-1 pr-2 font-semibold">Hợp đồng</th>
                      <th className="py-1 pr-2 font-semibold">Đợt</th>
                      <th className="py-1 font-semibold text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.transactions.map((t) => (
                      <tr key={t.id} className="border-b border-grid last:border-0 text-[13px]">
                        <td className="py-2 pr-2 money">{fmtDate(t.paidDate)}</td>
                        <td className="py-2 pr-2">
                          <Link href={`/contracts/${t.paymentStage.contractId}`} className="text-brand hover:underline font-semibold">
                            {t.paymentStage.contract.code}
                          </Link>
                          <span className="text-muted"> · {t.paymentStage.contract.vendor.name}</span>
                        </td>
                        <td className="py-2 pr-2">
                          Đợt {t.paymentStage.stageNo}: {t.paymentStage.name}
                          {t.note && <div className="text-xs text-muted">{t.note}</div>}
                        </td>
                        <td className="py-2 text-right money font-bold">{fmtVND(Number(t.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </Card>
          );
        })
      )}

      {/* TK nhận tiền của nhà thầu — tham khảo nhanh, sửa ở trang Hợp đồng */}
      <Card title="Tài khoản nhận tiền của nhà thầu">
        {vendors.length === 0 ? (
          <EmptyState title="Chưa có nhà thầu nào" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Nhà thầu</th>
                <th className="py-1 font-semibold">Tài khoản nhận tiền</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2">
                    <b>{v.name}</b>
                    <span className="text-muted"> · {VENDOR_TYPE[v.type]}</span>
                  </td>
                  <td className="py-2">
                    {v.bankName && v.bankAccountNumber ? (
                      <>
                        {v.bankName} · {v.bankAccountNumber}
                        {v.bankAccountHolder && ` · ${v.bankAccountHolder}`}
                      </>
                    ) : (
                      <Link href="/contracts" className="text-muted italic hover:underline">
                        Chưa có — thêm ở trang Hợp đồng
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

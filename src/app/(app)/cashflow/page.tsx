import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { getBudgetSummary } from "@/services/budget.service";
import { getMonthlyForecast } from "@/services/cashflow-forecast.service";
import { computeStageGrossAmount } from "@/lib/payment-calc";
import { tinhThanhTien } from "@/lib/vattu-calc";
import { Card, Tag, StatusPill, EmptyState } from "@/components/ui";
import { fmtVND, fmtTr, fmtDate } from "@/lib/format";
import { OWNER_SUPPLY_CATEGORY, PURCHASE_STATUS, PAYMENT_STATUS, VT_TRANG_THAI_THI_CONG, TB_TRANG_THAI_LAP_DAT, OTHER_EXPENSE_CATEGORY, OTHER_EXPENSE_STATUS } from "@/lib/labels";
import { CreatePurchaseForm, UpdatePurchaseForm, ForecastMonthGroups, CreateOtherExpenseForm, UpdateOtherExpenseForm } from "./forms";

export const dynamic = "force-dynamic";

/** Tên hiển thị danh mục chi phí phát sinh — CUSTOM (OTHER) dùng tên tự đặt, các danh mục còn lại dùng tên có sẵn */
const otherExpenseCategoryName = (e: { category: string; categoryLabel: string | null }) =>
  e.category === "OTHER" ? (e.categoryLabel || "Khác") : OTHER_EXPENSE_CATEGORY[e.category];

export default async function CashflowPage() {
  await requireUser();
  const project = await getDefaultProject();
  if (!project) {
    return <Card><EmptyState title="Chưa có dự án" sub="Tạo dự án ở trang Hợp đồng trước" /></Card>;
  }

  const [budget, stages, purchases, forecast, vatTuDuAnList, thietBiDuAnList, otherExpenses] = await Promise.all([
    getBudgetSummary(project.id),
    prisma.paymentStage.findMany({
      where: { contract: { projectId: project.id } },
      include: { contract: { include: { vendor: true } }, paidFromAccount: true, triggerMilestone: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.ownerPurchaseItem.findMany({
      where: { projectId: project.id },
      orderBy: [{ status: "asc" }, { neededByDate: "asc" }],
    }),
    getMonthlyForecast(project.id),
    // Module vật tư (bảng riêng ngoài Prisma migrate, app single-project nên không lọc theo projectId)
    prisma.vatTuDuAn.findMany({
      include: { vatTu: { include: { nhom: true } } },
      orderBy: [{ vatTu: { nhom: { thuTu: "asc" } } }, { id: "asc" }],
    }),
    // Module thiết bị điện tử (cùng bảng riêng ngoài Prisma migrate, cùng lý do không lọc theo projectId)
    prisma.thietBiDuAn.findMany({
      include: { thietBi: true },
      orderBy: [{ thietBi: { maNhom: "asc" } }, { id: "asc" }],
    }),
    prisma.otherExpense.findMany({
      where: { projectId: project.id },
      orderBy: [{ status: "asc" }, { expenseDate: "asc" }],
    }),
  ]);

  const remaining = budget.planned - budget.totalSpent;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">💰 Dòng tiền & Ngân sách</h1>
        <div className="ml-auto flex gap-2">
          <CreateOtherExpenseForm projectId={project.id} />
          <CreatePurchaseForm projectId={project.id} />
        </div>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
        <Card title="Ngân sách dự kiến"><div className="text-xl font-bold money">{fmtTr(budget.planned)}</div></Card>
        <Card title="Đã chi (5 dòng tiền)">
          <div className="text-xl font-bold money">{fmtTr(budget.totalSpent)}</div>
          <div className="text-xs text-ink-2 mt-1 money">
            Thầu {fmtTr(budget.contractorPaid)} · CĐT mua {fmtTr(budget.ownerPaid)} · Vật tư {fmtTr(budget.materialsSpent)} · Thiết bị {fmtTr(budget.equipmentSpent)} · Phát sinh khác {fmtTr(budget.otherExpensesSpent)}
          </div>
        </Card>
        <Card title="Còn lại">
          <div className="text-xl font-bold money" style={{ color: remaining < 0 ? "var(--critical)" : "var(--good-text)" }}>
            {fmtTr(remaining)}
          </div>
          {budget.overrun && <Tag sev="critical">Vượt ngân sách</Tag>}
        </Card>
        <Card title="Phát sinh đã duyệt">
          <div className="text-xl font-bold money">
            {budget.approvedVariations >= 0 ? "+" : ""}{fmtTr(budget.approvedVariations)}
          </div>
        </Card>
      </div>

      {/* Dự báo dòng tiền theo tháng */}
      <Card title="Dự báo dòng tiền theo tháng">
        {forecast.months.length === 0 ? (
          <EmptyState title="Chưa có khoản chi nào để dự báo" />
        ) : (
          <div className="space-y-3">
            {forecast.months.map((m) => {
              const maxTotal = Math.max(...forecast.months.map((x) => x.total));
              return (
                <div key={m.monthKey}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-[13px] w-16 shrink-0">{m.monthLabel}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-grid overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(m.total / maxTotal) * 100}%`, background: "var(--series-1)" }}
                      />
                    </div>
                    <span className="font-bold text-[13px] money w-28 text-right shrink-0">{fmtVND(m.total)}</span>
                  </div>
                  <ForecastMonthGroups items={m.items} />
                </div>
              );
            })}
          </div>
        )}
        {forecast.undated.length > 0 && (
          <p className="text-xs text-muted mt-3 pt-3 border-t border-grid">
            ⚠️ {forecast.undated.length} đợt chưa có hạn lẫn milestone dự kiến nên chưa đưa vào dự báo:{" "}
            {forecast.undated.map((u) => `${u.label} (${u.contractCode})`).join(", ")}. Gắn milestone hoặc đặt ngày dự kiến ở trang Tiến độ để dự báo đầy đủ.
          </p>
        )}
      </Card>

      {/* Dòng tiền 1: trả nhà thầu */}
      <Card title="Dòng tiền 1 — Trả nhà thầu theo đợt hợp đồng">
        {stages.length === 0 ? (
          <EmptyState title="Chưa có đợt thanh toán nào" sub="Cấu hình trong chi tiết từng hợp đồng" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Hợp đồng</th>
                <th className="py-1 pr-2 font-semibold">Đợt</th>
                <th className="py-1 pr-2 font-semibold text-right">Số tiền</th>
                <th className="py-1 pr-2 font-semibold">Hạn</th>
                <th className="py-1 pr-2 font-semibold">Trạng thái</th>
                <th className="py-1 font-semibold">Trả từ TK</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => {
                // Nhất quán với chi tiết hợp đồng: gốc + VAT, trừ/hoàn retention; nếu PARTIAL hiện số còn thiếu
                const gross = computeStageGrossAmount({
                  contractValue: Number(s.contract.contractValue),
                  vatRate: Number(s.contract.vatRate),
                  retentionPct: Number(s.contract.retentionPct),
                  percent: Number(s.percent),
                  isFinal: s.isFinal,
                });
                const paidSoFar = s.paidAmount != null ? Number(s.paidAmount) : 0;
                const amount = s.status === "PAID" ? paidSoFar : Math.round(gross - (s.status === "PARTIAL" ? paidSoFar : 0));
                return (
                  <tr key={s.id} className="border-b border-grid last:border-0 text-[13px]">
                    <td className="py-2 pr-2">
                      <Link href={`/contracts/${s.contractId}`} className="text-brand hover:underline font-semibold">
                        {s.contract.code}
                      </Link>
                      <span className="text-muted"> · {s.contract.vendor.name}</span>
                    </td>
                    <td className="py-2 pr-2">Đợt {s.stageNo}: {s.name}</td>
                    <td className="py-2 pr-2 text-right money font-bold">
                      {fmtVND(amount)}
                      {s.status === "PARTIAL" && (
                        <div className="text-xs font-normal" style={{ color: "var(--serious)" }}>còn thiếu</div>
                      )}
                    </td>
                    <td className="py-2 pr-2 money">
                      {s.dueDate ? (
                        fmtDate(s.dueDate)
                      ) : s.triggerMilestone?.plannedDate ? (
                        <span className="text-muted italic" title="Dự kiến — chỉ chính thức sau khi milestone nghiệm thu đạt">
                          ~{fmtDate(s.triggerMilestone.plannedDate)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill
                        status={s.status === "PAID" ? "good" : s.status === "OVERDUE" ? "critical" : s.status === "PARTIAL" ? "serious" : s.status === "DUE" ? "warning" : "neutral"}
                        label={PAYMENT_STATUS[s.status]}
                      />
                    </td>
                    <td className="py-2 text-ink-2 text-xs">
                      {s.paidFromAccount ? s.paidFromAccount.nickname : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Dòng tiền 2: CĐT tự mua */}
      <Card title={`Dòng tiền 2 — Hạng mục CĐT tự cung cấp (kế hoạch ${fmtTr(budget.ownerPlanned)})`}>
        {purchases.length === 0 ? (
          <EmptyState title="Chưa có hạng mục nào" sub="Gạch ốp lát, thiết bị vệ sinh, điện máy, nội thất rời…" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Danh mục</th>
                <th className="py-1 pr-2 font-semibold">Hạng mục</th>
                <th className="py-1 pr-2 font-semibold text-right">Dự kiến</th>
                <th className="py-1 pr-2 font-semibold text-right">Thực tế</th>
                <th className="py-1 pr-2 font-semibold">Cần trước</th>
                <th className="py-1 pr-2 font-semibold">Trạng thái</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2 text-ink-2">{OWNER_SUPPLY_CATEGORY[p.category]}</td>
                  <td className="py-2 pr-2 font-semibold">
                    {p.name}
                    {p.supplierName && <div className="text-xs text-muted font-normal">{p.supplierName}</div>}
                  </td>
                  <td className="py-2 pr-2 text-right money">{fmtVND(Number(p.plannedCost))}</td>
                  <td className="py-2 pr-2 text-right money font-bold">
                    {p.actualCost != null ? fmtVND(Number(p.actualCost)) : "—"}
                  </td>
                  <td className="py-2 pr-2 money">{fmtDate(p.neededByDate)}</td>
                  <td className="py-2 pr-2">
                    <Tag sev={p.status === "INSTALLED" ? "good" : p.status === "PLANNED" ? "neutral" : "warning"}>
                      {PURCHASE_STATUS[p.status]}
                    </Tag>
                  </td>
                  <td className="py-2 text-right">
                    <UpdatePurchaseForm itemId={p.id} currentStatus={p.status} plannedCost={Number(p.plannedCost)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Dòng tiền 3: Vật tư hoàn thiện */}
      <Card title={`Dòng tiền 3 — Vật tư hoàn thiện (kế hoạch ${fmtTr(budget.materialsPlanned)})`}>
        {vatTuDuAnList.length === 0 ? (
          <EmptyState title="Chưa có vật tư nào trong dự án" sub="Thêm ở trang Vật tư" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Nhóm</th>
                <th className="py-1 pr-2 font-semibold">Vật tư</th>
                <th className="py-1 pr-2 font-semibold text-right">Dự kiến</th>
                <th className="py-1 pr-2 font-semibold text-right">Chốt</th>
                <th className="py-1 font-semibold">Trạng thái thi công</th>
              </tr>
            </thead>
            <tbody>
              {vatTuDuAnList.map((v) => {
                const duKien = tinhThanhTien(
                  v.khoiLuongDuKien ? Number(v.khoiLuongDuKien) : null,
                  v.donGiaDuKien ? Number(v.donGiaDuKien) : null,
                  v.thanhTienDuKien ? Number(v.thanhTienDuKien) : null,
                );
                const chot = tinhThanhTien(
                  v.khoiLuongThucTe ? Number(v.khoiLuongThucTe) : null,
                  v.donGiaChot ? Number(v.donGiaChot) : null,
                  v.thanhTienChot ? Number(v.thanhTienChot) : null,
                );
                return (
                  <tr key={v.id.toString()} className="border-b border-grid last:border-0 text-[13px]">
                    <td className="py-2 pr-2 text-ink-2">{v.vatTu.nhom.tenNhomVatTu}</td>
                    <td className="py-2 pr-2 font-semibold">{v.vatTu.tenVatTu}</td>
                    <td className="py-2 pr-2 text-right money">{duKien ? fmtVND(duKien) : "—"}</td>
                    <td className="py-2 pr-2 text-right money font-bold">{chot ? fmtVND(chot) : "—"}</td>
                    <td className="py-2">
                      <Tag
                        sev={
                          v.trangThaiThiCong === "da_nghiem_thu"
                            ? "good"
                            : v.trangThaiThiCong === "chua_thi_cong"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {VT_TRANG_THAI_THI_CONG[v.trangThaiThiCong]}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        <p className="text-xs text-muted mt-3 pt-3 border-t border-grid">
          Xem/sửa chi tiết khối lượng, đơn giá, trạng thái từng vật tư ở{" "}
          <Link href="/materials" className="text-brand hover:underline font-semibold">trang Vật tư</Link>.
        </p>
      </Card>

      {/* Dòng tiền 4: Thiết bị điện tử */}
      <Card title={`Dòng tiền 4 — Thiết bị điện tử (kế hoạch ${fmtTr(budget.equipmentPlanned)})`}>
        {thietBiDuAnList.length === 0 ? (
          <EmptyState title="Chưa có thiết bị nào trong dự án" sub="Thêm ở trang Thiết bị" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Nhóm</th>
                <th className="py-1 pr-2 font-semibold">Thiết bị</th>
                <th className="py-1 pr-2 font-semibold text-right">Dự kiến</th>
                <th className="py-1 pr-2 font-semibold text-right">Chốt</th>
                <th className="py-1 font-semibold">Trạng thái lắp đặt</th>
              </tr>
            </thead>
            <tbody>
              {thietBiDuAnList.map((tb) => {
                const duKien = tinhThanhTien(
                  tb.soLuongDuKien ? Number(tb.soLuongDuKien) : null,
                  tb.donGiaDuKien ? Number(tb.donGiaDuKien) : null,
                  tb.thanhTienDuKien ? Number(tb.thanhTienDuKien) : null,
                );
                const chot = tinhThanhTien(
                  tb.soLuongThucTe ? Number(tb.soLuongThucTe) : null,
                  tb.donGiaChot ? Number(tb.donGiaChot) : null,
                  tb.thanhTienChot ? Number(tb.thanhTienChot) : null,
                );
                return (
                  <tr key={tb.id} className="border-b border-grid last:border-0 text-[13px]">
                    <td className="py-2 pr-2 text-ink-2">{tb.thietBi.nhomCap1}</td>
                    <td className="py-2 pr-2 font-semibold">{tb.thietBi.tenHangMuc}</td>
                    <td className="py-2 pr-2 text-right money">{duKien ? fmtVND(duKien) : "—"}</td>
                    <td className="py-2 pr-2 text-right money font-bold">{chot ? fmtVND(chot) : "—"}</td>
                    <td className="py-2">
                      <Tag
                        sev={
                          tb.trangThaiLapDat === "da_lap_dat"
                            ? "good"
                            : tb.trangThaiLapDat === "chua_lap_dat"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {TB_TRANG_THAI_LAP_DAT[tb.trangThaiLapDat]}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        <p className="text-xs text-muted mt-3 pt-3 border-t border-grid">
          Xem/sửa chi tiết số lượng, đơn giá, trạng thái từng thiết bị ở{" "}
          <Link href="/equipment" className="text-brand hover:underline font-semibold">trang Thiết bị</Link>.
        </p>
      </Card>

      {/* Dòng tiền 5: Chi phí phát sinh khác */}
      <Card title={`Dòng tiền 5 — Chi phí phát sinh khác (kế hoạch ${fmtTr(budget.otherExpensesPlanned)})`}>
        {otherExpenses.length === 0 ? (
          <EmptyState title="Chưa có chi phí phát sinh nào" sub="Phí xin phép, bồi dưỡng đội thợ, vận chuyển phát sinh, chi phí không lường trước…" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-grid">
                <th className="py-1 pr-2 font-semibold">Danh mục</th>
                <th className="py-1 pr-2 font-semibold">Nội dung</th>
                <th className="py-1 pr-2 font-semibold text-right">Dự kiến</th>
                <th className="py-1 pr-2 font-semibold text-right">Thực tế</th>
                <th className="py-1 pr-2 font-semibold">Ngày chi</th>
                <th className="py-1 pr-2 font-semibold">Trạng thái</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {otherExpenses.map((e) => (
                <tr key={e.id} className="border-b border-grid last:border-0 text-[13px]">
                  <td className="py-2 pr-2 text-ink-2">{otherExpenseCategoryName(e)}</td>
                  <td className="py-2 pr-2 font-semibold">
                    {e.title}
                    {e.note && <div className="text-xs text-muted font-normal">{e.note}</div>}
                  </td>
                  <td className="py-2 pr-2 text-right money">{fmtVND(Number(e.plannedCost))}</td>
                  <td className="py-2 pr-2 text-right money font-bold">
                    {e.actualCost != null ? fmtVND(Number(e.actualCost)) : "—"}
                  </td>
                  <td className="py-2 pr-2 money">{fmtDate(e.expenseDate)}</td>
                  <td className="py-2 pr-2">
                    <Tag sev={e.status === "PAID" ? "good" : "neutral"}>
                      {OTHER_EXPENSE_STATUS[e.status]}
                    </Tag>
                  </td>
                  <td className="py-2 text-right">
                    <UpdateOtherExpenseForm itemId={e.id} currentStatus={e.status} plannedCost={Number(e.plannedCost)} />
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

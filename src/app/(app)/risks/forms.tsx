"use client";

import { useState, useTransition } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select, Textarea, Tag, Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import {
  RISK_CATEGORY, RISK_SEVERITY, RISK_STATUS, RISK_PROBABILITY, RISK_RESPONSE_STRATEGY,
  IDLE_CAUSE, PHASE_TYPE,
} from "@/lib/labels";
import { RISK_TEMPLATES } from "@/lib/risk-templates";
import {
  createRisk, updateRisk, deleteRisk, updateRiskStatus, createNeighborSurvey,
  startIdleWait, stopIdleWait, createPilingRecord, addPileItem, addRiskFromTemplate,
  toggleRiskMitigationAction,
} from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

/**
 * Menu thả xuống gom các hành động ghi nhận ít dùng (khảo sát, chờ việc, ép cọc) để header đỡ rối.
 * Các nút con (ModalButton) LUÔN được giữ mounted — chỉ ẩn/hiện bằng CSS, không unmount — vì unmount
 * đúng lúc form con vừa mở modal sẽ hủy luôn state "đang mở" của modal đó (bug: bấm không thấy gì xảy ra).
 * Modal của form con tự render qua portal ra <body> nên không bị ẩn theo khi panel này bị display:none.
 */
export function ActionMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="default" onClick={() => setOpen((v) => !v)}>
        {label} {open ? "▴" : "▾"}
      </Button>
      {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />}
      <div
        className={`absolute right-0 mt-1.5 z-40 bg-surface border border-line rounded-lg shadow-lg p-1.5 flex flex-col gap-1 min-w-[220px] [&>button]:w-full [&>button]:text-left ${open ? "" : "hidden"}`}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    </div>
  );
}

export function CreateRiskForm({ projectId, picOptions = [] }: { projectId: string; picOptions?: string[] }) {
  return (
    <ModalButton label="+ Rủi ro" title="Ghi nhận rủi ro">
      {(close) => (
        <form action={async (fd) => { await createRisk(projectId, fd); close(); }} className="space-y-3">
          <datalist id="risk-pic-options">
            {picOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhóm rủi ro *"><Select name="category" required>{opts(RISK_CATEGORY)}</Select></Field>
            <Field label="Người phụ trách"><Input name="owner" list="risk-pic-options" placeholder="CĐT / Giám sát / Nhà thầu X" /></Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required placeholder="Đụng ống nước ngầm khi đào móng" /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} /></Field>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Xác suất"><Select name="probability" defaultValue="MEDIUM">{opts(RISK_PROBABILITY)}</Select></Field>
            <Field label="Mức ảnh hưởng"><Select name="severity" defaultValue="MEDIUM">{opts(RISK_SEVERITY)}</Select></Field>
            <Field label="Chiến lược ứng phó"><Select name="responseStrategy" defaultValue="MITIGATE">{opts(RISK_RESPONSE_STRATEGY)}</Select></Field>
          </div>
          <Field label="Ước tính chi phí ảnh hưởng (VND)"><Input name="estimatedCostImpact" inputMode="numeric" /></Field>
          <Field label="Phương án xử lý"><Textarea name="mitigationPlan" rows={2} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export type RiskEditRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  probability: string;
  severity: string;
  responseStrategy: string;
  owner: string | null;
  estimatedCostImpact: number | null;
  actualCostImpact: number | null;
  mitigationPlan: string | null;
};

export function EditRiskForm({ risk, picOptions = [] }: { risk: RiskEditRow; picOptions?: string[] }) {
  return (
    <ModalButton label="Sửa" title={`Sửa rủi ro — ${risk.title}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateRisk(risk.id, fd); close(); }} className="space-y-3">
          <datalist id="risk-pic-options">
            {picOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhóm rủi ro *">
              <Select name="category" required defaultValue={risk.category}>{opts(RISK_CATEGORY)}</Select>
            </Field>
            <Field label="Người phụ trách">
              <Input name="owner" list="risk-pic-options" defaultValue={risk.owner ?? ""} placeholder="CĐT / Giám sát / Nhà thầu X" />
            </Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required defaultValue={risk.title} /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} defaultValue={risk.description ?? ""} /></Field>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Xác suất">
              <Select name="probability" defaultValue={risk.probability}>{opts(RISK_PROBABILITY)}</Select>
            </Field>
            <Field label="Mức ảnh hưởng">
              <Select name="severity" defaultValue={risk.severity}>{opts(RISK_SEVERITY)}</Select>
            </Field>
            <Field label="Chiến lược ứng phó">
              <Select name="responseStrategy" defaultValue={risk.responseStrategy}>{opts(RISK_RESPONSE_STRATEGY)}</Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Ước tính chi phí ảnh hưởng (VND)">
              <Input name="estimatedCostImpact" inputMode="numeric" defaultValue={risk.estimatedCostImpact ?? ""} />
            </Field>
            <Field label="Chi phí thực tế đã phát sinh (VND)">
              <Input name="actualCostImpact" inputMode="numeric" defaultValue={risk.actualCostImpact ?? ""} />
            </Field>
          </div>
          <Field label="Phương án xử lý"><Textarea name="mitigationPlan" rows={2} defaultValue={risk.mitigationPlan ?? ""} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function DeleteRiskButton({ riskId, title }: { riskId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Xóa rủi ro "${title}"? Không thể hoàn tác.`)) return;
        startTransition(() => deleteRisk(riskId));
      }}
    >
      Xóa
    </Button>
  );
}

const TEMPLATE_SEV_TAG: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  LOW: "good", MEDIUM: "neutral", HIGH: "warning", CRITICAL: "critical",
};

export type AutoRiskAlertRow = {
  ruleId: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  mitigationActions: string[];
};

/**
 * Cảnh báo tự động từ Risk Rules — module "Kiểm soát khởi công & nền móng". Tính lại mỗi lần tải trang
 * dựa trên dữ liệu thật (cổng kiểm soát, nhật ký, khảo sát hiện trạng...), không phải rủi ro đã lưu sẵn.
 */
export function AutoRiskAlerts({ projectId, alerts }: { projectId: string; alerts: AutoRiskAlertRow[] }) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  if (alerts.length === 0) return null;

  return (
    <Card title="🚨 Cảnh báo tự động — Kiểm soát khởi công & nền móng">
      <div className="space-y-2">
        {alerts.map((a) => {
          const isAdded = added.has(a.ruleId);
          return (
            <div key={a.ruleId} className="flex items-start gap-3 flex-wrap border border-line rounded-lg px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[13.5px] flex items-center gap-2 flex-wrap">
                  {a.title}
                  <Tag sev={TEMPLATE_SEV_TAG[a.severity] ?? "neutral"}>{RISK_SEVERITY[a.severity] ?? a.severity}</Tag>
                </div>
                <div className="text-[12.5px] text-ink-2 mt-0.5">{a.description}</div>
                <ul className="list-disc list-inside text-xs text-muted mt-1 space-y-0.5">
                  {a.mitigationActions.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
              <Button
                variant={isAdded ? "default" : "primary"}
                disabled={isAdded || pending}
                onClick={() => {
                  startTransition(async () => {
                    await addRiskFromTemplate(projectId, {
                      title: a.title,
                      category: a.category as never,
                      severity: a.severity as never,
                      description: a.description,
                      mitigationActions: a.mitigationActions,
                    });
                    setAdded((prev) => new Set(prev).add(a.ruleId));
                  });
                }}
              >
                {isAdded ? "✓ Đã thêm" : "+ Thêm vào sổ"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const TEMPLATE_PHASE_ORDER = Object.keys(RISK_TEMPLATES) as (keyof typeof RISK_TEMPLATES)[];

/** Danh mục rủi ro thường gặp theo từng giai đoạn (đúc kết kinh nghiệm PM xây dựng), bấm để thêm nhanh vào Sổ rủi ro */
export function RiskTemplateLibrary({
  projectId,
  existingTitles,
}: {
  projectId: string;
  existingTitles: string[];
}) {
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const existing = new Set(existingTitles);

  return (
    <Card title="📚 Danh mục rủi ro theo giai đoạn (gợi ý theo kinh nghiệm PM)">
      <div className="space-y-1.5">
        {TEMPLATE_PHASE_ORDER.map((phase) => {
          const items = RISK_TEMPLATES[phase] ?? [];
          const open = openPhase === phase;
          return (
            <div key={phase} className="border border-line rounded-lg">
              <button
                type="button"
                onClick={() => setOpenPhase(open ? null : phase)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13.5px] font-semibold"
              >
                <span>{open ? "▾" : "▸"}</span>
                <span>{PHASE_TYPE[phase]}</span>
                <span className="text-muted text-xs font-normal ml-auto">{items.length} rủi ro thường gặp</span>
              </button>
              {open && (
                <div className="border-t border-grid divide-y divide-grid">
                  {items.map((t) => {
                    const key = `${phase}:${t.title}`;
                    const isAdded = added.has(key) || existing.has(t.title);
                    return (
                      <div key={key} className="flex items-start gap-3 flex-wrap px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[13px] flex items-center gap-2 flex-wrap">
                            {t.title}
                            <Tag sev={TEMPLATE_SEV_TAG[t.severity]}>{RISK_SEVERITY[t.severity]}</Tag>
                          </div>
                          <div className="text-[12.5px] text-ink-2 mt-0.5">{t.description}</div>
                          <div className="text-xs text-muted mt-1">
                            <span className="font-semibold">Hoạt động giảm thiểu:</span>
                            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                              {t.mitigationActions.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <Button
                          variant={isAdded ? "default" : "primary"}
                          disabled={isAdded || pending}
                          onClick={() => {
                            startTransition(async () => {
                              await addRiskFromTemplate(projectId, {
                                title: t.title,
                                category: t.category as never,
                                severity: t.severity as never,
                                description: t.description,
                                mitigationActions: t.mitigationActions,
                              });
                              setAdded((prev) => new Set(prev).add(key));
                            });
                          }}
                        >
                          {isAdded ? "✓ Đã thêm" : "+ Thêm vào sổ"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export type MitigationActionRow = { id: string; label: string; isDone: boolean };

/** Checklist hoạt động giảm thiểu của 1 rủi ro — tick trực tiếp như nhật ký công trình, khỏi cần mở form riêng */
export function RiskMitigationChecklist({ actions }: { actions: MitigationActionRow[] }) {
  if (actions.length === 0) return null;
  const doneCount = actions.filter((a) => a.isDone).length;

  return (
    <div className="mt-1.5">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">
        Hoạt động giảm thiểu ({doneCount}/{actions.length})
      </div>
      <ul className="mt-1 space-y-1">
        {actions.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-[12.5px]">
            <input
              type="checkbox"
              className="mt-0.5"
              defaultChecked={a.isDone}
              onChange={(e) => toggleRiskMitigationAction(a.id, e.target.checked)}
            />
            <span className={a.isDone ? "text-muted line-through" : "text-ink-2"}>{a.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RiskStatusSelect({ riskId, current }: { riskId: string; current: string }) {
  return (
    <Select
      defaultValue={current}
      className="!w-auto"
      onChange={(e) => updateRiskStatus(riskId, e.target.value as never)}
    >
      {opts(RISK_STATUS)}
    </Select>
  );
}

export function CreateNeighborSurveyForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Khảo sát nhà lân cận" title="Khảo sát hiện trạng nhà lân cận" variant="default">
      {(close) => (
        <form action={async (fd) => { await createNeighborSurvey(projectId, fd); close(); }} className="space-y-3">
          <Field label="Địa chỉ nhà lân cận *"><Input name="neighborAddress" required placeholder="Nhà bên trái — 123/4 đường X" /></Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Chủ nhà"><Input name="neighborName" /></Field>
            <Field label="SĐT"><Input name="neighborPhone" /></Field>
          </div>
          <Field label="Ngày khảo sát"><Input name="surveyDate" type="date" /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasExistingCracks" />
            Đã có vết nứt sẵn TRƯỚC khi thi công (chụp ảnh làm bằng chứng!)
          </label>
          <Field label="Ghi chú"><Textarea name="notes" rows={2} placeholder="Vết nứt tường bếp 30cm, ảnh đã lưu Hồ sơ..." /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function StartIdleWaitForm({
  contracts,
}: {
  contracts: { id: string; label: string }[];
}) {
  return (
    <ModalButton label="⏱️ Bắt đầu tính chờ việc" title="Bắt đầu tracker phạt chờ việc" variant="default">
      {(close) => (
        <form action={async (fd) => { await startIdleWait(fd); close(); }} className="space-y-3">
          <Field label="Hợp đồng bị ảnh hưởng *">
            <Select name="contractId" required>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nguyên nhân"><Select name="cause">{opts(IDLE_CAUSE)}</Select></Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Từ ngày"><Input name="startDate" type="date" /></Field>
            <Field label="Phạt/ngày (VND) *"><Input name="dailyPenalty" required inputMode="numeric" defaultValue="4000000" /></Field>
          </div>
          <Field label="Ghi chú"><Input name="note" placeholder="Dàn máy ép cọc đứng chờ do chưa dọn mặt bằng" /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Bắt đầu tính</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function StopIdleWaitButton({ idleLogId }: { idleLogId: string }) {
  return (
    <Button variant="danger" onClick={() => stopIdleWait(idleLogId)}>
      Dừng đồng hồ
    </Button>
  );
}

export function CreatePilingRecordForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Hồ sơ ép cọc" title="Tạo hồ sơ đối soát cọc ép" variant="default">
      {(close) => (
        <form action={async (fd) => { await createPilingRecord(projectId, fd); close(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Số cọc ép thử *"><Input name="testPileCount" type="number" required defaultValue="2" /></Field>
            <Field label="Độ sâu TB cọc thử (m) *"><Input name="testPileAvgDepth" required inputMode="decimal" placeholder="18" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Chiều dài cọc đặt hàng (m) *"><Input name="designPileLength" required inputMode="decimal" placeholder="18" /></Field>
            <Field label="Đơn giá / mét (VND) *"><Input name="unitPricePerMeter" required inputMode="numeric" placeholder="250000" /></Field>
          </div>
          <Field label="Phí vận chuyển trả cọc dư (VND)"><Input name="returnFreightFee" inputMode="numeric" /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Tạo hồ sơ</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export type PileRow = {
  id: string;
  pileNo: number;
  plannedLength: number;
  actualDepth: number | null;
  cutOffLength: number | null;
  pressedAt: string | null;
};

/** Bảng chi tiết từng cọc — thu gọn mặc định, chỉ xổ ra khi cần đối chiếu/tranh chấp với nhà thầu */
export function PileTableToggle({ piles }: { piles: PileRow[] }) {
  const [open, setOpen] = useState(false);
  if (piles.length === 0) return null;

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-brand text-xs font-semibold">
        {open ? "▲ Thu gọn" : `▾ Xem chi tiết từng cọc (${piles.length})`}
      </button>
      {open && (
        <div className="overflow-x-auto">
        <table className="w-full mt-2">
          <thead>
            <tr className="text-left text-[11px] text-muted border-b border-grid">
              <th className="py-1 pr-2 font-semibold">Cọc</th>
              <th className="py-1 pr-2 font-semibold text-right">Dài đặt (m)</th>
              <th className="py-1 pr-2 font-semibold text-right">Sâu thực tế (m)</th>
              <th className="py-1 pr-2 font-semibold text-right">Dư (m)</th>
              <th className="py-1 font-semibold">Ngày ép</th>
            </tr>
          </thead>
          <tbody>
            {piles.map((p) => (
              <tr key={p.id} className="border-b border-grid last:border-0 text-[13px]">
                <td className="py-1.5 pr-2 font-semibold">#{p.pileNo}</td>
                <td className="py-1.5 pr-2 text-right money">{p.plannedLength}</td>
                <td className="py-1.5 pr-2 text-right money">{p.actualDepth != null ? p.actualDepth : "—"}</td>
                <td
                  className="py-1.5 pr-2 text-right money"
                  style={{ color: (p.cutOffLength ?? 0) > 0 ? "var(--critical)" : undefined }}
                >
                  {p.cutOffLength != null ? p.cutOffLength.toFixed(1) : "—"}
                </td>
                <td className="py-1.5 money">{fmtDate(p.pressedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

export function AddPileItemForm({ pilingRecordId, nextPileNo, designLength }: { pilingRecordId: string; nextPileNo: number; designLength: number }) {
  return (
    <ModalButton label="+ Cọc" title="Ghi nhận cọc ép" variant="default">
      {(close) => (
        <form action={async (fd) => { await addPileItem(pilingRecordId, fd); close(); }} className="space-y-3">
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Cọc số *"><Input name="pileNo" type="number" required defaultValue={String(nextPileNo)} /></Field>
            <Field label="Dài đặt hàng (m)"><Input name="plannedLength" inputMode="decimal" defaultValue={String(designLength)} /></Field>
            <Field label="Độ sâu ép thực tế (m)"><Input name="actualDepth" inputMode="decimal" placeholder="15.2" /></Field>
          </div>
          <Field label="Ngày ép"><Input name="pressedAt" type="date" /></Field>
          <p className="text-xs text-muted">Phần dư = dài đặt hàng − độ sâu thực tế (tự tính)</p>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

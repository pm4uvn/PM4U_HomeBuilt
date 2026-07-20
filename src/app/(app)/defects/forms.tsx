"use client";

import { useState, useTransition } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { DEFECT_CATEGORY, DEFECT_SEVERITY, DEFECT_STATUS } from "@/lib/labels";
import {
  createDefect, updateDefect, deleteDefect, updateDefectStatus,
  addDefectAction, toggleDefectAction, deleteDefectAction,
} from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export type ContractOption = { id: string; label: string };

function contractOptions(contracts: ContractOption[]) {
  return (
    <>
      <option value="">— Không liên kết —</option>
      {contracts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
    </>
  );
}

export function CreateDefectForm({
  projectId, contracts, defaultWarrantyStart, picOptions = [],
}: { projectId: string; contracts: ContractOption[]; defaultWarrantyStart: string | null; picOptions?: string[] }) {
  return (
    <ModalButton label="+ Khiếm khuyết" title="Ghi nhận khiếm khuyết">
      {(close) => (
        <form action={async (fd) => { await createDefect(projectId, fd); close(); }} className="space-y-3">
          <datalist id="defect-pic-options">
            {picOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhóm khiếm khuyết *"><Select name="category" required>{opts(DEFECT_CATEGORY)}</Select></Field>
            <Field label="Vị trí"><Input name="location" placeholder="WC tầng 2, mái sân thượng..." /></Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required placeholder="Thấm trần WC tầng 2" /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} /></Field>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Mức độ"><Select name="severity" defaultValue="MEDIUM">{opts(DEFECT_SEVERITY)}</Select></Field>
            <Field label="Ngày phát hiện"><Input name="reportedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Hạn xử lý"><Input name="dueDate" type="date" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Người báo cáo"><Input name="reportedBy" placeholder="Ai phát hiện" /></Field>
            <Field label="Người phụ trách xử lý"><Input name="owner" list="defect-pic-options" placeholder="CĐT / Giám sát" /></Field>
          </div>
          <Field label="Nhà thầu chịu trách nhiệm bảo hành (tùy chọn)">
            <Select name="contractId" defaultValue="">{contractOptions(contracts)}</Select>
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Ngày bắt đầu bảo hành">
              <Input name="warrantyStartAt" type="date" defaultValue={defaultWarrantyStart ?? ""} />
            </Field>
            <Field label="Số tháng bảo hành">
              <Input name="warrantyMonths" type="number" min={1} placeholder="VD: 24" />
            </Field>
          </div>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export type DefectEditRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  severity: string;
  location: string | null;
  reportedBy: string | null;
  owner: string | null;
  reportedDate: string | null;
  dueDate: string | null;
  contractId: string | null;
  warrantyMonths: number | null;
  warrantyStartAt: string | null;
  resolution: string | null;
};

export function EditDefectForm({
  defect, contracts, picOptions = [],
}: { defect: DefectEditRow; contracts: ContractOption[]; picOptions?: string[] }) {
  return (
    <ModalButton label="Sửa" title={`Sửa khiếm khuyết — ${defect.title}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateDefect(defect.id, fd); close(); }} className="space-y-3">
          <datalist id="defect-pic-options">
            {picOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhóm khiếm khuyết *">
              <Select name="category" required defaultValue={defect.category}>{opts(DEFECT_CATEGORY)}</Select>
            </Field>
            <Field label="Vị trí"><Input name="location" defaultValue={defect.location ?? ""} /></Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required defaultValue={defect.title} /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} defaultValue={defect.description ?? ""} /></Field>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Mức độ">
              <Select name="severity" defaultValue={defect.severity}>{opts(DEFECT_SEVERITY)}</Select>
            </Field>
            <Field label="Ngày phát hiện">
              <Input name="reportedDate" type="date" defaultValue={defect.reportedDate?.slice(0, 10) ?? ""} />
            </Field>
            <Field label="Hạn xử lý">
              <Input name="dueDate" type="date" defaultValue={defect.dueDate?.slice(0, 10) ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Người báo cáo"><Input name="reportedBy" defaultValue={defect.reportedBy ?? ""} /></Field>
            <Field label="Người phụ trách xử lý"><Input name="owner" list="defect-pic-options" defaultValue={defect.owner ?? ""} /></Field>
          </div>
          <Field label="Nhà thầu chịu trách nhiệm bảo hành (tùy chọn)">
            <Select name="contractId" defaultValue={defect.contractId ?? ""}>{contractOptions(contracts)}</Select>
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Ngày bắt đầu bảo hành">
              <Input name="warrantyStartAt" type="date" defaultValue={defect.warrantyStartAt?.slice(0, 10) ?? ""} />
            </Field>
            <Field label="Số tháng bảo hành">
              <Input name="warrantyMonths" type="number" min={1} defaultValue={defect.warrantyMonths ?? ""} />
            </Field>
          </div>
          <Field label="Cách đã xử lý (resolution)"><Textarea name="resolution" rows={2} defaultValue={defect.resolution ?? ""} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function DeleteDefectButton({ defectId, title }: { defectId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Xóa khiếm khuyết "${title}"? Không thể hoàn tác.`)) return;
        startTransition(() => deleteDefect(defectId));
      }}
    >
      Xóa
    </Button>
  );
}

export function DefectStatusSelect({ defectId, current }: { defectId: string; current: string }) {
  return (
    <Select
      defaultValue={current}
      className="!w-auto"
      onChange={(e) => updateDefectStatus(defectId, e.target.value as never)}
    >
      {opts(DEFECT_STATUS)}
    </Select>
  );
}

export type DefectActionRow = { id: string; label: string; isDone: boolean };

/** Danh sách hành động xử lý 1 khiếm khuyết — tick nhanh + thêm mới, giống IssueActionChecklist */
export function DefectActionChecklist({ defectId, actions }: { defectId: string; actions: DefectActionRow[] }) {
  const [adding, setAdding] = useState(false);
  const doneCount = actions.filter((a) => a.isDone).length;

  return (
    <div className="mt-1.5">
      {actions.length > 0 && (
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">
          Hành động xử lý ({doneCount}/{actions.length})
        </div>
      )}
      <ul className="mt-1 space-y-1">
        {actions.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-[12.5px] group">
            <input
              type="checkbox"
              className="mt-0.5"
              defaultChecked={a.isDone}
              onChange={(e) => toggleDefectAction(a.id, e.target.checked)}
            />
            <span className={a.isDone ? "text-muted line-through" : "text-ink-2"}>{a.label}</span>
            <button
              type="button"
              onClick={() => deleteDefectAction(a.id)}
              className="text-critical text-xs opacity-0 group-hover:opacity-100 ml-auto"
            >
              Xóa
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form
          action={async (fd) => { await addDefectAction(defectId, fd); setAdding(false); }}
          className="mt-1.5 flex items-center gap-2 flex-wrap"
        >
          <Input name="label" required placeholder="Hành động xử lý..." className="!py-1 text-[12.5px] flex-1 min-w-[140px]" />
          <Button type="submit" variant="primary" className="!py-1">Thêm</Button>
          <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted">Hủy</button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-brand font-semibold hover:underline mt-1"
        >
          + Thêm hành động xử lý
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ISSUE_CATEGORY, ISSUE_SEVERITY, ISSUE_STATUS, RISK_CATEGORY } from "@/lib/labels";
import { createIssue, updateIssue, deleteIssue, updateIssueStatus, addIssueAction, toggleIssueAction, deleteIssueAction } from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export type RiskOption = { id: string; title: string; category: string };
export type RiskTemplateOption = { title: string; category: string };

/** Ghi tiền tố lên value để actions.ts nhận biết đây là mẫu chưa thêm vào sổ (chọn xong tự tạo RiskLog thật) */
const TPL_PREFIX = "tpl::";

/**
 * Danh sách rủi ro cho dropdown liên kết — gộp cả rủi ro ĐÃ ghi nhận (sổ rủi ro thật) LẪN mẫu rủi ro
 * chưa thêm vào sổ (thư viện ~90 mẫu ở trang Rủi ro), để không giới hạn chỉ 1 vài rủi ro đã lỡ tạo trước.
 * Chọn 1 mẫu chưa có thì lúc lưu Issue sẽ tự tạo RiskLog thật từ mẫu đó rồi mới liên kết (xem actions.ts).
 * Nhóm theo danh mục bằng <optgroup> — cùng cách nhóm dùng cho mốc/vật tư ở module Tiến độ.
 */
function riskOptions(risks: RiskOption[], templates: RiskTemplateOption[]) {
  const categories = Array.from(new Set([...risks.map((r) => r.category), ...templates.map((t) => t.category)]));
  return (
    <>
      <option value="">— Không liên kết —</option>
      {categories.map((category) => {
        const existingItems = risks.filter((r) => r.category === category);
        const templateItems = templates.filter((t) => t.category === category);
        if (existingItems.length === 0 && templateItems.length === 0) return null;
        return (
          <optgroup key={category} label={RISK_CATEGORY[category] ?? category}>
            {existingItems.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            {templateItems.map((t) => (
              <option key={t.title} value={`${TPL_PREFIX}${t.title}`}>{t.title} (mẫu — chưa thêm vào sổ)</option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

export function CreateIssueForm({
  projectId, risks, riskTemplates, picOptions = [],
}: { projectId: string; risks: RiskOption[]; riskTemplates: RiskTemplateOption[]; picOptions?: string[] }) {
  return (
    <ModalButton label="+ Vấn đề" title="Ghi nhận vấn đề (Issue)">
      {(close) => (
        <form action={async (fd) => { await createIssue(projectId, fd); close(); }} className="space-y-3">
          <datalist id="issue-pic-options">
            {picOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhóm vấn đề *"><Select name="category" required>{opts(ISSUE_CATEGORY)}</Select></Field>
            <Field label="Người phụ trách xử lý"><Input name="owner" list="issue-pic-options" placeholder="CĐT / Giám sát / Nhà thầu X" /></Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required placeholder="Nhà thầu giao sai loại gạch ốp lát" /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} /></Field>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Mức độ"><Select name="priority" defaultValue="MEDIUM">{opts(ISSUE_SEVERITY)}</Select></Field>
            <Field label="Ngày phát hiện"><Input name="raisedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Hạn xử lý"><Input name="dueDate" type="date" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Người báo cáo"><Input name="raisedBy" placeholder="Ai phát hiện vấn đề" /></Field>
            <Field label="Ước tính ảnh hưởng chi phí (VND)"><Input name="costImpact" inputMode="numeric" /></Field>
          </div>
          <Field label="Liên kết rủi ro (tùy chọn)">
            <Select name="relatedRiskId" defaultValue="">
              {riskOptions(risks, riskTemplates)}
            </Select>
          </Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export type IssueEditRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  priority: string;
  raisedBy: string | null;
  owner: string | null;
  raisedDate: string | null;
  dueDate: string | null;
  costImpact: number | null;
  resolution: string | null;
  relatedRiskId: string | null;
};

export function EditIssueForm({
  issue, risks, riskTemplates, picOptions = [],
}: { issue: IssueEditRow; risks: RiskOption[]; riskTemplates: RiskTemplateOption[]; picOptions?: string[] }) {
  return (
    <ModalButton label="Sửa" title={`Sửa vấn đề — ${issue.title}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateIssue(issue.id, fd); close(); }} className="space-y-3">
          <datalist id="issue-pic-options">
            {picOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhóm vấn đề *">
              <Select name="category" required defaultValue={issue.category}>{opts(ISSUE_CATEGORY)}</Select>
            </Field>
            <Field label="Người phụ trách xử lý">
              <Input name="owner" list="issue-pic-options" defaultValue={issue.owner ?? ""} placeholder="CĐT / Giám sát / Nhà thầu X" />
            </Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required defaultValue={issue.title} /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} defaultValue={issue.description ?? ""} /></Field>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <Field label="Mức độ">
              <Select name="priority" defaultValue={issue.priority}>{opts(ISSUE_SEVERITY)}</Select>
            </Field>
            <Field label="Ngày phát hiện">
              <Input name="raisedDate" type="date" defaultValue={issue.raisedDate?.slice(0, 10) ?? ""} />
            </Field>
            <Field label="Hạn xử lý">
              <Input name="dueDate" type="date" defaultValue={issue.dueDate?.slice(0, 10) ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Người báo cáo">
              <Input name="raisedBy" defaultValue={issue.raisedBy ?? ""} />
            </Field>
            <Field label="Ước tính ảnh hưởng chi phí (VND)">
              <Input name="costImpact" inputMode="numeric" defaultValue={issue.costImpact ?? ""} />
            </Field>
          </div>
          <Field label="Liên kết rủi ro (tùy chọn)">
            <Select name="relatedRiskId" defaultValue={issue.relatedRiskId ?? ""}>
              {riskOptions(risks, riskTemplates)}
            </Select>
          </Field>
          <Field label="Cách đã xử lý (resolution)"><Textarea name="resolution" rows={2} defaultValue={issue.resolution ?? ""} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function DeleteIssueButton({ issueId, title }: { issueId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Xóa vấn đề "${title}"? Không thể hoàn tác.`)) return;
        startTransition(() => deleteIssue(issueId));
      }}
    >
      Xóa
    </Button>
  );
}

export function IssueStatusSelect({ issueId, current }: { issueId: string; current: string }) {
  return (
    <Select
      defaultValue={current}
      className="!w-auto"
      onChange={(e) => updateIssueStatus(issueId, e.target.value as never)}
    >
      {opts(ISSUE_STATUS)}
    </Select>
  );
}

export type IssueActionRow = { id: string; label: string; isDone: boolean };

/** Danh sách hành động xử lý 1 vấn đề — tick nhanh + thêm mới, giống RiskMitigationChecklist */
export function IssueActionChecklist({ issueId, actions }: { issueId: string; actions: IssueActionRow[] }) {
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
              onChange={(e) => toggleIssueAction(a.id, e.target.checked)}
            />
            <span className={a.isDone ? "text-muted line-through" : "text-ink-2"}>{a.label}</span>
            <button
              type="button"
              onClick={() => deleteIssueAction(a.id)}
              className="text-critical text-xs opacity-0 group-hover:opacity-100 ml-auto"
            >
              Xóa
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form
          action={async (fd) => { await addIssueAction(issueId, fd); setAdding(false); }}
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

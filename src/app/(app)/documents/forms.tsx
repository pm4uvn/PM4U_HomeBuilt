"use client";

import { useActionState, useState } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { DOC_TYPE } from "@/lib/labels";
import { uploadDocument, type UploadState } from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export function UploadDocumentForm({
  projectId,
  contracts,
  risks,
}: {
  projectId: string;
  contracts: { id: string; label: string }[];
  risks: { id: string; label: string }[];
}) {
  return (
    <ModalButton label="+ Tải hồ sơ lên" title="Tải hồ sơ / bản vẽ lên">
      {(close) => <UploadForm projectId={projectId} contracts={contracts} risks={risks} close={close} />}
    </ModalButton>
  );
}

function UploadForm({
  projectId,
  contracts,
  risks,
  close,
}: {
  projectId: string;
  contracts: { id: string; label: string }[];
  risks: { id: string; label: string }[];
  close: () => void;
}) {
  const [docType, setDocType] = useState("PERMIT_DRAWING");
  const [state, action, pending] = useActionState<UploadState, FormData>(
    async (prev, fd) => {
      const result = await uploadDocument(projectId, prev, fd);
      if (result.ok) close();
      return result;
    },
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <Field label="File * (tối đa 50MB)">
        <Input name="file" type="file" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại hồ sơ">
          <Select name="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {opts(DOC_TYPE)}
          </Select>
        </Field>
        <Field label="Tiêu đề (bỏ trống = tên file)">
          <Input name="title" />
        </Field>
      </div>

      {docType === "PERMIT_DRAWING" && (
        <div className="border border-line rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase">Chỉ tiêu bản vẽ xin phép</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cốt nền (m)"><Input name="cotNen" inputMode="decimal" placeholder="0.45" /></Field>
            <Field label="Khoảng lùi (m)"><Input name="khoangLui" inputMode="decimal" placeholder="2.4" /></Field>
            <Field label="DT sàn (m²)"><Input name="dienTichSan" inputMode="decimal" placeholder="210.5" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="tum" /> Có tum
          </label>
        </div>
      )}

      <Field label="Tags (phân cách bằng dấu phẩy)">
        <Input name="tags" placeholder="móng, tầng 2, WC master" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gắn với hợp đồng">
          <Select name="contractId" defaultValue="">
            <option value="">— Không —</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Gắn với rủi ro">
          <Select name="riskLogId" defaultValue="">
            <option value="">— Không —</option>
            {risks.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      {state.error && <p className="text-critical text-sm">⚠️ {state.error}</p>}

      <div className="pt-2">
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Đang tải lên…" : "Tải lên"}
        </Button>
      </div>
    </form>
  );
}

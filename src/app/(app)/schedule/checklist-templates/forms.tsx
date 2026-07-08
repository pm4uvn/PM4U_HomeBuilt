"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Textarea, Tag } from "@/components/ui";
import {
  createTemplate, deleteTemplate, addTemplateItem, deleteTemplateItem, seedDefaultTemplates,
  seedPreConstructionTemplates,
} from "./actions";

export function CreateTemplateForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Mẫu mới" title="Tạo mẫu checklist cho hạng mục">
      {(close) => (
        <form action={async (fd) => { await createTemplate(projectId, fd); close(); }} className="space-y-3">
          <Field label="Tên hạng mục *"><Input name="category" required placeholder="Chống thấm, Điện, Cửa..." /></Field>
          <Field label="Các mục kiểm tra (mỗi dòng 1 mục)">
            <Textarea name="items" rows={6} placeholder={"Đã xử lý sạch bề mặt trước khi chống thấm\nThử ngâm nước tối thiểu 24h\n..."} />
          </Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Tạo mẫu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function SeedDefaultTemplatesButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="default"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const count = await seedDefaultTemplates(projectId);
          alert(count > 0 ? `Đã nạp ${count} mẫu mặc định.` : "Đã có đủ mẫu cho tất cả hạng mục mặc định.");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Đang nạp…" : "📥 Nạp mẫu mặc định (kinh nghiệm 50 năm)"}
    </Button>
  );
}

export function SeedPreConstructionTemplatesButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="default"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const count = await seedPreConstructionTemplates(projectId);
          alert(count > 0 ? `Đã nạp ${count} mẫu "Kiểm soát khởi công & nền móng".` : "Đã có đủ mẫu cho các hạng mục này.");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Đang nạp…" : "🏗️ Nạp mẫu Kiểm soát khởi công & nền móng"}
    </Button>
  );
}

export function DeleteTemplateButton({ templateId, category }: { templateId: string; category: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`Xóa toàn bộ mẫu "${category}"?`)) return;
        await deleteTemplate(templateId);
        router.refresh();
      }}
      className="text-critical text-xs font-semibold hover:underline"
    >
      Xóa mẫu
    </button>
  );
}

export type TemplateItemFull = {
  id: string;
  label: string;
  required: boolean;
  evidenceRequired: boolean;
  evidenceType: string | null;
  riskIfMissing: string | null;
  suggestedModule: string | null;
};

export function TemplateItemRow({ item }: { item: TemplateItemFull }) {
  const router = useRouter();
  return (
    <div className="py-1.5 group">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-ink-2 flex-1">{item.label}</span>
        {item.required && <Tag sev="warning">Bắt buộc</Tag>}
        {item.evidenceRequired && <Tag sev="neutral">📎 {item.evidenceType || "Bằng chứng"}</Tag>}
        {item.suggestedModule && <span className="text-[11px] text-muted whitespace-nowrap">→ {item.suggestedModule}</span>}
        <button
          type="button"
          onClick={async () => {
            await deleteTemplateItem(item.id);
            router.refresh();
          }}
          className="text-critical text-xs opacity-0 group-hover:opacity-100 shrink-0"
        >
          Xóa
        </button>
      </div>
      {item.riskIfMissing && (
        <p className="text-[11px] text-muted mt-0.5">⚠️ Nếu thiếu: {item.riskIfMissing}</p>
      )}
    </div>
  );
}

export function AddTemplateItemForm({ templateId }: { templateId: string }) {
  const [adding, setAdding] = useState(false);
  if (!adding) {
    return (
      <button type="button" onClick={() => setAdding(true)} className="text-xs text-brand font-semibold hover:underline mt-1">
        + Thêm mục
      </button>
    );
  }
  return (
    <form
      action={async (fd) => {
        await addTemplateItem(templateId, fd);
        setAdding(false);
      }}
      className="space-y-1.5 mt-1.5 border border-line rounded-lg p-2"
    >
      <Input name="label" required autoFocus placeholder="Mục kiểm tra..." className="!py-1 text-[13px]" />
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" name="required" defaultChecked /> Bắt buộc</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="evidenceRequired" /> Cần bằng chứng</label>
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-sm:grid-cols-1">
        <Input name="evidenceType" placeholder="Loại bằng chứng (Ảnh, Biên bản...)" className="!py-1 text-[12px]" />
        <Input name="suggestedModule" placeholder="Module gợi ý (Hồ sơ, Rủi ro...)" className="!py-1 text-[12px]" />
      </div>
      <Input name="riskIfMissing" placeholder="Rủi ro nếu thiếu mục này..." className="!py-1 text-[12px]" />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" className="!py-1">Thêm</Button>
        <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted">Hủy</button>
      </div>
    </form>
  );
}

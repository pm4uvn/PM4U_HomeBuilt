"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createTemplate, deleteTemplate, addTemplateItem, deleteTemplateItem, seedDefaultTemplates } from "./actions";

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

export function TemplateItemRow({ item }: { item: { id: string; label: string } }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2 text-[13px] py-1 group">
      <span className="text-ink-2 flex-1">{item.label}</span>
      <button
        type="button"
        onClick={async () => {
          await deleteTemplateItem(item.id);
          router.refresh();
        }}
        className="text-critical text-xs opacity-0 group-hover:opacity-100"
      >
        Xóa
      </button>
    </div>
  );
}

export function AddTemplateItemForm({ templateId }: { templateId: string }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
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
        setLabel("");
        setAdding(false);
      }}
      className="flex items-center gap-2 mt-1"
    >
      <Input
        name="label"
        required
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Mục kiểm tra..."
        className="!py-1 text-[13px]"
      />
      <Button type="submit" variant="primary" className="!py-1">Thêm</Button>
      <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted">Hủy</button>
    </form>
  );
}

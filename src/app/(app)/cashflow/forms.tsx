"use client";

import { useState } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { fmtVND } from "@/lib/format";
import { OWNER_SUPPLY_CATEGORY, PURCHASE_STATUS } from "@/lib/labels";
import { createPurchase, updatePurchase } from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export function CreatePurchaseForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Hạng mục CĐT mua" title="Thêm hạng mục CĐT tự cung cấp">
      {(close) => (
        <form action={async (fd) => { await createPurchase(projectId, fd); close(); }} className="space-y-3">
          <Field label="Danh mục *"><Select name="category" required>{opts(OWNER_SUPPLY_CATEGORY)}</Select></Field>
          <Field label="Tên hạng mục *"><Input name="name" required placeholder="Gạch 60x60 Đồng Tâm — 120m²" /></Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Chi phí dự kiến (VND) *"><Input name="plannedCost" required inputMode="numeric" /></Field>
            <Field label="Cần có tại công trình trước ngày"><Input name="neededByDate" type="date" /></Field>
          </div>
          <Field label="Nhà cung cấp"><Input name="supplierName" /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

type ForecastLineItem = { label: string; amount: number; isEstimated: boolean; type: string; category?: string };

const FORECAST_TYPE_LABEL: Record<string, string> = {
  contractor: "🏗️ Hợp đồng nhà thầu",
  owner: "🛒 CĐT tự mua",
  materials: "🧱 Vật tư hoàn thiện",
};
const FORECAST_TYPE_ORDER = ["contractor", "owner", "materials"];

function ForecastItemLine({ it }: { it: ForecastLineItem }) {
  return (
    <span className="pl-2">
      {it.label}: <span className="money font-semibold">{fmtVND(it.amount)}</span>
      {it.isEstimated && <span className="text-muted italic"> (dự kiến)</span>}
    </span>
  );
}

/** Vật tư gộp thêm 1 lớp theo danh mục (nhóm vật tư) vì số lượng thường nhiều, dễ rối nếu để phẳng */
function ForecastMaterialsByCategory({ items }: { items: ForecastLineItem[] }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const categories = [...new Set(items.map((i) => i.category ?? "Khác"))];

  return (
    <div className="flex flex-col gap-1">
      {categories.map((c) => {
        const group = items.filter((i) => (i.category ?? "Khác") === c);
        const subtotal = group.reduce((s, i) => s + i.amount, 0);
        const open = openCategory === c;
        return (
          <div key={c}>
            <button
              type="button"
              onClick={() => setOpenCategory(open ? null : c)}
              className="text-xs font-medium text-ink-2 flex items-center gap-1.5 hover:text-ink"
            >
              <span>{c}</span>
              <span className="money font-semibold">{fmtVND(subtotal)}</span>
              <span className="text-muted">({group.length})</span>
              <span className="text-muted">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div className="mt-1 mb-1 pl-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2 border-l-2 border-grid">
                {group.map((it, i) => (
                  <ForecastItemLine key={i} it={it} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Nhóm các khoản chi trong 1 tháng theo loại (hợp đồng/CĐT mua/vật tư) — mỗi nhóm gập lại mặc định, bấm để xem chi tiết */
export function ForecastMonthGroups({ items }: { items: ForecastLineItem[] }) {
  const [openType, setOpenType] = useState<string | null>(null);
  const types = FORECAST_TYPE_ORDER.filter((t) => items.some((i) => i.type === t));

  return (
    <div className="ml-[76px] flex flex-col gap-1">
      {types.map((t) => {
        const group = items.filter((i) => i.type === t);
        const subtotal = group.reduce((s, i) => s + i.amount, 0);
        const open = openType === t;
        return (
          <div key={t}>
            <button
              type="button"
              onClick={() => setOpenType(open ? null : t)}
              className="text-xs font-medium text-ink-2 flex items-center gap-1.5 hover:text-ink"
            >
              <span>{FORECAST_TYPE_LABEL[t]}</span>
              <span className="money font-semibold">{fmtVND(subtotal)}</span>
              <span className="text-muted">({group.length})</span>
              <span className="text-muted">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div className="mt-1 mb-1 pl-4 border-l-2 border-grid">
                {t === "materials" ? (
                  <ForecastMaterialsByCategory items={group} />
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
                    {group.map((it, i) => (
                      <ForecastItemLine key={i} it={it} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function UpdatePurchaseForm({
  itemId,
  currentStatus,
  plannedCost,
}: {
  itemId: string;
  currentStatus: string;
  plannedCost: number;
}) {
  return (
    <ModalButton label="Cập nhật" title="Cập nhật hạng mục" variant="default">
      {(close) => (
        <form action={async (fd) => { await updatePurchase(itemId, fd); close(); }} className="space-y-3">
          <Field label="Trạng thái">
            <Select name="status" defaultValue={currentStatus}>{opts(PURCHASE_STATUS)}</Select>
          </Field>
          <Field label="Chi phí thực tế (VND)">
            <Input name="actualCost" inputMode="numeric" defaultValue={String(plannedCost)} />
          </Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

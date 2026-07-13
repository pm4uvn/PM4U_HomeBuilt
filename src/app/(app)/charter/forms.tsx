"use client";

import { useState } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { fmtVND } from "@/lib/format";
import { STAKEHOLDER_LEVEL } from "@/lib/labels";
import {
  upsertCharter, createStakeholder, updateStakeholder, deleteStakeholder, importVendorsAsStakeholders,
  toggleEmailNotifications,
} from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export type CharterData = {
  objective: string;
  scopeIncluded: string | null;
  scopeExcluded: string | null;
  successCriteria: string | null;
  assumptions: string | null;
  constraints: string | null;
  sponsorName: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  approvedAt: string | null;
  floorsAboveGround: number | null;
  hasBasement: boolean;
  hasTum: boolean;
  finishingStandard: string | null;
  floorPlans: {
    floorName: string;
    areaSqm: number | null;
    soPhongKhach: number;
    soPhongNgu: number;
    soWc: number;
    soBep: number;
    soPhongTho: number;
    soBanCong: number;
    ghiChuKhac: string | null;
  }[];
  budgetPhases: { name: string; plannedPercent: number }[];
} | null;

type FloorPlanRow = {
  floorName: string;
  areaSqm: string;
  soPhongKhach: string;
  soPhongNgu: string;
  soWc: string;
  soBep: string;
  soPhongTho: string;
  soBanCong: string;
  ghiChuKhac: string;
};
type BudgetPhaseRow = { name: string; percent: string };

const EMPTY_FLOOR_ROW: FloorPlanRow = {
  floorName: "", areaSqm: "", soPhongKhach: "", soPhongNgu: "", soWc: "", soBep: "", soPhongTho: "", soBanCong: "", ghiChuKhac: "",
};

const ROOM_COUNT_FIELDS: { key: keyof FloorPlanRow; label: string }[] = [
  { key: "soPhongKhach", label: "P. khách" },
  { key: "soPhongNgu", label: "P. ngủ" },
  { key: "soWc", label: "WC" },
  { key: "soBep", label: "Bếp" },
  { key: "soPhongTho", label: "P. thờ" },
  { key: "soBanCong", label: "Ban công" },
];

/** Danh sách tên tầng chuẩn — dùng thống nhất "Tầng", không lẫn "Lầu", và tách rõ Tầng trệt vs Tầng 1 để khỏi nhầm */
const STANDARD_FLOOR_NAMES = [
  "Tầng hầm", "Tầng trệt", "Tầng lửng",
  "Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4", "Tầng 5", "Tầng 6", "Tầng 7", "Tầng 8",
  "Tầng tum", "Sân thượng", "Tầng mái",
];

/** Gợi ý phòng khác thường gặp — vẫn gõ tay tự do được, đây chỉ là autocomplete */
const SUGGESTED_OTHER_ROOMS = [
  "Phòng giải trí", "Phòng làm việc", "Phòng gym", "Phòng đọc sách",
  "Kho", "Gara để xe", "Phòng thay đồ", "Phòng kỹ thuật", "Sân phơi",
];

/** 9 giai đoạn chuẩn (trùng khung tiến độ ở module Tiến độ) — dùng làm mẫu điền nhanh, không bắt buộc theo */
const STANDARD_BUDGET_PHASES: BudgetPhaseRow[] = [
  { name: "Tìm thầu", percent: "3" },
  { name: "Thiết kế", percent: "12" },
  { name: "Xin phép XD", percent: "5" },
  { name: "Ép cọc", percent: "10" },
  { name: "Thi công thô", percent: "35" },
  { name: "Hoàn thiện", percent: "25" },
  { name: "Lắp đặt nội thất", percent: "7" },
  { name: "Hoàn công", percent: "3" },
];

/** Nhập số lượng phòng rõ ràng từng loại (không phải mô tả tự do) — dữ liệu này sau dùng để
 * ước tính vật tư (vd tổng số WC toàn nhà -> gợi ý số bồn cầu/lavabo cần mua). */
function FloorPlanEditor({ rows, setRows }: { rows: FloorPlanRow[]; setRows: (r: FloorPlanRow[]) => void }) {
  function update(i: number, patch: Partial<FloorPlanRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  const total = (key: keyof FloorPlanRow) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="border border-line rounded-lg p-2.5 space-y-2">
          <div className="grid grid-cols-[130px_90px_1fr_28px] gap-2 items-start">
            <Select
              name="floorName[]"
              value={r.floorName}
              onChange={(e) => update(i, { floorName: e.target.value })}
            >
              <option value="">— Chọn tầng —</option>
              {STANDARD_FLOOR_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <Input
              name="areaSqm[]"
              inputMode="decimal"
              placeholder="Diện tích m²"
              value={r.areaSqm}
              onChange={(e) => update(i, { areaSqm: e.target.value })}
            />
            <Input
              name="ghiChuKhac[]"
              list="suggested-other-rooms"
              placeholder="Phòng khác (chọn hoặc gõ tay)"
              value={r.ghiChuKhac}
              onChange={(e) => update(i, { ghiChuKhac: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
              className="text-critical text-xs font-semibold h-full"
            >
              Xóa
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2 max-sm:grid-cols-3">
            {ROOM_COUNT_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-[11px] text-muted mb-0.5">{f.label}</span>
                <Input
                  name={`${f.key}[]`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={r[f.key]}
                  onChange={(e) => update(i, { [f.key]: e.target.value } as Partial<FloorPlanRow>)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, { ...EMPTY_FLOOR_ROW }])}
        className="text-brand text-xs font-semibold"
      >
        + Thêm tầng
      </button>
      {rows.length > 1 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted pt-1 border-t border-grid">
          <span className="font-semibold text-ink-2">Tổng toàn nhà:</span>
          {ROOM_COUNT_FIELDS.map((f) => (
            <span key={f.key}>{f.label}: <span className="font-semibold text-ink">{total(f.key)}</span></span>
          ))}
        </div>
      )}
      <datalist id="suggested-other-rooms">
        {SUGGESTED_OTHER_ROOMS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}

function BudgetPhaseEditor({
  rows,
  setRows,
  projectBudget,
}: {
  rows: BudgetPhaseRow[];
  setRows: (r: BudgetPhaseRow[]) => void;
  projectBudget: number;
}) {
  function update(i: number, patch: Partial<BudgetPhaseRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  const totalPercent = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_140px_28px] gap-2 items-center">
          <Input
            name="phaseName[]"
            placeholder="Móng, Thô, Hoàn thiện..."
            value={r.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <Input
            name="phasePercent[]"
            inputMode="decimal"
            placeholder="%"
            value={r.percent}
            onChange={(e) => update(i, { percent: e.target.value })}
          />
          <span className="text-xs text-muted money">
            {projectBudget > 0 && r.percent ? fmtVND((Number(r.percent) / 100) * projectBudget) : "—"}
          </span>
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            className="text-critical text-xs font-semibold"
          >
            Xóa
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRows([...rows, { name: "", percent: "" }])}
          className="text-brand text-xs font-semibold"
        >
          + Thêm giai đoạn
        </button>
        <button
          type="button"
          onClick={() => setRows(STANDARD_BUDGET_PHASES)}
          className="text-brand text-xs font-semibold"
        >
          Dùng mẫu 8 giai đoạn chuẩn
        </button>
        {rows.length > 0 && (
          <span className={`text-xs ml-auto ${Math.round(totalPercent) !== 100 ? "text-critical font-semibold" : "text-muted"}`}>
            Tổng: {totalPercent.toFixed(1)}% {Math.round(totalPercent) !== 100 && "(nên = 100%)"}
          </span>
        )}
      </div>
    </div>
  );
}

/** Tạo mới hoặc sửa điều lệ dự án */
export function EditCharterForm({
  projectId,
  charter,
  landArea,
  grossFloorArea,
  projectBudget,
}: {
  projectId: string;
  charter: CharterData;
  landArea: number | null;
  grossFloorArea: number | null;
  projectBudget: number;
}) {
  const [floorRows, setFloorRows] = useState<FloorPlanRow[]>(
    charter?.floorPlans.length
      ? charter.floorPlans.map((f) => ({
          floorName: f.floorName,
          areaSqm: f.areaSqm != null ? String(f.areaSqm) : "",
          soPhongKhach: String(f.soPhongKhach),
          soPhongNgu: String(f.soPhongNgu),
          soWc: String(f.soWc),
          soBep: String(f.soBep),
          soPhongTho: String(f.soPhongTho),
          soBanCong: String(f.soBanCong),
          ghiChuKhac: f.ghiChuKhac ?? "",
        }))
      : [{ ...EMPTY_FLOOR_ROW }],
  );
  const [budgetRows, setBudgetRows] = useState<BudgetPhaseRow[]>(
    charter?.budgetPhases.length
      ? charter.budgetPhases.map((p) => ({ name: p.name, percent: String(p.plannedPercent) }))
      : [],
  );

  return (
    <ModalButton label={charter ? "Sửa điều lệ" : "+ Tạo điều lệ dự án"} title="Điều lệ dự án (Project Charter)">
      {(close) => (
        <form
          action={async (fd) => {
            await upsertCharter(projectId, fd);
            close();
          }}
          className="space-y-3"
        >
          <Field label="Mục tiêu dự án *">
            <Textarea name="objective" required rows={2} defaultValue={charter?.objective ?? ""} placeholder="Xây nhà ở riêng lẻ 1 trệt 2 lầu + tum cho gia đình, hoàn thành trong ngân sách và thời hạn đã định" />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Phạm vi bao gồm">
              <Textarea name="scopeIncluded" rows={2} defaultValue={charter?.scopeIncluded ?? ""} placeholder="Thi công thô, hoàn thiện, nội thất gắn liền..." />
            </Field>
            <Field label="Phạm vi KHÔNG bao gồm">
              <Textarea name="scopeExcluded" rows={2} defaultValue={charter?.scopeExcluded ?? ""} placeholder="Nội thất rời, sân vườn, hàng rào..." />
            </Field>
          </div>
          <Field label="Tiêu chí thành công">
            <Textarea name="successCriteria" rows={2} defaultValue={charter?.successCriteria ?? ""} placeholder="Hoàn thành trước 31/12/2027, không vượt quá 10% ngân sách, đạt nghiệm thu 100% hạng mục" />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Giả định">
              <Textarea name="assumptions" rows={2} defaultValue={charter?.assumptions ?? ""} placeholder="Giá vật tư không biến động quá 10%, thời tiết thuận lợi..." />
            </Field>
            <Field label="Ràng buộc">
              <Textarea name="constraints" rows={2} defaultValue={charter?.constraints ?? ""} placeholder="Ngân sách trần 3.5 tỷ, chiều cao tối đa theo quy hoạch..." />
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Tổng ngân sách dự kiến (VND)">
              <Input name="budgetPlanned" inputMode="numeric" defaultValue={projectBudget || ""} placeholder="3500000000" />
            </Field>
            <Field label="Người phê duyệt / bảo trợ">
              <Input name="sponsorName" defaultValue={charter?.sponsorName ?? ""} placeholder="Chủ đầu tư" />
            </Field>
            <Field label="Ngày dự kiến bắt đầu">
              <Input name="plannedStartDate" type="date" defaultValue={charter?.plannedStartDate?.slice(0, 10) ?? ""} />
            </Field>
            <Field label="Ngày dự kiến hoàn thành">
              <Input name="plannedEndDate" type="date" defaultValue={charter?.plannedEndDate?.slice(0, 10) ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="approved" defaultChecked={charter?.approvedAt != null} />
            Đã phê duyệt — dự án chính thức khởi động
          </label>

          <div className="border-t border-grid pt-3 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Quy mô công trình</p>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Diện tích đất (m²)">
                <Input name="landArea" inputMode="decimal" defaultValue={landArea ?? ""} />
              </Field>
              <Field label="Diện tích sàn XD (m²)">
                <Input name="grossFloorArea" inputMode="decimal" defaultValue={grossFloorArea ?? ""} />
              </Field>
              <Field label="Số tầng trên mặt đất">
                <Input name="floorsAboveGround" inputMode="numeric" defaultValue={charter?.floorsAboveGround ?? ""} placeholder="Trệt + lầu, không gồm tum" />
              </Field>
              <div className="flex flex-col gap-1.5 justify-end pb-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="hasBasement" defaultChecked={charter?.hasBasement ?? false} /> Có tầng hầm
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="hasTum" defaultChecked={charter?.hasTum ?? false} /> Có tầng tum
                </label>
              </div>
            </div>
            <Field label="Tiêu chuẩn vật liệu hoàn thiện (tổng quan)">
              <Textarea
                name="finishingStandard"
                rows={2}
                defaultValue={charter?.finishingStandard ?? ""}
                placeholder="Gạch Đồng Tâm, sơn Dulux, thiết bị vệ sinh TOTO, cửa nhôm Xingfa, gói tiêu chuẩn 2950..."
              />
            </Field>
          </div>

          <div className="border-t border-grid pt-3 space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Bố trí phòng theo từng tầng</p>
            <FloorPlanEditor rows={floorRows} setRows={setFloorRows} />
          </div>

          <div className="border-t border-grid pt-3 space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Phân bổ ngân sách theo giai đoạn chính</p>
            <BudgetPhaseEditor rows={budgetRows} setRows={setBudgetRows} projectBudget={projectBudget} />
          </div>

          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu điều lệ</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export type StakeholderRow = {
  id: string;
  name: string;
  role: string;
  organization: string | null;
  phone: string | null;
  email: string | null;
  influence: string;
  interest: string;
  communicationNeed: string | null;
  notes: string | null;
};

function StakeholderFields({ s }: { s?: StakeholderRow }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Tên *"><Input name="name" required defaultValue={s?.name ?? ""} /></Field>
        <Field label="Vai trò *"><Input name="role" required defaultValue={s?.role ?? ""} placeholder="Chủ đầu tư, Giám sát, Hàng xóm..." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Tổ chức / đơn vị"><Input name="organization" defaultValue={s?.organization ?? ""} /></Field>
        <Field label="Điện thoại"><Input name="phone" defaultValue={s?.phone ?? ""} /></Field>
      </div>
      <Field label="Email"><Input name="email" type="email" defaultValue={s?.email ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Mức độ ảnh hưởng">
          <Select name="influence" defaultValue={s?.influence ?? "MEDIUM"}>{opts(STAKEHOLDER_LEVEL)}</Select>
        </Field>
        <Field label="Mức độ quan tâm">
          <Select name="interest" defaultValue={s?.interest ?? "MEDIUM"}>{opts(STAKEHOLDER_LEVEL)}</Select>
        </Field>
      </div>
      <Field label="Nhu cầu giao tiếp">
        <Input name="communicationNeed" defaultValue={s?.communicationNeed ?? ""} placeholder="Báo cáo tiến độ tuần qua Zalo" />
      </Field>
      <Field label="Ghi chú"><Textarea name="notes" rows={2} defaultValue={s?.notes ?? ""} /></Field>
    </>
  );
}

/** Nạp nhanh nhà thầu/NCC đã khai báo ở module Hợp đồng vào sổ bên liên quan, khỏi gõ tay lại */
export function ImportVendorsButton({ projectId }: { projectId: string }) {
  return (
    <Button
      variant="default"
      type="button"
      onClick={async () => {
        const count = await importVendorsAsStakeholders(projectId);
        alert(count > 0 ? `Đã nạp ${count} nhà thầu mới vào sổ bên liên quan.` : "Không có nhà thầu mới nào để nạp — tất cả đã có trong sổ.");
      }}
    >
      Nạp từ danh sách nhà thầu
    </Button>
  );
}

export function AddStakeholderForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Thêm bên liên quan" title="Thêm bên liên quan">
      {(close) => (
        <form action={async (fd) => { await createStakeholder(projectId, fd); close(); }} className="space-y-3">
          <StakeholderFields />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function EditStakeholderForm({ s }: { s: StakeholderRow }) {
  return (
    <ModalButton label="Sửa" variant="default" title={s.name}>
      {(close) => (
        <form action={async (fd) => { await updateStakeholder(s.id, fd); close(); }} className="space-y-3">
          <StakeholderFields s={s} />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function DeleteStakeholderButton({ id, name }: { id: string; name: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(`Xóa "${name}" khỏi sổ bên liên quan?`)) deleteStakeholder(id);
      }}
      className="text-critical text-xs font-semibold"
    >
      Xóa
    </button>
  );
}

/** Bật/tắt email nhắc cảnh báo — gửi qua cron /api/cron/notify mỗi 6h nếu bật */
export function NotificationToggle({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <button
      type="button"
      onClick={() => {
        setOn(!on);
        toggleEmailNotifications(projectId, !on);
      }}
      className="flex items-center gap-2.5"
    >
      <span
        className="relative inline-block w-10 h-5.5 rounded-full transition-colors shrink-0"
        style={{ background: on ? "var(--series-1)" : "var(--grid)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform"
          style={{ transform: on ? "translateX(18px)" : "translateX(0)" }}
        />
      </span>
      <span className="text-[13.5px] font-semibold">{on ? "Đã bật" : "Đã tắt"}</span>
    </button>
  );
}

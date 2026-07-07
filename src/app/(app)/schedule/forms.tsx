"use client";

import { useActionState, useRef, useState } from "react";
import { ModalButton } from "@/components/Modal";
import { PreviewButton } from "@/components/FilePreview";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PHASE_TYPE, INSPECTION_METHOD, WEATHER } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { STANDARD_MILESTONES } from "@/lib/standard-milestones";
import { SUGGESTED_CHECKLIST_CATEGORIES, getRelevantCategoryNames } from "@/lib/milestone-checklists";
import { useRouter } from "next/navigation";
import {
  createPhase, updatePhase, createMilestone, updateMilestone, deleteMilestone,
  createStandardMilestones, createFullSchedule,
  resetSchedule, requestInspectionAction, recordInspectionAction, createDailyLog,
  updateDailyLog, deleteDailyLog, toggleDailyLogItem,
  uploadDailyLogPhotos, deleteDailyLogPhoto, type UploadPhotosState,
  toggleChecklistItem, addChecklistItem, deleteChecklistItem,
} from "./actions";
import type { PhaseType } from "@prisma/client";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

/**
 * Dựng toàn bộ khung tiến độ chuẩn (9 giai đoạn + milestone nghiệm thu) trong 1 lần bấm.
 * Chỉ dùng được khi dự án chưa có giai đoạn nào (tránh tạo trùng).
 */
export function CreateFullScheduleButton({ projectId }: { projectId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ModalButton label="🏗️ Tạo đầy đủ tiến độ chuẩn" title="Dựng toàn bộ tiến độ chuẩn">
      {(close) => (
        <form
          action={async (fd) => {
            try {
              await createFullSchedule(projectId, fd);
              close();
            } catch (e) {
              alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
            }
          }}
          className="space-y-3"
        >
          <p className="text-xs text-muted">
            Tạo sẵn cả 9 giai đoạn (Tìm thầu → Thiết kế → Xin phép → Ép cọc → Thô → Hoàn thiện →
            Nội thất → Hoàn công) kèm đầy đủ milestone nghiệm thu chuẩn theo thông lệ thi công nhà ở VN,
            có ngày kế hoạch ước tính sẵn.
          </p>
          <Field label="Ngày khởi công (bắt đầu ép cọc/động thổ) *">
            <Input name="startDate" type="date" defaultValue={today} required />
          </Field>
          <p className="text-xs text-muted -mt-1.5">
            Tìm thầu, Thiết kế, Xin phép XD sẽ được tính lùi về TRƯỚC ngày này (phải xong trước khi khởi công);
            Ép cọc → Thô → Hoàn thiện → Nội thất → Hoàn công tính tiếp SAU ngày này.
          </p>
          <Field label="Số tầng phía trên tầng trệt (VD nhà 1 trệt 3 lầu thì nhập 3)">
            <Input name="floors" type="number" min="0" defaultValue="0" required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasTum" />
            Có tầng tum (phòng nhỏ trên sân thượng: cầu thang, bồn nước, kho...)
          </label>
          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full">Tạo toàn bộ tiến độ</Button>
          </div>
        </form>
      )}
    </ModalButton>
  );
}

/** Xóa hết giai đoạn + milestone để làm lại từ đầu (giữ nguyên hợp đồng, đợt thanh toán, nhật ký) */
export function ResetScheduleButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      onClick={async () => {
        if (
          !confirm(
            "Xóa TOÀN BỘ giai đoạn, milestone và biên bản nghiệm thu để làm lại từ đầu?\n\n" +
              "Giữ nguyên: hợp đồng, đợt thanh toán (mất điều kiện milestone, chuyển về 'Chưa tới'), nhật ký công trình.\n\n" +
              "Hành động này không thể hoàn tác.",
          )
        )
          return;
        await resetSchedule(projectId);
        router.refresh();
      }}
    >
      🗑️ Reset tiến độ
    </Button>
  );
}

export function CreatePhaseForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Giai đoạn" title="Thêm giai đoạn">
      {(close) => (
        <form action={async (fd) => { await createPhase(projectId, fd); close(); }} className="space-y-3">
          <Field label="Loại giai đoạn *"><Select name="type" required>{opts(PHASE_TYPE)}</Select></Field>
          <Field label="Tên hiển thị *"><Input name="name" required placeholder="Thi công thô" /></Field>
          <Field label="Tỷ trọng tiến độ (%) — tổng các giai đoạn nên = 100">
            <Input name="weight" inputMode="decimal" defaultValue="10" />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Bắt đầu (kế hoạch)"><Input name="plannedStart" type="date" /></Field>
            <Field label="Kết thúc (kế hoạch)"><Input name="plannedEnd" type="date" /></Field>
          </div>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function UpdatePhaseForm({
  phase,
}: {
  phase: { id: string; name: string; progressPct: number; plannedStart: string | null; plannedEnd: string | null };
}) {
  const d = (s: string | null) => (s ? s.slice(0, 10) : "");
  return (
    <ModalButton label="Cập nhật" title={`Cập nhật: ${phase.name}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updatePhase(phase.id, fd); close(); }} className="space-y-3">
          <Field label="Tiến độ hoàn thành (%)">
            <Input name="progressPct" type="number" min="0" max="100" defaultValue={String(phase.progressPct)} />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Bắt đầu (kế hoạch)"><Input name="plannedStart" type="date" defaultValue={d(phase.plannedStart)} /></Field>
            <Field label="Kết thúc (kế hoạch)"><Input name="plannedEnd" type="date" defaultValue={d(phase.plannedEnd)} /></Field>
          </div>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function CreateMilestoneForm({
  phaseId,
  phaseName,
  defaultDate,
  templates = [],
}: {
  phaseId: string;
  phaseName: string;
  defaultDate?: string | null;
  templates?: { category: string; items: string[] }[];
}) {
  const [checklist, setChecklist] = useState("");
  return (
    <ModalButton label="+ Milestone" title={`Thêm milestone — ${phaseName}`} variant="default">
      {(close) => (
        <form
          action={async (fd) => {
            fd.set("checklist", checklist);
            await createMilestone(phaseId, fd);
            close();
            setChecklist("");
          }}
          className="space-y-3"
        >
          <Field label="Tên milestone *"><Input name="name" required placeholder="Nghiệm thu cốt thép móng" /></Field>
          <Field label="Ngày dự kiến nghiệm thu *">
            <Input name="plannedDate" type="date" required defaultValue={defaultDate?.slice(0, 10) ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isHoldPoint" defaultChecked />
            Là Điểm dừng nghiệm thu (Hold Point) — phải nghiệm thu xong mới thi công tiếp
          </label>
          <Field label="Hạn CĐT xác nhận (giờ) — quá hạn tự động thông qua">
            <Input name="confirmDeadlineHrs" type="number" defaultValue="48" />
          </Field>
          {templates.length > 0 && (
            <Field label="Áp dụng mẫu checklist có sẵn (tùy chọn)">
              <Select
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find((x) => x.category === e.target.value);
                  if (t) setChecklist(t.items.join("\n"));
                }}
              >
                <option value="">— Không áp dụng mẫu —</option>
                {templates.map((t) => (
                  <option key={t.category} value={t.category}>{t.category} ({t.items.length} mục)</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Checklist công việc cần kiểm tra (mỗi dòng 1 mục, để trống nếu tên khớp mốc chuẩn sẽ tự điền)">
            <Textarea
              rows={5}
              value={checklist}
              onChange={(e) => setChecklist(e.target.value)}
              placeholder={"Đúng số lượng, đường kính thép theo bản vẽ\nKhoảng cách thép đúng thiết kế\n..."}
            />
          </Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

/** Sửa mốc đã có: tên, ngày dự kiến, cờ Hold Point, hạn xác nhận; kèm xóa */
export function EditMilestoneForm({
  milestone,
}: {
  milestone: {
    id: string; name: string; plannedDate: string | null; isHoldPoint: boolean; confirmDeadlineHrs: number;
  };
}) {
  const router = useRouter();
  return (
    <ModalButton label="Sửa" title={`Sửa mốc — ${milestone.name}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateMilestone(milestone.id, fd); close(); }} className="space-y-3">
          <Field label="Tên milestone *"><Input name="name" required defaultValue={milestone.name} /></Field>
          <Field label="Ngày dự kiến nghiệm thu *">
            <Input name="plannedDate" type="date" required defaultValue={milestone.plannedDate?.slice(0, 10) ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isHoldPoint" defaultChecked={milestone.isHoldPoint} />
            Là Điểm dừng nghiệm thu (Hold Point) — phải nghiệm thu xong mới thi công tiếp
          </label>
          <Field label="Hạn CĐT xác nhận (giờ) — quá hạn tự động thông qua">
            <Input name="confirmDeadlineHrs" type="number" defaultValue={milestone.confirmDeadlineHrs} />
          </Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Xóa mốc "${milestone.name}"?`)) return;
              await deleteMilestone(milestone.id);
              close();
              router.refresh();
            }}
            className="w-full text-critical text-[13px] font-semibold py-1.5 hover:underline"
          >
            Xóa mốc
          </button>
        </form>
      )}
    </ModalButton>
  );
}

/**
 * Tạo hàng loạt mốc nghiệm thu chuẩn cho 1 giai đoạn theo thông lệ thi công nhà ở VN.
 * Riêng "Thi công thô" hỏi số tầng để sinh đủ mốc đổ sàn từng tầng.
 */
export function CreateStandardMilestonesButton({
  phaseId,
  phaseType,
}: {
  phaseId: string;
  phaseType: PhaseType;
}) {
  const [pending, setPending] = useState(false);
  const hasTemplate = phaseType === "STRUCTURE" || (STANDARD_MILESTONES[phaseType]?.length ?? 0) > 0;
  if (!hasTemplate) return null;

  async function run(floors?: number, hasTum?: boolean) {
    setPending(true);
    try {
      const count = await createStandardMilestones(phaseId, phaseType, floors, hasTum);
      if (count === 0) alert("Các mốc chuẩn đã có sẵn — không có mốc mới nào được thêm.");
    } finally {
      setPending(false);
    }
  }

  if (phaseType === "STRUCTURE") {
    return (
      <ModalButton label="🏗️ Tạo mốc chuẩn" title="Tạo mốc nghiệm thu chuẩn — Thi công thô" variant="default">
        {(close) => (
          <form
            action={async (fd) => {
              const floors = Number(String(fd.get("floors") ?? "0"));
              const hasTum = fd.get("hasTum") === "on";
              await run(floors, hasTum);
              close();
            }}
            className="space-y-3"
          >
            <Field label="Số tầng phía trên tầng trệt (VD nhà 1 trệt 3 lầu thì nhập 3)">
              <Input name="floors" type="number" min="0" defaultValue="0" required />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="hasTum" />
              Có tầng tum (phòng nhỏ trên sân thượng: cầu thang, bồn nước, kho...)
            </label>
            <p className="text-xs text-muted">
              Sẽ tạo: định vị tim trục, đào hố móng, cốt thép + đổ bê tông móng và giằng, cốt thép + đổ bê tông
              cột/sàn từng tầng (tầng trệt → các tầng trên → sân thượng → tum nếu chọn → mái), điện nước
              âm tường, xây tô, chống thấm. Mốc trùng tên đã có sẽ được bỏ qua.
            </p>
            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full" disabled={pending}>
                {pending ? "Đang tạo…" : "Tạo mốc chuẩn"}
              </Button>
            </div>
          </form>
        )}
      </ModalButton>
    );
  }

  return (
    <Button variant="default" disabled={pending} onClick={() => run()}>
      🏗️ Tạo mốc chuẩn
    </Button>
  );
}

export function RequestInspectionButton({ milestoneId }: { milestoneId: string }) {
  return (
    <Button variant="default" onClick={() => requestInspectionAction(milestoneId)}>
      Yêu cầu nghiệm thu
    </Button>
  );
}

export function RecordInspectionForm({
  milestoneId,
  milestoneName,
  checklistItems = [],
}: {
  milestoneId: string;
  milestoneName: string;
  checklistItems?: { label: string; isChecked: boolean }[];
}) {
  const uncheckedItems = checklistItems.filter((i) => !i.isChecked);
  return (
    <ModalButton label="Nghiệm thu ngay" title={`Nghiệm thu: ${milestoneName}`}>
      {(close) => (
        <form action={async (fd) => { await recordInspectionAction(milestoneId, fd); close(); }} className="space-y-3">
          {checklistItems.length > 0 && uncheckedItems.length > 0 && (
            <div className="text-[13px] rounded-lg p-3 border" style={{ borderColor: "var(--warning)", background: "rgba(250,178,25,0.08)" }}>
              <p className="font-semibold mb-1">
                ⚠️ Còn {uncheckedItems.length}/{checklistItems.length} mục checklist chưa tick:
              </p>
              <ul className="list-disc list-inside text-ink-2">
                {uncheckedItems.map((i, idx) => <li key={idx}>{i.label}</li>)}
              </ul>
            </div>
          )}
          <Field label="Hình thức xác nhận">
            <Select name="method">{opts(INSPECTION_METHOD)}</Select>
          </Field>
          <Field label="Kết quả">
            <Select name="result">
              <option value="PASS">✅ Đạt — cho phép thi công tiếp & kích hoạt đợt thanh toán</option>
              <option value="PASS_WITH_NOTES">☑️ Đạt nhưng có ghi chú</option>
              <option value="FAIL">❌ Không đạt — thầu phải khắc phục</option>
            </Select>
          </Field>
          <Field label="Ghi chú / tồn đọng"><Textarea name="notes" rows={3} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Xác nhận nghiệm thu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

type DailyLogPhase = { name: string; milestones: { id: string; name: string }[] };
type DailyLogItemInput = { label: string; checked: boolean };

/** Danh sách việc trong ngày, mỗi dòng tách riêng và tick được — thay cho 1 đoạn văn dài gộp chung */
function DailyLogItemsEditor({ items, setItems }: { items: DailyLogItemInput[]; setItems: (v: DailyLogItemInput[]) => void }) {
  function update(i: number, patch: Partial<DailyLogItemInput>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="checkbox" checked={it.checked} onChange={(e) => update(i, { checked: e.target.checked })} />
          <input type="hidden" name="itemChecked[]" value={it.checked ? "true" : "false"} />
          <Input
            name="itemLabel[]"
            className="flex-1"
            placeholder="Lấy giấy phép chính sao y bản chính..."
            value={it.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            className="text-critical text-xs font-semibold shrink-0"
          >
            Xóa
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { label: "", checked: false }])}
        className="text-brand text-xs font-semibold"
      >
        + Thêm việc
      </button>
    </div>
  );
}

/** Các ô nhập chung cho form Thêm/Sửa nhật ký — tách riêng để dùng lại giữa 2 form */
function DailyLogFields({
  logDate,
  phases,
  defaultMilestoneIds,
  defaultItems = [],
  defaults,
}: {
  logDate: string;
  phases: DailyLogPhase[];
  defaultMilestoneIds: string[];
  defaultItems?: DailyLogItemInput[];
  defaults?: {
    weather?: string;
    rainHours?: number | null;
    workerCount?: number;
    isForceMajeure?: boolean;
    workDescription?: string | null;
  };
}) {
  const [items, setItems] = useState<DailyLogItemInput[]>(defaultItems.length > 0 ? defaultItems : [{ label: "", checked: false }]);
  const phasesWithMilestones = phases.filter((p) => p.milestones.length > 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Ngày"><Input name="logDate" type="date" defaultValue={logDate} /></Field>
        <Field label="Thời tiết"><Select name="weather" defaultValue={defaults?.weather}>{opts(WEATHER)}</Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Số giờ mưa">
          <Input name="rainHours" inputMode="decimal" placeholder="0" defaultValue={defaults?.rainHours ?? ""} />
        </Field>
        <Field label="Số nhân công">
          <Input name="workerCount" type="number" placeholder="8" defaultValue={defaults?.workerCount ?? ""} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isForceMajeure" defaultChecked={defaults?.isForceMajeure ?? false} />
        Tính là ngày gia hạn hợp lệ (mưa bão làm ngưng thi công)
      </label>
      <Field label="Công việc trong ngày (mỗi dòng 1 việc, tick khi xong)">
        <DailyLogItemsEditor items={items} setItems={setItems} />
      </Field>
      <Field label="Ghi chú thêm (tuỳ chọn)">
        <Textarea name="workDescription" rows={2} placeholder="Ghi chú chung khác..." defaultValue={defaults?.workDescription ?? ""} />
      </Field>
      {phasesWithMilestones.length > 0 && (
        <Field label="Milestone liên quan trong ngày (tùy chọn)">
          <div className="max-h-40 overflow-y-auto border border-line rounded-lg p-2 space-y-2">
            {phasesWithMilestones.map((p) => (
              <div key={p.name}>
                <p className="text-xs font-semibold text-muted uppercase">{p.name}</p>
                {p.milestones.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-[13px] py-0.5">
                    <input
                      type="checkbox"
                      name="milestoneIds"
                      value={m.id}
                      defaultChecked={defaultMilestoneIds.includes(m.id)}
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Field>
      )}
    </>
  );
}

export function DailyLogForm({
  projectId,
  phases = [],
  defaultMilestoneIds = [],
}: {
  projectId: string;
  phases?: DailyLogPhase[];
  defaultMilestoneIds?: string[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ModalButton label="+ Ghi nhật ký" title="Nhật ký công trình">
      {(close) => (
        <form action={async (fd) => { await createDailyLog(projectId, fd); close(); }} className="space-y-3">
          <DailyLogFields logDate={today} phases={phases} defaultMilestoneIds={defaultMilestoneIds} />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu nhật ký</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export type DailyLogRow = {
  id: string;
  logDate: string;
  weather: string;
  rainHours: number | null;
  workerCount: number;
  isForceMajeure: boolean;
  workDescription: string | null;
  milestoneIds: string[];
  items: { id: string; label: string; isChecked: boolean }[];
};

/** Sửa 1 ngày nhật ký đã ghi — mở đúng dữ liệu ngày đó, sửa xong lưu vào đúng bản ghi (không tạo trùng) */
export function EditDailyLogForm({ log, phases = [] }: { log: DailyLogRow; phases?: DailyLogPhase[] }) {
  return (
    <ModalButton label="Sửa" variant="default" title={`Sửa nhật ký ${fmtDate(log.logDate)}`}>
      {(close) => (
        <form action={async (fd) => { await updateDailyLog(log.id, fd); close(); }} className="space-y-3">
          <DailyLogFields
            logDate={log.logDate.slice(0, 10)}
            phases={phases}
            defaultMilestoneIds={log.milestoneIds}
            defaultItems={log.items.map((it) => ({ label: it.label, checked: it.isChecked }))}
            defaults={{
              weather: log.weather,
              rainHours: log.rainHours,
              workerCount: log.workerCount,
              isForceMajeure: log.isForceMajeure,
              workDescription: log.workDescription,
            }}
          />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

/** Hiện danh sách việc trong ngày ngay trong bảng, tick nhanh không cần mở form Sửa */
export function DailyLogItemsView({ items }: { items: { id: string; label: string; isChecked: boolean }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-0.5 mt-1">
      {items.map((it) => (
        <label key={it.id} className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={it.isChecked}
            onChange={(e) => toggleDailyLogItem(it.id, e.target.checked)}
          />
          <span className={it.isChecked ? "line-through text-muted" : "text-ink-2"}>{it.label}</span>
        </label>
      ))}
    </div>
  );
}

export type DailyLogPhoto = { id: string; url: string; title: string };

/** Ảnh hiện trường gắn vào 1 ngày nhật ký — bằng chứng tiến độ/chất lượng khi tranh chấp sau này */
export function DailyLogPhotos({
  dailyLogId,
  projectId,
  photos,
}: {
  dailyLogId: string;
  projectId: string;
  photos: DailyLogPhoto[];
}) {
  const [state, action, pending] = useActionState<UploadPhotosState, FormData>(
    async (prev, fd) => uploadDailyLogPhotos(dailyLogId, projectId, prev, fd),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1.5">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {photos.map((p) => (
            <div key={p.id} className="relative group shrink-0">
              <PreviewButton url={p.url} mimeType="image/jpeg" title={p.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.title} className="w-14 h-14 object-cover rounded border border-line cursor-pointer" />
              </PreviewButton>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xóa ảnh "${p.title}"?`)) deleteDailyLogPhoto(p.id);
                }}
                className="absolute -top-1.5 -right-1.5 bg-critical text-white rounded-full w-4 h-4 text-[10px] leading-4 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Bấm "+ Ảnh" mở thẳng hộp chọn ảnh; chọn xong tự nộp form ngay, khỏi cần bấm nút submit riêng */}
      <form ref={formRef} action={action}>
        <input
          ref={inputRef}
          type="file"
          name="files"
          accept="image/*"
          multiple
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
        <Button
          type="button"
          variant="default"
          className="!py-1 !px-2 text-xs"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Đang tải..." : "+ Ảnh"}
        </Button>
      </form>
      {state.error && <p className="text-critical text-xs mt-1">{state.error}</p>}
    </div>
  );
}

export function DeleteDailyLogButton({ id, logDate }: { id: string; logDate: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(`Xóa nhật ký ngày ${fmtDate(logDate)}?`)) deleteDailyLog(id);
      }}
      className="text-critical text-xs font-semibold"
    >
      Xóa
    </button>
  );
}

/**
 * Checklist công việc cần kiểm tra trước khi nghiệm thu 1 milestone —
 * tick từng mục, thêm/xóa mục tùy chỉnh. Hiện ngay dưới milestone, không cần mở modal.
 */
export function ChecklistPanel({
  milestoneId,
  milestoneName,
  items,
  templates = [],
}: {
  milestoneId: string;
  milestoneName: string;
  items: { id: string; label: string; isChecked: boolean }[];
  /** Mẫu checklist tự quản lý (trang Mẫu Checklist) — ưu tiên hơn kho gợi ý cứng nếu trùng tên hạng mục */
  templates?: { category: string; items: string[] }[];
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const doneCount = items.filter((i) => i.isChecked).length;

  const allCategories =
    templates.length > 0
      ? [...templates, ...SUGGESTED_CHECKLIST_CATEGORIES.filter((c) => !templates.some((t) => t.category === c.category))]
      : SUGGESTED_CHECKLIST_CATEGORIES;
  const relevantNames = getRelevantCategoryNames(milestoneName);
  const visibleCategories =
    showAllCategories || relevantNames.length === 0
      ? allCategories
      : allCategories.filter((c) => relevantNames.includes(c.category));

  return (
    <div className="ml-6 mt-1.5 border-l-2 border-grid pl-3">
      {items.length > 0 && (
        <p className="text-xs text-muted mb-1">
          Checklist: {doneCount}/{items.length} hoàn thành
        </p>
      )}
      <div className="space-y-1">
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 text-[13px] group">
            <input
              type="checkbox"
              checked={it.isChecked}
              onChange={() => toggleChecklistItem(it.id)}
            />
            <span className={it.isChecked ? "line-through text-muted" : "text-ink-2"}>{it.label}</span>
            <button
              type="button"
              onClick={() => deleteChecklistItem(it.id)}
              className="text-critical text-xs opacity-0 group-hover:opacity-100 ml-1"
            >
              Xóa
            </button>
          </label>
        ))}
      </div>
      {adding ? (
        <div className="mt-1.5 space-y-1.5">
          <Select
            className="!py-1 text-[13px]"
            value=""
            onChange={(e) => e.target.value && setNewLabel(e.target.value)}
          >
            <option value="">
              {relevantNames.length === 0 || showAllCategories
                ? "— Chọn nhanh từ kinh nghiệm giám sát công trình —"
                : "— Gợi ý theo đúng chuyên môn mốc này —"}
            </option>
            {visibleCategories.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.items.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          {relevantNames.length > 0 && !showAllCategories && (
            <button
              type="button"
              onClick={() => setShowAllCategories(true)}
              className="text-xs text-brand font-semibold hover:underline"
            >
              Xem tất cả nhóm gợi ý
            </button>
          )}
          <form
            action={async (fd) => {
              await addChecklistItem(milestoneId, fd);
              setNewLabel("");
              setAdding(false);
            }}
            className="flex items-center gap-2"
          >
            <Input
              name="label"
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Hoặc tự gõ đầu việc cần kiểm tra..."
              className="!py-1 text-[13px]"
            />
            <Button type="submit" variant="primary" className="!py-1">Thêm</Button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted">Hủy</button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-brand font-semibold hover:underline mt-1.5"
        >
          + Thêm mục kiểm tra
        </button>
      )}
    </div>
  );
}

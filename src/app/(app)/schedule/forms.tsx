"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ModalButton } from "@/components/Modal";
import { PreviewButton } from "@/components/FilePreview";
import { Button, Field, Input, Select, Textarea, Tag, Card } from "@/components/ui";
import { PHASE_TYPE, INSPECTION_METHOD, WEATHER, MILESTONE_STATUS, INSPECTION_RESULT, DAILY_LOG_WORK_TYPE } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { STANDARD_MILESTONES } from "@/lib/standard-milestones";
import { SUGGESTED_CHECKLIST_CATEGORIES, getRelevantCategoryNames } from "@/lib/milestone-checklists";
import { useRouter } from "next/navigation";
import {
  createPhase, updatePhase, createMilestone, updateMilestone, deleteMilestone,
  createStandardMilestones, createFullSchedule,
  resetSchedule, requestInspectionAction, recordInspectionAction, createDailyLog,
  updateDailyLog, deleteDailyLog, toggleDailyLogItem,
  uploadDailyLogPhotos, deleteDailyLogPhoto, type UploadPhotosState,
  uploadMilestoneTaskPhotos, deleteMilestoneTaskPhoto,
  uploadMilestonePhotos, deleteMilestonePhoto,
  uploadDailyLogItemPhotos, deleteDailyLogItemPhoto,
  uploadDailyLogVoiceNote, uploadMilestoneVoiceNote, uploadMilestoneTaskVoiceNote, uploadDailyLogItemVoiceNote,
  toggleChecklistItem, addChecklistItem, deleteChecklistItem,
  toggleMilestoneTask, addMilestoneTask, deleteMilestoneTask, updateMilestoneTaskFields,
  addTodoComment, deleteTodoComment, toggleTodoReaction,
} from "./actions";
import type { PhaseType, TodoCommentSource } from "@prisma/client";

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
        <form
          action={async (fd) => {
            try {
              await updatePhase(phase.id, fd);
              close();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Có lỗi xảy ra, thử lại.");
            }
          }}
          className="space-y-3"
        >
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
type DailyLogItemInput = {
  id: string; // rỗng = dòng mới thêm trong form; có id = dòng đã tồn tại, giữ nguyên khi lưu (không mất bình luận/ảnh/%)
  label: string; checked: boolean; dueDate: string; milestoneId: string; vatTuDuAnId: string; workType: string;
  documentId: string; contractId: string; pic: string;
};

export type DailyLogDocumentOption = { id: string; title: string; docType: string };
export type DailyLogContractOption = { id: string; label: string };

/** Danh sách việc trong ngày, mỗi dòng tách riêng và tick được — thay cho 1 đoạn văn dài gộp chung */
function DailyLogItemsEditor({
  items,
  setItems,
  milestoneOptions,
  vatTuOptions,
  documentOptions,
  contractOptions,
  picOptions,
}: {
  items: DailyLogItemInput[];
  setItems: (v: DailyLogItemInput[]) => void;
  milestoneOptions: { id: string; name: string; phaseName: string }[];
  vatTuOptions: DailyLogVatTuOption[];
  documentOptions: DailyLogDocumentOption[];
  contractOptions: DailyLogContractOption[];
  picOptions: string[];
}) {
  function update(i: number, patch: Partial<DailyLogItemInput>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  // Nhóm theo giai đoạn/nhóm vật tư bằng <optgroup> — danh sách có thể dài (40+ mốc cả dự án), nhóm lại dễ tìm hơn nhiều
  const milestonesByPhase = Array.from(new Set(milestoneOptions.map((m) => m.phaseName))).map((phaseName) => ({
    phaseName,
    items: milestoneOptions.filter((m) => m.phaseName === phaseName),
  }));
  const vatTuByGroup = Array.from(new Set(vatTuOptions.map((v) => v.groupName))).map((groupName) => ({
    groupName,
    items: vatTuOptions.filter((v) => v.groupName === groupName),
  }));
  return (
    <div className="space-y-2">
      {/* datalist dùng chung cho mọi dòng — combobox: gợi ý sẵn nhưng vẫn gõ tên mới được */}
      <datalist id="daily-log-pic-options">
        {picOptions.map((p) => <option key={p} value={p} />)}
      </datalist>
      {items.map((it, i) => (
        <div key={i} className="border border-line rounded-lg p-2 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <input type="hidden" name="itemId[]" value={it.id} />
            <input type="checkbox" checked={it.checked} onChange={(e) => update(i, { checked: e.target.checked })} />
            <input type="hidden" name="itemChecked[]" value={it.checked ? "true" : "false"} />
            <Input
              name="itemLabel[]"
              className="flex-1 min-w-[140px]"
              placeholder="Lấy giấy phép chính sao y bản chính..."
              value={it.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Input
              name="itemPic[]"
              list="daily-log-pic-options"
              placeholder="Phụ trách (PIC)..."
              title="Người/đơn vị phụ trách — chọn gợi ý hoặc gõ tên mới"
              className="!w-40 shrink-0"
              value={it.pic}
              onChange={(e) => update(i, { pic: e.target.value })}
            />
            <Input
              name="itemDueDate[]"
              type="date"
              title="Hạn cần xong"
              className="!w-36 shrink-0"
              value={it.dueDate}
              onChange={(e) => update(i, { dueDate: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              className="text-critical text-xs font-semibold shrink-0"
            >
              Xóa
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap pl-6">
            <Select
              name="itemMilestoneId[]"
              className="!py-1 text-[12px] !w-auto flex-1 min-w-[140px]"
              value={it.milestoneId}
              onChange={(e) => update(i, { milestoneId: e.target.value })}
            >
              <option value="">— Gắn với mốc (tùy chọn) —</option>
              {milestonesByPhase.map((g) => (
                <optgroup key={g.phaseName} label={g.phaseName}>
                  {g.items.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Select
              name="itemVatTuId[]"
              className="!py-1 text-[12px] !w-auto flex-1 min-w-[140px]"
              value={it.vatTuDuAnId}
              onChange={(e) => update(i, { vatTuDuAnId: e.target.value })}
            >
              <option value="">— Gắn với vật tư (tùy chọn) —</option>
              {vatTuByGroup.map((g) => (
                <optgroup key={g.groupName} label={g.groupName}>
                  {g.items.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Select
              name="itemWorkType[]"
              className="!py-1 text-[12px] !w-auto flex-1 min-w-[140px]"
              value={it.workType}
              onChange={(e) => update(i, { workType: e.target.value })}
            >
              <option value="">— Loại công việc (tùy chọn) —</option>
              {opts(DAILY_LOG_WORK_TYPE)}
            </Select>
            <Select
              name="itemDocumentId[]"
              className="!py-1 text-[12px] !w-auto flex-1 min-w-[140px]"
              value={it.documentId}
              onChange={(e) => update(i, { documentId: e.target.value })}
            >
              <option value="">— Gắn với hồ sơ (tùy chọn) —</option>
              {documentOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </Select>
            <Select
              name="itemContractId[]"
              className="!py-1 text-[12px] !w-auto flex-1 min-w-[140px]"
              value={it.contractId}
              onChange={(e) => update(i, { contractId: e.target.value })}
            >
              <option value="">— Gắn với hợp đồng (tùy chọn) —</option>
              {contractOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setItems([
            ...items,
            {
              id: "", label: "", checked: false, dueDate: "", milestoneId: "", vatTuDuAnId: "", workType: "",
              documentId: "", contractId: "", pic: "",
            },
          ])
        }
        className="text-brand text-xs font-semibold"
      >
        + Thêm việc
      </button>
    </div>
  );
}

export type DailyLogVatTuOption = { id: string; name: string; groupName: string };

/** Các ô nhập chung cho form Thêm/Sửa nhật ký — tách riêng để dùng lại giữa 2 form */
function DailyLogFields({
  logDate,
  phases,
  defaultMilestoneIds,
  vatTuOptions = [],
  defaultVatTuIds = [],
  documentOptions = [],
  contractOptions = [],
  picOptions = [],
  defaultItems = [],
  defaults,
}: {
  logDate: string;
  phases: DailyLogPhase[];
  defaultMilestoneIds: string[];
  vatTuOptions?: DailyLogVatTuOption[];
  defaultVatTuIds?: string[];
  documentOptions?: DailyLogDocumentOption[];
  contractOptions?: DailyLogContractOption[];
  picOptions?: string[];
  defaultItems?: DailyLogItemInput[];
  defaults?: {
    weather?: string;
    rainHours?: number | null;
    workerCount?: number;
    isForceMajeure?: boolean;
    workDescription?: string | null;
  };
}) {
  const [items, setItems] = useState<DailyLogItemInput[]>(
    defaultItems.length > 0
      ? defaultItems
      : [{
          id: "", label: "", checked: false, dueDate: "", milestoneId: "", vatTuDuAnId: "", workType: "",
          documentId: "", contractId: "", pic: "",
        }],
  );
  const phasesWithMilestones = phases.filter((p) => p.milestones.length > 0);
  const milestoneOptions = phases.flatMap((p) => p.milestones.map((m) => ({ id: m.id, name: m.name, phaseName: p.name })));
  const vatTuGroups = Array.from(new Set(vatTuOptions.map((v) => v.groupName))).map((groupName) => ({
    groupName,
    items: vatTuOptions.filter((v) => v.groupName === groupName),
  }));
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
        <DailyLogItemsEditor
          items={items}
          setItems={setItems}
          milestoneOptions={milestoneOptions}
          vatTuOptions={vatTuOptions}
          documentOptions={documentOptions}
          contractOptions={contractOptions}
          picOptions={picOptions}
        />
      </Field>
      <Field label="Ghi chú thêm (tuỳ chọn)">
        <Textarea name="workDescription" rows={2} placeholder="Ghi chú chung khác..." defaultValue={defaults?.workDescription ?? ""} />
      </Field>
      {phasesWithMilestones.length > 0 && (
        <Field label="Milestone liên quan trong ngày (tùy chọn — nếu KHÔNG gắn mốc riêng cho từng việc ở trên thì áp dụng chung cho tất cả các việc)">
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
      {vatTuGroups.length > 0 && (
        <Field label="Vật tư liên quan trong ngày (tùy chọn — nếu KHÔNG gắn vật tư riêng cho từng việc ở trên thì áp dụng chung cho tất cả các việc)">
          <div className="max-h-40 overflow-y-auto border border-line rounded-lg p-2 space-y-2">
            {vatTuGroups.map((g) => (
              <div key={g.groupName}>
                <p className="text-xs font-semibold text-muted uppercase">{g.groupName}</p>
                {g.items.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 text-[13px] py-0.5">
                    <input
                      type="checkbox"
                      name="vatTuIds"
                      value={v.id}
                      defaultChecked={defaultVatTuIds.includes(v.id)}
                    />
                    {v.name}
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
  vatTuOptions = [],
  documentOptions = [],
  contractOptions = [],
  picOptions = [],
}: {
  projectId: string;
  phases?: DailyLogPhase[];
  defaultMilestoneIds?: string[];
  vatTuOptions?: DailyLogVatTuOption[];
  documentOptions?: DailyLogDocumentOption[];
  contractOptions?: DailyLogContractOption[];
  picOptions?: string[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ModalButton label="+ Ghi nhật ký" title="Nhật ký công trình">
      {(close) => (
        <form action={async (fd) => { await createDailyLog(projectId, fd); close(); }} className="space-y-3">
          <DailyLogFields
            logDate={today}
            phases={phases}
            defaultMilestoneIds={defaultMilestoneIds}
            vatTuOptions={vatTuOptions}
            documentOptions={documentOptions}
            contractOptions={contractOptions}
            picOptions={picOptions}
          />
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
  vatTuIds: string[];
  items: {
    id: string; label: string; isChecked: boolean; dueDate: string | null;
    milestoneId: string | null; vatTuDuAnId: string | null; workType: string | null;
    documentId: string | null; contractId: string | null; pic: string | null;
  }[];
};

/** Sửa 1 ngày nhật ký đã ghi — mở đúng dữ liệu ngày đó, sửa xong lưu vào đúng bản ghi (không tạo trùng) */
export function EditDailyLogForm({
  log,
  phases = [],
  vatTuOptions = [],
  documentOptions = [],
  contractOptions = [],
  picOptions = [],
}: {
  log: DailyLogRow;
  phases?: DailyLogPhase[];
  vatTuOptions?: DailyLogVatTuOption[];
  documentOptions?: DailyLogDocumentOption[];
  contractOptions?: DailyLogContractOption[];
  picOptions?: string[];
}) {
  return (
    <ModalButton label="Sửa" variant="default" title={`Sửa nhật ký ${fmtDate(log.logDate)}`}>
      {(close) => (
        <form action={async (fd) => { await updateDailyLog(log.id, fd); close(); }} className="space-y-3">
          <DailyLogFields
            logDate={log.logDate.slice(0, 10)}
            phases={phases}
            defaultMilestoneIds={log.milestoneIds}
            vatTuOptions={vatTuOptions}
            defaultVatTuIds={log.vatTuIds}
            documentOptions={documentOptions}
            contractOptions={contractOptions}
            picOptions={picOptions}
            defaultItems={log.items.map((it) => ({
              id: it.id,
              label: it.label, checked: it.isChecked, dueDate: it.dueDate?.slice(0, 10) ?? "",
              milestoneId: it.milestoneId ?? "", vatTuDuAnId: it.vatTuDuAnId ?? "", workType: it.workType ?? "",
              documentId: it.documentId ?? "", contractId: it.contractId ?? "", pic: it.pic ?? "",
            }))}
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

/**
 * Hiện danh sách việc trong ngày ngay trong bảng, tick nhanh không cần mở form Sửa.
 * Việc nào KHÔNG tự gắn mốc/vật tư riêng thì thừa hưởng (fallback) mốc/vật tư chung của cả ngày,
 * hiện mờ hơn (opacity thấp) để phân biệt với liên kết gắn riêng cho đúng việc đó.
 */
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

/**
 * Thanh cảm xúc + bình luận kiểu Facebook cho 1 việc trong nhật ký — cập nhật trạng thái/tiến độ
 * qua trao đổi ngắn thay vì phải sửa lại field cứng. "Realtime" bằng polling nhẹ (router.refresh()
 * mỗi 5s) CHỈ khi khung bình luận đang mở — không thêm hạ tầng WebSocket/Supabase Realtime cho 1
 * tính năng phụ, đơn giản và đủ dùng cho vài người dùng cùng dự án.
 */
/**
 * Bình luận + cảm xúc kiểu Facebook — dùng chung cho MỌI nguồn trong "Việc cần làm" (Nhật ký, WBS
 * tiến độ, Checklist mốc, Rủi ro, Issue Log, Bảo hành), không chỉ riêng Nhật ký như trước — polymorphic
 * qua (source, entityId) khớp với bảng TodoComment/TodoReaction.
 */
export function TodoDiscussion({
  source,
  entityId,
  comments,
  reactions,
  myEmail,
}: {
  source: TodoCommentSource;
  entityId: string;
  comments: { id: string; authorEmail: string; body: string; createdAt: string }[];
  reactions: { emoji: string; count: number; reactedByMe: boolean }[];
  myEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [open, router]);

  const reactionMap = new Map(reactions.map((r) => [r.emoji, r]));
  const myReaction = reactions.find((r) => r.reactedByMe);
  const totalReactions = reactions.reduce((s, r) => s + r.count, 0);

  const react = (e: string) => {
    startTransition(() => { void toggleTodoReaction(source, entityId, e); });
    setShowPicker(false);
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Chỉ hiện 1 nút "Thích" mặc định — bấm vào mới xổ ra đủ 5 lựa chọn cảm xúc, đỡ rối hàng nút */}
        {showPicker ? (
          REACTION_EMOJIS.map((e) => {
            const r = reactionMap.get(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => react(e)}
                className={`text-[12px] leading-none px-1.5 py-1 rounded-full border ${
                  r?.reactedByMe ? "border-brand" : "border-line hover:bg-page"
                }`}
                style={r?.reactedByMe ? { background: "color-mix(in srgb, var(--series-1) 15%, transparent)" } : undefined}
              >
                {e}{r && r.count > 0 ? ` ${r.count}` : ""}
              </button>
            );
          })
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className={`text-[12px] leading-none px-2 py-1 rounded-full border ${
              myReaction ? "border-brand" : "border-line hover:bg-page"
            }`}
            style={myReaction ? { background: "color-mix(in srgb, var(--series-1) 15%, transparent)" } : undefined}
          >
            {myReaction ? myReaction.emoji : "👍"} {myReaction ? "Đã thích" : "Thích"}
            {totalReactions > 0 ? ` · ${totalReactions}` : ""}
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[11px] text-ink-2 hover:text-brand ml-1">
          💬 {comments.length > 0 ? comments.length : "Bình luận"}
        </button>
      </div>
      {open && (
        <div className="mt-1.5 pl-2 border-l-2 border-grid space-y-1.5">
          {comments.map((c) => (
            <div key={c.id} className="text-[12px] group flex items-start gap-1.5">
              <span className="font-semibold text-ink-2 shrink-0">{c.authorEmail.split("@")[0]}:</span>
              <span className="text-ink-2 flex-1 min-w-0 break-words">{c.body}</span>
              <span className="text-[10px] text-muted shrink-0 whitespace-nowrap">{fmtDateTime(c.createdAt)}</span>
              {c.authorEmail === myEmail && (
                <button
                  type="button"
                  onClick={() => startTransition(() => { void deleteTodoComment(c.id); })}
                  className="text-critical text-[10px] opacity-0 group-hover:opacity-100 shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !text.trim()) return;
                startTransition(() => { void addTodoComment(source, entityId, text); });
                setText("");
              }}
              placeholder="Viết bình luận cập nhật..."
              className="flex-1 min-w-0 text-[12px] bg-transparent border border-line rounded px-2 py-1 outline-none focus:border-brand"
            />
            <Button
              type="button"
              variant="default"
              className="!py-1 !px-2 text-[11px]"
              disabled={!text.trim()}
              onClick={() => {
                startTransition(() => { void addTodoComment(source, entityId, text); });
                setText("");
              }}
            >
              Gửi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DailyLogItemsView({
  items,
  dayMilestoneNames = [],
  dayVatTuNames = [],
  myEmail = "",
  projectId,
}: {
  items: {
    id: string; label: string; isChecked: boolean; dueDate: string | null;
    milestoneName: string | null; vatTuName: string | null; workType: string | null;
    documentTitle: string | null; contractLabel: string | null; pic: string | null;
    comments?: { id: string; authorEmail: string; body: string; createdAt: string }[];
    reactions?: { emoji: string; count: number; reactedByMe: boolean }[];
    photos?: DailyLogPhoto[];
    voiceNotes?: DailyLogPhoto[];
  }[];
  dayMilestoneNames?: string[];
  dayVatTuNames?: string[];
  myEmail?: string;
  /** Cần để tải ảnh/ghi âm lên đúng bucket dự án — bỏ trống thì ẩn nút gắn ảnh riêng cho từng việc */
  projectId?: string;
}) {
  if (items.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-1.5 mt-1">
      {items.map((it) => {
        const isOverdue = !it.isChecked && it.dueDate != null && it.dueDate.slice(0, 10) < today;
        const fallbackMilestones = it.milestoneName ? [] : dayMilestoneNames;
        const fallbackVatTu = it.vatTuName ? [] : dayVatTuNames;
        const hasBadges =
          it.workType || it.dueDate || it.milestoneName || it.vatTuName || it.documentTitle || it.contractLabel || it.pic ||
          fallbackMilestones.length > 0 || fallbackVatTu.length > 0;
        return (
          <div key={it.id} className="flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={it.isChecked}
              onChange={(e) => toggleDailyLogItem(it.id, e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <span className={it.isChecked ? "line-through text-muted" : "text-ink-2"}>{it.label}</span>
              {hasBadges && (
                // Luôn xuống dòng riêng bên dưới nhãn — tránh badge dồn/lệch dòng khác nhau tùy độ dài nhãn
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {it.workType && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-brand whitespace-nowrap font-semibold">
                      {DAILY_LOG_WORK_TYPE[it.workType] ?? it.workType}
                    </span>
                  )}
                  {it.pic && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2 whitespace-nowrap">👤 {it.pic}</span>
                  )}
                  {it.milestoneName && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2 whitespace-nowrap">🔹 {it.milestoneName}</span>
                  )}
                  {it.vatTuName && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2 whitespace-nowrap">🧱 {it.vatTuName}</span>
                  )}
                  {it.documentTitle && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2 whitespace-nowrap">📄 {it.documentTitle}</span>
                  )}
                  {it.contractLabel && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-ink-2 whitespace-nowrap">📋 {it.contractLabel}</span>
                  )}
                  {fallbackMilestones.map((name) => (
                    <span key={name} className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-muted whitespace-nowrap opacity-60">
                      🔹 {name}
                    </span>
                  ))}
                  {fallbackVatTu.map((name) => (
                    <span key={name} className="text-[11px] px-1.5 py-0.5 rounded bg-grid text-muted whitespace-nowrap opacity-60">
                      🧱 {name}
                    </span>
                  ))}
                  {it.dueDate && (
                    <span
                      className="text-[11px] whitespace-nowrap"
                      style={{ color: isOverdue ? "var(--critical)" : "var(--text-muted)" }}
                    >
                      {isOverdue && "⚠️ "}Hạn {fmtDate(it.dueDate)}
                    </span>
                  )}
                </div>
              )}
              <TodoDiscussion
                source="DAILY_LOG"
                entityId={it.id}
                comments={it.comments ?? []}
                reactions={it.reactions ?? []}
                myEmail={myEmail}
              />
              {projectId && (
                <div className="flex items-center gap-2 mt-1">
                  <DailyLogItemPhotos itemId={it.id} projectId={projectId} photos={it.photos ?? []} />
                  <VoiceNotes
                    notes={it.voiceNotes ?? []}
                    entityId={it.id}
                    projectId={projectId}
                    uploadAction={uploadDailyLogItemVoiceNote}
                    onDelete={deleteDailyLogItemPhoto}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
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
          {photos.map((p, i) => (
            <div key={p.id} className="relative group shrink-0">
              <PreviewButton
                url={p.url}
                mimeType="image/jpeg"
                title={p.title}
                siblings={photos.map((x) => ({ url: x.url, mimeType: "image/jpeg", title: x.title }))}
                index={i}
              >
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

/** Ảnh công trường gắn vào 1 công việc WBS — cùng cơ chế với DailyLogPhotos (nhật ký công trình) */
export function MilestoneTaskPhotos({
  taskId,
  projectId,
  photos,
}: {
  taskId: string;
  projectId: string;
  photos: DailyLogPhoto[];
}) {
  const [state, action, pending] = useActionState<UploadPhotosState, FormData>(
    async (prev, fd) => uploadMilestoneTaskPhotos(taskId, projectId, prev, fd),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group shrink-0">
              <PreviewButton
                url={p.url}
                mimeType="image/jpeg"
                title={p.title}
                siblings={photos.map((x) => ({ url: x.url, mimeType: "image/jpeg", title: x.title }))}
                index={i}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.title} className="w-14 h-14 object-cover rounded border border-line cursor-pointer" />
              </PreviewButton>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xóa ảnh "${p.title}"?`)) deleteMilestoneTaskPhoto(p.id);
                }}
                className="absolute -top-1.5 -right-1.5 bg-critical text-white rounded-full w-4 h-4 text-[10px] leading-4 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
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

/** Ảnh công trường gắn thẳng vào 1 mốc nghiệm thu — dùng cho mốc chưa có WBS con nào để gắn ảnh vào */
export function MilestonePhotos({
  milestoneId,
  projectId,
  photos,
}: {
  milestoneId: string;
  projectId: string;
  photos: DailyLogPhoto[];
}) {
  const [state, action, pending] = useActionState<UploadPhotosState, FormData>(
    async (prev, fd) => uploadMilestonePhotos(milestoneId, projectId, prev, fd),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1.5">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group shrink-0">
              <PreviewButton
                url={p.url}
                mimeType="image/jpeg"
                title={p.title}
                siblings={photos.map((x) => ({ url: x.url, mimeType: "image/jpeg", title: x.title }))}
                index={i}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.title} className="w-14 h-14 object-cover rounded border border-line cursor-pointer" />
              </PreviewButton>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xóa ảnh "${p.title}"?`)) deleteMilestonePhoto(p.id);
                }}
                className="absolute -top-1.5 -right-1.5 bg-critical text-white rounded-full w-4 h-4 text-[10px] leading-4 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
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
          {pending ? "Đang tải..." : `📷 Ảnh công trường${photos.length > 0 ? ` (${photos.length})` : ""}`}
        </Button>
      </form>
      {state.error && <p className="text-critical text-xs mt-1">{state.error}</p>}
    </div>
  );
}

/**
 * Ảnh hiện trường gắn thẳng vào 1 việc cụ thể trong nhật ký (DailyLogItem) — khác DailyLogPhotos
 * (gắn theo cả ngày): dùng khi có ảnh minh chứng đúng cho 1 hoạt động, kể cả chụp muộn hơn ngày ghi
 * nhật ký (VD ghi nhật ký "định vị tim cọc" hôm qua, có ảnh hiện trường hôm nay mới chụp xong).
 */
export function DailyLogItemPhotos({
  itemId,
  projectId,
  photos,
}: {
  itemId: string;
  projectId: string;
  photos: DailyLogPhoto[];
}) {
  const [state, action, pending] = useActionState<UploadPhotosState, FormData>(
    async (prev, fd) => uploadDailyLogItemPhotos(itemId, projectId, prev, fd),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1 inline-flex items-center gap-1.5 flex-wrap">
      {photos.map((p, i) => (
        <div key={p.id} className="relative group shrink-0">
          <PreviewButton
            url={p.url}
            mimeType="image/jpeg"
            title={p.title}
            siblings={photos.map((x) => ({ url: x.url, mimeType: "image/jpeg", title: x.title }))}
            index={i}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.title} className="w-10 h-10 object-cover rounded border border-line cursor-pointer" />
          </PreviewButton>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Xóa ảnh "${p.title}"?`)) deleteDailyLogItemPhoto(p.id);
            }}
            className="absolute -top-1.5 -right-1.5 bg-critical text-white rounded-full w-4 h-4 text-[10px] leading-4 opacity-0 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
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
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="text-[11px] text-ink-2 hover:text-brand"
        >
          {pending ? "Đang tải..." : `📷 ${photos.length > 0 ? photos.length : "Ảnh"}`}
        </button>
      </form>
      {state.error && <p className="text-critical text-xs w-full">{state.error}</p>}
    </div>
  );
}

/**
 * Ghi âm giọng nói qua mic trình duyệt (MediaRecorder) — dùng chung cho cả 3 nơi (nhật ký/mốc/công
 * việc WBS), chỉ khác `uploadAction` được bind sẵn id + projectId ở nơi gọi. Xóa dùng lại luôn
 * delete*Photo tương ứng vì đều xóa theo Document.id, không phân biệt ảnh hay ghi âm.
 */
export function VoiceNotes({
  notes,
  entityId,
  projectId,
  uploadAction,
  onDelete,
}: {
  notes: DailyLogPhoto[];
  entityId: string;
  projectId: string;
  /**
   * Truyền thẳng server action gốc (VD uploadDailyLogVoiceNote), KHÔNG bind sẵn tham số ở nơi gọi —
   * closure bind sẵn tạo ở Server Component (page.tsx) không serialize được qua boundary Client
   * Component ("Functions cannot be passed directly..."). Bind ở đây (trong Client Component) thì
   * an toàn vì không phải vượt boundary nữa.
   */
  uploadAction: (entityId: string, projectId: string, prev: UploadPhotosState, fd: FormData) => Promise<UploadPhotosState>;
  onDelete: (id: string) => void;
}) {
  const [state, action, pending] = useActionState<UploadPhotosState, FormData>(
    (prev, fd) => uploadAction(entityId, projectId, prev, fd),
    {},
  );
  const [, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const file = new File([blob], `ghi-am-${Date.now()}.webm`, { type: blob.type });
        const fd = new FormData();
        fd.append("files", file);
        startTransition(() => { action(fd); });
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Không truy cập được microphone — kiểm tra quyền trình duyệt đã cho phép chưa");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mt-1.5">
      {notes.length > 0 && (
        <div className="space-y-1 mb-1.5">
          {notes.map((n) => (
            <div key={n.id} className="flex items-center gap-2 group">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={n.url} className="h-8" style={{ maxWidth: 240 }} />
              <button
                type="button"
                onClick={() => { if (confirm(`Xóa bản ghi âm "${n.title}"?`)) onDelete(n.id); }}
                className="text-critical text-xs opacity-0 group-hover:opacity-100"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant={recording ? "danger" : "default"}
        className="!py-1 !px-2 text-xs"
        disabled={pending}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? `⏹ Dừng (${mm}:${ss})` : pending ? "Đang tải..." : "🎙️ Ghi âm"}
      </Button>
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

export type MilestoneTaskRow = {
  id: string;
  name: string;
  durationDays: number;
  responsible: string | null;
  isDone: boolean;
  dueDate: string | null;
  percentComplete: number;
  photos?: DailyLogPhoto[];
  voiceNotes?: DailyLogPhoto[];
};

const WBS_EDIT_INPUT = "!py-0.5 text-[11px] border border-line rounded px-1 bg-page outline-none focus:border-brand";

/** input type="date" cho gõ tay tới 6 chữ số năm khi chưa gõ xong — chỉ lưu DB khi năm hợp lý */
const isSaneDate = (iso: string) => {
  const y = new Date(iso).getFullYear();
  return !isNaN(y) && y >= 1970 && y <= 2200;
};

/**
 * 1 dòng công việc WBS — Hạn/PIC/% sửa trực tiếp tại đây, ghi thẳng DB qua updateMilestoneTaskFields.
 * Key gắn theo (id + dueDate + responsible + percentComplete) ở nơi gọi để ép remount lấy state mới
 * mỗi khi dữ liệu đổi (kể cả đổi từ tab Gantt chi tiết) — tránh state cục bộ bị "đứng hình" theo giá trị cũ,
 * đảm bảo DB luôn là nguồn dữ liệu duy nhất hiển thị ra, khớp giữa Detail Plan và Gantt chi tiết.
 */
function WbsTaskEditRow({ t, picListId, projectId }: { t: MilestoneTaskRow; picListId: string; projectId: string }) {
  const [, startTransition] = useTransition();
  const [due, setDue] = useState(t.dueDate ? t.dueDate.slice(0, 10) : "");
  const [pic, setPic] = useState(t.responsible ?? "");
  const [picTouched, setPicTouched] = useState(false);
  const [pct, setPct] = useState(t.percentComplete);
  const [showPhotos, setShowPhotos] = useState(false);
  const isDone = pct >= 100;
  const isLate = !isDone && !!due && new Date(due).getTime() < Date.now();
  const photoCount = (t.photos?.length ?? 0) + (t.voiceNotes?.length ?? 0);

  return (
    <div>
    <div className="flex items-center gap-2 text-[13px] group flex-wrap">
      <input
        type="checkbox"
        checked={t.isDone}
        onChange={() => toggleMilestoneTask(t.id)}
      />
      <span
        className={isDone ? "line-through" : ""}
        style={{ color: isLate ? "var(--critical)" : isDone ? "var(--good)" : undefined }}
      >
        {isLate && "⚠️ "}{t.name}
      </span>
      <span className="text-[11px] text-muted whitespace-nowrap">~{t.durationDays} ngày</span>
      <input
        type="date"
        className={`${WBS_EDIT_INPUT} !w-[120px]`}
        value={due}
        title="Hạn"
        style={{ color: isLate ? "var(--critical)" : undefined, borderColor: isLate ? "var(--critical)" : undefined }}
        onChange={(e) => {
          setDue(e.target.value);
          if (e.target.value && !isSaneDate(e.target.value)) return; // đang gõ dở/ngày rác — chưa lưu
          startTransition(() => { void updateMilestoneTaskFields(t.id, { dueDate: e.target.value || null }); });
        }}
      />
      <input
        type="text"
        list={picListId}
        className={`${WBS_EDIT_INPUT} !w-32`}
        value={pic}
        placeholder="PIC..."
        title="Người/đơn vị phụ trách"
        onFocus={() => { setPic(""); setPicTouched(false); }} // xóa tạm để datalist hiện đủ danh sách thay vì lọc theo tên đang có sẵn
        onChange={(e) => { setPic(e.target.value); setPicTouched(true); }}
        onBlur={() => {
          if (!picTouched) { setPic(t.responsible ?? ""); return; } // chỉ bấm vào rồi bấm ra, chưa chọn/gõ gì -> khôi phục, không lưu rỗng
          if (pic !== (t.responsible ?? "")) startTransition(() => { void updateMilestoneTaskFields(t.id, { responsible: pic }); });
        }}
      />
      <span className="flex items-center gap-0.5">
        <input
          type="number"
          min={0}
          max={100}
          className={`${WBS_EDIT_INPUT} !w-14`}
          value={pct}
          title="% hoàn thành"
          style={{ color: isDone ? "var(--good)" : undefined }}
          onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          onBlur={() => {
            if (pct !== t.percentComplete) startTransition(() => { void updateMilestoneTaskFields(t.id, { percentComplete: pct }); });
          }}
        />
        <span className="text-[11px] text-muted">%</span>
      </span>
      <button
        type="button"
        onClick={() => setShowPhotos((s) => !s)}
        className="text-[11px] text-ink-2 hover:text-brand whitespace-nowrap"
        title="Ảnh & ghi âm công trường"
      >
        📷🎙️{photoCount > 0 ? ` ${photoCount}` : ""}
      </button>
      <button
        type="button"
        onClick={() => deleteMilestoneTask(t.id)}
        className="text-critical text-xs opacity-0 group-hover:opacity-100 ml-auto"
      >
        Xóa
      </button>
    </div>
    {showPhotos && (
      <div className="pl-6 mt-1 flex flex-wrap gap-3 items-start">
        <MilestoneTaskPhotos taskId={t.id} projectId={projectId} photos={t.photos ?? []} />
        <VoiceNotes
          notes={t.voiceNotes ?? []}
          entityId={t.id}
          projectId={projectId}
          uploadAction={uploadMilestoneTaskVoiceNote}
          onDelete={deleteMilestoneTaskPhoto}
        />
      </div>
    )}
    </div>
  );
}

/** WBS cấp 4: danh sách công việc con của 1 milestone, kèm Hạn/PIC/% sửa trực tiếp (đồng nhất với Gantt chi tiết) */
export function WbsTaskPanel({
  milestoneId, tasks, picOptions = [], projectId,
}: {
  milestoneId: string; tasks: MilestoneTaskRow[]; picOptions?: string[]; projectId: string;
}) {
  const [adding, setAdding] = useState(false);
  const doneCount = tasks.filter((t) => t.isDone).length;
  const totalDays = tasks.reduce((s, t) => s + t.durationDays, 0);
  const avgPct = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.percentComplete, 0) / tasks.length) : 0;
  const picListId = `wbs-pic-${milestoneId}`;

  return (
    <div className="ml-6 mt-1.5 border-l-2 border-grid pl-3">
      <datalist id={picListId}>
        {picOptions.map((p) => <option key={p} value={p} />)}
      </datalist>
      {tasks.length > 0 && (
        <p className="text-xs text-muted mb-1">
          WBS công việc: {doneCount}/{tasks.length} xong · trung bình {avgPct}% · tổng ~{totalDays} ngày công
        </p>
      )}
      <div className="space-y-1">
        {tasks.map((t) => (
          <WbsTaskEditRow key={`${t.id}-${t.dueDate}-${t.responsible}-${t.percentComplete}`} t={t} picListId={picListId} projectId={projectId} />
        ))}
      </div>
      {adding ? (
        <form
          action={async (fd) => {
            await addMilestoneTask(milestoneId, fd);
            setAdding(false);
          }}
          className="mt-1.5 flex items-center gap-2 flex-wrap"
        >
          <Input name="name" required placeholder="Tên công việc..." className="!py-1 text-[13px] flex-1 min-w-[140px]" />
          <Input name="durationDays" type="number" min={1} defaultValue={1} placeholder="Số ngày" className="!py-1 text-[13px] !w-20" />
          <Input name="responsible" placeholder="Người phụ trách" className="!py-1 text-[13px] !w-36" />
          <Button type="submit" variant="primary" className="!py-1">Thêm</Button>
          <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted">Hủy</button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-brand font-semibold hover:underline mt-1.5"
        >
          + Thêm công việc
        </button>
      )}
    </div>
  );
}

const MS_SEV: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  PENDING: "neutral",
  AWAITING_INSPECTION: "warning",
  APPROVED: "good",
  AUTO_APPROVED: "good",
  REJECTED: "critical",
};

export type MilestoneRowData = {
  id: string;
  name: string;
  isHoldPoint: boolean;
  status: string;
  plannedDate: string | null;
  requestedAt: string | null;
  confirmDeadlineHrs: number;
  lastInspection: { result: string; method: string; confirmedAt: string; notes: string | null } | null;
  checklistItems: { id: string; label: string; isChecked: boolean }[];
  tasks: MilestoneTaskRow[];
  photos?: DailyLogPhoto[];
  voiceNotes?: DailyLogPhoto[];
};

/**
 * 1 dòng mốc nghiệm thu — mặc định THU GỌN (không hiện WBS/checklist), bấm mũi tên mới xổ ra.
 * Tránh cảnh 38 mốc x (3-5 công việc + 3-5 checklist) hiện hết cùng lúc, rất rối mắt/không chuyên nghiệp.
 */
export function MilestoneRow({
  m,
  now,
  templates,
  picOptions = [],
  projectId,
}: {
  m: MilestoneRowData;
  now: number;
  templates: { category: string; items: string[] }[];
  picOptions?: string[];
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const plannedDate = m.plannedDate ? new Date(m.plannedDate) : null;
  const deadline = m.requestedAt ? new Date(new Date(m.requestedAt).getTime() + m.confirmDeadlineHrs * 3_600_000) : null;
  const hoursLeft = deadline ? Math.max(0, Math.round((deadline.getTime() - now) / 3_600_000)) : null;
  const doneTasks = m.tasks.filter((t) => t.isDone).length;
  const avgTaskPct = m.tasks.length > 0 ? Math.round(m.tasks.reduce((s, t) => s + t.percentComplete, 0) / m.tasks.length) : 0;
  // Đã xong nếu nghiệm thu đạt HOẶC toàn bộ WBS con đã 100% — khớp đúng logic ở Gantt chi tiết
  const msDone = ["APPROVED", "AUTO_APPROVED"].includes(m.status) || (m.tasks.length > 0 && avgTaskPct >= 100);
  const isLate = plannedDate && plannedDate.getTime() < now && !msDone;
  const doneChecklist = m.checklistItems.filter((c) => c.isChecked).length;

  return (
    <div className="border border-line rounded-lg px-3 py-2">
      <div className="flex items-center gap-2.5 flex-wrap">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-muted shrink-0">
          {open ? "▾" : "▸"}
        </button>
        <span>{m.isHoldPoint ? "⛔" : "🔹"}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[13.5px]">{m.name}</div>
          <div className="text-xs text-ink-2">
            <span style={{ color: isLate ? "var(--critical)" : undefined }}>
              📅 Dự kiến: {m.plannedDate ? fmtDate(m.plannedDate) : "chưa đặt ngày"}
              {isLate && " — đã trễ"}
            </span>
            {m.status === "AWAITING_INSPECTION" && hoursLeft != null && (
              <span style={{ color: hoursLeft <= 12 ? "var(--critical)" : undefined }}>
                {" "}· ⏰ Còn {hoursLeft}h để xác nhận (quá hạn tự động thông qua)
              </span>
            )}
            {m.lastInspection && (
              <>
                {" "}· {INSPECTION_RESULT[m.lastInspection.result]} qua {INSPECTION_METHOD[m.lastInspection.method]}{" "}
                lúc {fmtDateTime(m.lastInspection.confirmedAt)}
                {m.lastInspection.notes && ` — "${m.lastInspection.notes}"`}
              </>
            )}
            {!open && (m.tasks.length > 0 || m.checklistItems.length > 0) && (
              <span className="text-muted">
                {" "}· WBS {doneTasks}/{m.tasks.length}
                {m.tasks.length > 0 && ` (${avgTaskPct}%)`} · Checklist {doneChecklist}/{m.checklistItems.length}
              </span>
            )}
          </div>
        </div>
        <Tag sev={MS_SEV[m.status]}>{MILESTONE_STATUS[m.status]}</Tag>
        {(m.status === "PENDING" || m.status === "REJECTED") && <RequestInspectionButton milestoneId={m.id} />}
        {m.status === "AWAITING_INSPECTION" && (
          <RecordInspectionForm milestoneId={m.id} milestoneName={m.name} checklistItems={m.checklistItems} />
        )}
        <EditMilestoneForm
          milestone={{
            id: m.id, name: m.name, isHoldPoint: m.isHoldPoint,
            confirmDeadlineHrs: m.confirmDeadlineHrs, plannedDate: m.plannedDate,
          }}
        />
      </div>
      {open && (
        <>
          <div className="flex flex-wrap gap-3 items-start">
            <MilestonePhotos milestoneId={m.id} projectId={projectId} photos={m.photos ?? []} />
            <VoiceNotes
              notes={m.voiceNotes ?? []}
              entityId={m.id}
              projectId={projectId}
              uploadAction={uploadMilestoneVoiceNote}
              onDelete={deleteMilestonePhoto}
            />
          </div>
          <WbsTaskPanel milestoneId={m.id} tasks={m.tasks} picOptions={picOptions} projectId={projectId} />
          <ChecklistPanel milestoneId={m.id} milestoneName={m.name} items={m.checklistItems} templates={templates} />
        </>
      )}
    </div>
  );
}

export type PhaseCardData = {
  id: string;
  sortOrder: number;
  name: string;
  type: PhaseType;
  plannedStart: string | null;
  plannedEnd: string | null;
  weight: number;
  progressPct: number;
  milestones: MilestoneRowData[];
};

/** 1 giai đoạn — mặc định thu gọn nếu đã hoàn thành 100%, còn lại mở sẵn (đang làm/chưa làm) */
export function PhaseCard({
  phase,
  now,
  templates,
  picOptions = [],
  projectId,
}: {
  phase: PhaseCardData;
  now: number;
  templates: { category: string; items: string[] }[];
  picOptions?: string[];
  projectId: string;
}) {
  const isDone = phase.progressPct >= 100;
  const [open, setOpen] = useState(!isDone);
  const sortedMilestones = [...phase.milestones].sort((a, b) => {
    if (!a.plannedDate && !b.plannedDate) return 0;
    if (!a.plannedDate) return 1;
    if (!b.plannedDate) return -1;
    return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
  });

  return (
    <Card>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-muted shrink-0">
          {open ? "▾" : "▸"}
        </button>
        <h2 className="font-bold">
          {phase.sortOrder}. {phase.name}
        </h2>
        <span className="text-ink-2 text-[13px] money">
          {fmtDate(phase.plannedStart)} → {fmtDate(phase.plannedEnd)} · tỷ trọng {phase.weight}%
        </span>
        <div className="ml-auto flex gap-2 items-center">
          <CreateStandardMilestonesButton phaseId={phase.id} phaseType={phase.type} />
          <CreateMilestoneForm
            phaseId={phase.id}
            phaseName={phase.name}
            defaultDate={phase.plannedEnd}
            templates={templates}
          />
          <UpdatePhaseForm
            phase={{
              id: phase.id, name: phase.name, progressPct: phase.progressPct,
              plannedStart: phase.plannedStart, plannedEnd: phase.plannedEnd,
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2.5 rounded-full bg-grid overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${phase.progressPct}%`, background: "var(--series-1)" }}
          />
        </div>
        <span className="text-[13px] font-bold money w-11 text-right">{phase.progressPct}%</span>
      </div>

      {open && sortedMilestones.length > 0 && (
        <div className="space-y-2">
          {sortedMilestones.map((m) => (
            <MilestoneRow key={m.id} m={m} now={now} templates={templates} picOptions={picOptions} projectId={projectId} />
          ))}
        </div>
      )}
      {!open && phase.milestones.length > 0 && (
        <p className="text-xs text-muted">{phase.milestones.length} mốc — đã thu gọn, bấm ▸ để xem</p>
      )}
    </Card>
  );
}

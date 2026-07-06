"use client";

import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { RISK_CATEGORY, RISK_SEVERITY, RISK_STATUS, IDLE_CAUSE } from "@/lib/labels";
import {
  createRisk, updateRiskStatus, createNeighborSurvey,
  startIdleWait, stopIdleWait, createPilingRecord, addPileItem,
} from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export function CreateRiskForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Rủi ro" title="Ghi nhận rủi ro">
      {(close) => (
        <form action={async (fd) => { await createRisk(projectId, fd); close(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhóm rủi ro *"><Select name="category" required>{opts(RISK_CATEGORY)}</Select></Field>
            <Field label="Mức độ"><Select name="severity" defaultValue="MEDIUM">{opts(RISK_SEVERITY)}</Select></Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required placeholder="Đụng ống nước ngầm khi đào móng" /></Field>
          <Field label="Mô tả"><Textarea name="description" rows={2} /></Field>
          <Field label="Ước tính chi phí ảnh hưởng (VND)"><Input name="estimatedCostImpact" inputMode="numeric" /></Field>
          <Field label="Phương án xử lý"><Textarea name="mitigationPlan" rows={2} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số cọc ép thử *"><Input name="testPileCount" type="number" required defaultValue="2" /></Field>
            <Field label="Độ sâu TB cọc thử (m) *"><Input name="testPileAvgDepth" required inputMode="decimal" placeholder="18" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
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

export function AddPileItemForm({ pilingRecordId, nextPileNo, designLength }: { pilingRecordId: string; nextPileNo: number; designLength: number }) {
  return (
    <ModalButton label="+ Cọc" title="Ghi nhận cọc ép" variant="default">
      {(close) => (
        <form action={async (fd) => { await addPileItem(pilingRecordId, fd); close(); }} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
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

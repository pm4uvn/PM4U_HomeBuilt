"use client";

/* Forms client — Module 1. Mỗi form là 1 modal gọi server action tương ứng. */

import { Fragment, useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/Modal";
import { Button, Field, Input, Select, Textarea, Tag } from "@/components/ui";
import { BankNameInput } from "@/components/BankNameInput";
import { fmtDate, fmtVND } from "@/lib/format";
import {
  VENDOR_TYPE, PENALTY_TYPE, PENALTY_BASIS, DISCOUNT_TYPE, VARIATION_REASON, DOC_TYPE, PAYMENT_STATUS,
  CONTRACT_STATUS,
} from "@/lib/labels";
import {
  createProject, createVendor, updateVendor, deleteVendor, createContract, updateContract, deleteContract,
  addPaymentStage, updatePaymentStage, deletePaymentStage, addPaymentTransaction, deletePaymentTransaction,
  addPenaltyRule, recordPenaltyEvent, addDiscount, createVariation, decideVariation,
} from "./actions";
import { uploadDocument, type UploadState } from "../documents/actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

function SubmitRow({ label = "Lưu" }: { label?: string }) {
  return (
    <div className="pt-2">
      <Button type="submit" variant="primary" className="w-full">{label}</Button>
    </div>
  );
}

export function CreateProjectForm() {
  return (
    <ModalButton label="+ Tạo dự án" title="Tạo dự án mới">
      {(close) => (
        <form action={async (fd) => { await createProject(fd); close(); }} className="space-y-3">
          <Field label="Tên dự án *"><Input name="name" required placeholder="Nhà phố Q.7 — 1 trệt 3 lầu" /></Field>
          <Field label="Địa chỉ *"><Input name="address" required /></Field>
          <Field label="Tổng ngân sách dự kiến (VND) *"><Input name="budgetPlanned" required inputMode="numeric" placeholder="3500000000" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="DT đất (m²)"><Input name="landArea" inputMode="decimal" /></Field>
            <Field label="DT sàn XD (m²)"><Input name="grossFloorArea" inputMode="decimal" /></Field>
          </div>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

interface VendorFull {
  id: string; type: string; name: string; taxCode: string | null; address: string | null;
  contactName: string | null; phone: string | null;
  bankName: string | null; bankAccountNumber: string | null; bankAccountHolder: string | null;
}

const EMPTY_VENDOR_FIELDS = {
  name: "", taxCode: "", address: "", contactName: "", phone: "",
  bankName: "", bankAccountNumber: "", bankAccountHolder: "",
};

export function CreateVendorForm({
  projectId,
  existingVendors,
}: {
  projectId: string;
  existingVendors: VendorFull[];
}) {
  const [copyFromId, setCopyFromId] = useState("");
  const [fields, setFields] = useState(EMPTY_VENDOR_FIELDS);

  function handleCopyFrom(id: string) {
    setCopyFromId(id);
    const v = existingVendors.find((v) => v.id === id);
    setFields(
      v
        ? {
            name: v.name,
            taxCode: v.taxCode ?? "",
            address: v.address ?? "",
            contactName: v.contactName ?? "",
            phone: v.phone ?? "",
            bankName: v.bankName ?? "",
            bankAccountNumber: v.bankAccountNumber ?? "",
            bankAccountHolder: v.bankAccountHolder ?? "",
          }
        : EMPTY_VENDOR_FIELDS,
    );
  }

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <ModalButton
      label="+ Nhà thầu"
      title="Thêm nhà thầu / NCC"
      variant="default"
    >
      {(close) => (
        <form
          action={async (fd) => { await createVendor(projectId, fd); close(); setFields(EMPTY_VENDOR_FIELDS); setCopyFromId(""); }}
          className="space-y-3"
        >
          {existingVendors.length > 0 && (
            <Field label="Sao chép thông tin từ nhà thầu đã có (tùy chọn — cùng công ty, khác vai trò)">
              <Select value={copyFromId} onChange={(e) => handleCopyFrom(e.target.value)}>
                <option value="">— Nhập mới —</option>
                {existingVendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({VENDOR_TYPE[v.type]})</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Loại *"><Select name="type" required>{opts(VENDOR_TYPE)}</Select></Field>
          <Field label="Tên nhà thầu *">
            <Input name="name" required placeholder="Cty XD Tiến Lộc" value={fields.name} onChange={set("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã số thuế"><Input name="taxCode" value={fields.taxCode} onChange={set("taxCode")} /></Field>
            <Field label="SĐT"><Input name="phone" value={fields.phone} onChange={set("phone")} /></Field>
          </div>
          <Field label="Địa chỉ"><Input name="address" value={fields.address} onChange={set("address")} /></Field>
          <Field label="Người liên hệ"><Input name="contactName" value={fields.contactName} onChange={set("contactName")} /></Field>
          <div className="border border-line rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-muted uppercase">Tài khoản nhận tiền</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngân hàng">
                <BankNameInput name="bankName" placeholder="Vietcombank" value={fields.bankName} onChange={set("bankName")} />
              </Field>
              <Field label="Số tài khoản">
                <Input name="bankAccountNumber" value={fields.bankAccountNumber} onChange={set("bankAccountNumber")} />
              </Field>
            </div>
            <Field label="Tên chủ tài khoản">
              <Input name="bankAccountHolder" value={fields.bankAccountHolder} onChange={set("bankAccountHolder")} />
            </Field>
          </div>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

export function EditVendorForm({
  vendor,
}: {
  vendor: VendorFull;
}) {
  return (
    <ModalButton label="Sửa" title={`Sửa nhà thầu — ${vendor.name}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateVendor(vendor.id, fd); close(); }} className="space-y-3">
          <Field label="Loại *">
            <Select name="type" required defaultValue={vendor.type}>{opts(VENDOR_TYPE)}</Select>
          </Field>
          <Field label="Tên nhà thầu *">
            <Input name="name" required defaultValue={vendor.name} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã số thuế"><Input name="taxCode" defaultValue={vendor.taxCode ?? ""} /></Field>
            <Field label="SĐT"><Input name="phone" defaultValue={vendor.phone ?? ""} /></Field>
          </div>
          <Field label="Địa chỉ"><Input name="address" defaultValue={vendor.address ?? ""} /></Field>
          <Field label="Người liên hệ"><Input name="contactName" defaultValue={vendor.contactName ?? ""} /></Field>
          <div className="border border-line rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-muted uppercase">Tài khoản nhận tiền</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngân hàng"><BankNameInput name="bankName" defaultValue={vendor.bankName ?? ""} placeholder="Vietcombank" /></Field>
              <Field label="Số tài khoản"><Input name="bankAccountNumber" defaultValue={vendor.bankAccountNumber ?? ""} /></Field>
            </div>
            <Field label="Tên chủ tài khoản"><Input name="bankAccountHolder" defaultValue={vendor.bankAccountHolder ?? ""} /></Field>
          </div>
          <SubmitRow />
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Xóa nhà thầu "${vendor.name}"? Chỉ xóa được nếu chưa có hợp đồng nào.`)) return;
              try {
                await deleteVendor(vendor.id);
                close();
              } catch (e) {
                alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
              }
            }}
            className="w-full text-critical text-[13px] font-semibold py-1.5 hover:underline"
          >
            Xóa nhà thầu
          </button>
        </form>
      )}
    </ModalButton>
  );
}

/**
 * Nhập giá trị HĐ theo 2 chế độ (trước VAT / đã gồm VAT) + ô VAT% —
 * luôn submit "contractValue" là giá TRƯỚC VAT (backend chỉ cần con số này).
 */
function ContractValueFields({
  initialContractValue,
  initialVatRate,
}: {
  initialContractValue?: number; // giá trước VAT, dùng khi sửa hợp đồng có sẵn
  initialVatRate: string;
}) {
  const [mode, setMode] = useState<"beforeVat" | "withVat">("beforeVat");
  const [vatRate, setVatRate] = useState(initialVatRate);
  const [valueInput, setValueInput] = useState(
    initialContractValue != null ? String(initialContractValue) : "",
  );

  const vat = Number(vatRate) || 0;
  const typed = Number(valueInput.replace(/[.,\s]/g, "")) || 0;
  const preVat = mode === "beforeVat" ? typed : typed / (1 + vat / 100);
  const withVat = mode === "withVat" ? typed : typed * (1 + vat / 100);

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-xs font-medium text-ink-2 mb-1">Nhập giá trị hợp đồng theo</span>
        <div className="inline-flex rounded-lg border border-line overflow-hidden text-[13px] mb-2">
          <button
            type="button"
            onClick={() => setMode("beforeVat")}
            className={`px-3 py-1.5 font-semibold ${mode === "beforeVat" ? "bg-brand text-white" : "bg-surface hover:bg-page"}`}
          >
            Trước VAT
          </button>
          <button
            type="button"
            onClick={() => setMode("withVat")}
            className={`px-3 py-1.5 font-semibold border-l border-line ${mode === "withVat" ? "bg-brand text-white" : "bg-surface hover:bg-page"}`}
          >
            Đã gồm VAT
          </button>
        </div>
        <Input
          required
          inputMode="numeric"
          placeholder={mode === "beforeVat" ? "1850000000" : "1998000000"}
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
        />
        {typed > 0 && (
          <p className="text-xs text-muted mt-1">
            {mode === "beforeVat"
              ? `≈ ${Math.round(withVat).toLocaleString("vi-VN")}₫ đã gồm VAT`
              : `≈ ${Math.round(preVat).toLocaleString("vi-VN")}₫ trước VAT`}
          </p>
        )}
        <input type="hidden" name="contractValue" value={String(Math.round(preVat))} />
      </div>
      <Field label="VAT (%)">
        <Input inputMode="decimal" value={vatRate} onChange={(e) => setVatRate(e.target.value)} name="vatRate" />
      </Field>
    </div>
  );
}

export function CreateContractForm({
  projectId,
  vendors,
}: {
  projectId: string;
  vendors: { id: string; name: string; type: string }[];
}) {
  return (
    <ModalButton label="+ Hợp đồng" title="Số hóa hợp đồng mới">
      {(close) => (
        <form action={async (fd) => { await createContract(projectId, fd); close(); }} className="space-y-3">
          <Field label="Nhà thầu *">
            <Select name="vendorId" required>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({VENDOR_TYPE[v.type]})</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số HĐ *"><Input name="code" required placeholder="HĐ-2026-001" /></Field>
            <Field label="Trạng thái">
              <Select name="status" defaultValue="SIGNED">
                <option value="DRAFT">Nháp</option>
                <option value="SIGNED">Đã ký</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
              </Select>
            </Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required placeholder="Thi công phần thô nhà phố" /></Field>
          <ContractValueFields initialVatRate="8" />
          <Field label="Giữ lại bảo hành (%)"><Input name="retentionPct" defaultValue="5" inputMode="decimal" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ngày ký"><Input name="signedDate" type="date" /></Field>
            <Field label="Khởi công"><Input name="startDate" type="date" /></Field>
            <Field label="Hoàn thành dự kiến"><Input name="plannedEndDate" type="date" /></Field>
          </div>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

export function EditContractForm({
  contract,
  vendors,
}: {
  contract: {
    id: string; vendorId: string; code: string; title: string; status: string;
    contractValue: number; vatRate: number; retentionPct: number;
    signedDate: string | null; startDate: string | null; plannedEndDate: string | null;
  };
  vendors: { id: string; name: string; type: string }[];
}) {
  const router = useRouter();
  const d = (s: string | null) => (s ? s.slice(0, 10) : "");
  return (
    <ModalButton label="Sửa hợp đồng" title={`Sửa hợp đồng — ${contract.code}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateContract(contract.id, fd); close(); }} className="space-y-3">
          <Field label="Nhà thầu *">
            <Select name="vendorId" required defaultValue={contract.vendorId}>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({VENDOR_TYPE[v.type]})</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số HĐ *"><Input name="code" required defaultValue={contract.code} /></Field>
            <Field label="Trạng thái">
              <Select name="status" defaultValue={contract.status}>
                <option value="DRAFT">Nháp</option>
                <option value="SIGNED">Đã ký</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="TERMINATED">Hủy ngang</option>
              </Select>
            </Field>
          </div>
          <Field label="Tiêu đề *"><Input name="title" required defaultValue={contract.title} /></Field>
          <ContractValueFields
            initialContractValue={contract.contractValue}
            initialVatRate={String(contract.vatRate)}
          />
          <Field label="Giữ lại bảo hành (%)"><Input name="retentionPct" inputMode="decimal" defaultValue={String(contract.retentionPct)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ngày ký"><Input name="signedDate" type="date" defaultValue={d(contract.signedDate)} /></Field>
            <Field label="Khởi công"><Input name="startDate" type="date" defaultValue={d(contract.startDate)} /></Field>
            <Field label="Hoàn thành dự kiến"><Input name="plannedEndDate" type="date" defaultValue={d(contract.plannedEndDate)} /></Field>
          </div>
          <SubmitRow />
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Xóa hợp đồng "${contract.code}"? Chỉ xóa được nếu chưa có đợt thanh toán nào đã trả.`)) return;
              try {
                await deleteContract(contract.id);
                close();
                router.push("/contracts");
              } catch (e) {
                alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
              }
            }}
            className="w-full text-critical text-[13px] font-semibold py-1.5 hover:underline"
          >
            Xóa hợp đồng
          </button>
        </form>
      )}
    </ModalButton>
  );
}

type StageAmountMode = "percent" | "amountBeforeVat" | "amountWithVat";

/**
 * Ô nhập %/số tiền dùng chung cho Thêm và Sửa đợt thanh toán.
 * Số tiền có thể nhập trước VAT hoặc đã gồm VAT — luôn quy đổi đúng về %
 * (contractValue truyền vào là giá TRƯỚC VAT, khớp với cách lưu percent trong CSDL).
 * Có gợi ý phần % còn lại chưa phân bổ.
 */
function StageAmountFields({
  contractValue,
  vatRate,
  remainingPercent,
  mode,
  setMode,
  percentInput,
  setPercentInput,
  amountInput,
  setAmountInput,
}: {
  contractValue: number;
  vatRate: number;
  remainingPercent: number;
  mode: StageAmountMode;
  setMode: (m: StageAmountMode) => void;
  percentInput: string;
  setPercentInput: (v: string) => void;
  amountInput: string;
  setAmountInput: (v: string) => void;
}) {
  const amountNum = Number(amountInput.replace(/[.,\s]/g, "")) || 0;
  const percentNum = Number(percentInput) || 0;
  // amountNum theo mode: trước VAT thì dùng thẳng, đã gồm VAT thì trừ VAT ra để lấy giá gốc (khớp % lưu trong CSDL)
  const baseFromAmount = mode === "amountWithVat" ? amountNum / (1 + vatRate / 100) : amountNum;
  const computedPercent = mode === "percent" ? percentNum : contractValue > 0 ? (baseFromAmount / contractValue) * 100 : 0;
  const computedBaseAmount = mode === "percent" ? (contractValue * percentNum) / 100 : baseFromAmount;
  const computedWithVatAmount = computedBaseAmount * (1 + vatRate / 100);
  const remainingAmount = (contractValue * remainingPercent) / 100;
  const remainingAmountWithVat = remainingAmount * (1 + vatRate / 100);

  return (
    <div>
      <span className="block text-xs font-medium text-ink-2 mb-1">Nhập theo</span>
      <div className="inline-flex rounded-lg border border-line overflow-hidden text-[13px] mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setMode("percent")}
          className={`px-3 py-1.5 font-semibold ${mode === "percent" ? "bg-brand text-white" : "bg-surface hover:bg-page"}`}
        >
          % giá trị HĐ
        </button>
        <button
          type="button"
          onClick={() => setMode("amountBeforeVat")}
          className={`px-3 py-1.5 font-semibold border-l border-line ${mode === "amountBeforeVat" ? "bg-brand text-white" : "bg-surface hover:bg-page"}`}
        >
          Số tiền (trước VAT)
        </button>
        <button
          type="button"
          onClick={() => setMode("amountWithVat")}
          className={`px-3 py-1.5 font-semibold border-l border-line ${mode === "amountWithVat" ? "bg-brand text-white" : "bg-surface hover:bg-page"}`}
        >
          Số tiền (đã gồm VAT)
        </button>
      </div>

      {Math.abs(remainingPercent) > 0.01 && (
        <p className="text-xs text-muted mb-1.5">
          💡 Các đợt khác đang chiếm {(100 - remainingPercent).toFixed(2)}% — còn lại <b>{remainingPercent.toFixed(2)}%</b>{" "}
          (~{Math.round(remainingAmount).toLocaleString("vi-VN")}₫ trước VAT, ~
          {Math.round(remainingAmountWithVat).toLocaleString("vi-VN")}₫ đã gồm VAT).{" "}
          <button
            type="button"
            className="text-brand font-semibold hover:underline"
            onClick={() => {
              if (mode === "percent") setPercentInput(remainingPercent.toFixed(2));
              else if (mode === "amountBeforeVat") setAmountInput(String(Math.round(remainingAmount)));
              else setAmountInput(String(Math.round(remainingAmountWithVat)));
            }}
          >
            Dùng số này
          </button>
        </p>
      )}

      {mode === "percent" ? (
        <>
          <Input
            inputMode="decimal"
            required
            placeholder="30"
            value={percentInput}
            onChange={(e) => setPercentInput(e.target.value)}
          />
          {contractValue > 0 && percentNum > 0 && (
            <p className="text-xs text-muted mt-1">
              ≈ {Math.round(computedBaseAmount).toLocaleString("vi-VN")}₫ trước VAT · ≈{" "}
              {Math.round(computedWithVatAmount).toLocaleString("vi-VN")}₫ đã gồm VAT
            </p>
          )}
        </>
      ) : (
        <>
          <Input
            inputMode="numeric"
            required
            placeholder="50000000"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
          {contractValue > 0 && amountNum > 0 && (
            <p className="text-xs text-muted mt-1">
              ≈ {computedPercent.toFixed(2)}% giá trị HĐ ·{" "}
              {mode === "amountBeforeVat"
                ? `≈ ${Math.round(computedWithVatAmount).toLocaleString("vi-VN")}₫ đã gồm VAT`
                : `≈ ${Math.round(computedBaseAmount).toLocaleString("vi-VN")}₫ trước VAT`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function AddStageForm({
  contractId,
  contractValue,
  vatRate,
  nextStageNo,
  existingPercentTotal,
  milestones,
}: {
  contractId: string;
  contractValue: number;
  vatRate: number;
  nextStageNo: number;
  existingPercentTotal: number;
  milestones: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<StageAmountMode>("percent");
  const [percentInput, setPercentInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const remainingPercent = 100 - existingPercentTotal;

  const amountNum = Number(amountInput.replace(/[.,\s]/g, "")) || 0;
  const percentNum = Number(percentInput) || 0;
  const baseFromAmount = mode === "amountWithVat" ? amountNum / (1 + vatRate / 100) : amountNum;
  const computedPercent = mode === "percent" ? percentNum : contractValue > 0 ? (baseFromAmount / contractValue) * 100 : 0;

  return (
    <ModalButton label="+ Đợt thanh toán" title="Thêm đợt thanh toán" variant="default">
      {(close) => (
        <form
          action={async (fd) => {
            fd.set("percent", String(computedPercent));
            await addPaymentStage(contractId, fd);
            close();
            setPercentInput("");
            setAmountInput("");
          }}
          className="space-y-3"
        >
          <Field label="Đợt số *"><Input name="stageNo" type="number" required defaultValue={nextStageNo} /></Field>

          <StageAmountFields
            contractValue={contractValue}
            vatRate={vatRate}
            remainingPercent={remainingPercent}
            mode={mode}
            setMode={setMode}
            percentInput={percentInput}
            setPercentInput={setPercentInput}
            amountInput={amountInput}
            setAmountInput={setAmountInput}
          />

          <Field label="Tên đợt *"><Input name="name" required placeholder="Xong móng / Đổ sàn tầng 1..." /></Field>
          <Field label="Milestone kích hoạt (nghiệm thu xong mới tới hạn)">
            <Select name="triggerMilestoneId" defaultValue="">
              <option value="">— Không (tới hạn ngay, vd đợt ký HĐ) —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hạn thanh toán sau nghiệm thu (ngày)">
            <Input name="dueDaysAfterTrigger" type="number" defaultValue="3" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFinal" />
            Đợt cuối (quyết toán phát sinh + hoàn tiền giữ lại bảo hành)
          </label>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

export function EditStageForm({
  stage,
  contractValue,
  vatRate,
  otherStagesPercentTotal,
  milestones,
  bankAccounts,
}: {
  stage: {
    id: string; stageNo: number; name: string; percent: number; status: string;
    triggerMilestoneId: string | null; dueDaysAfterTrigger: number; dueDate: string | null; isFinal: boolean;
    paidAmount: number | null; paidDate: string | null; paidFromAccountId: string | null;
  };
  contractValue: number;
  vatRate: number;
  otherStagesPercentTotal: number;
  milestones: { id: string; name: string }[];
  bankAccounts: { id: string; nickname: string; bankName: string; accountNumber: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<StageAmountMode>("percent");
  const [percentInput, setPercentInput] = useState(String(stage.percent));
  const [amountInput, setAmountInput] = useState(String(Math.round((contractValue * stage.percent) / 100)));
  const [status, setStatus] = useState(stage.status);
  const remainingPercent = 100 - otherStagesPercentTotal;

  const amountNum = Number(amountInput.replace(/[.,\s]/g, "")) || 0;
  const percentNum = Number(percentInput) || 0;
  const baseFromAmount = mode === "amountWithVat" ? amountNum / (1 + vatRate / 100) : amountNum;
  const computedPercent = mode === "percent" ? percentNum : contractValue > 0 ? (baseFromAmount / contractValue) * 100 : 0;

  return (
    <ModalButton label="Sửa" title={`Sửa đợt ${stage.stageNo}: ${stage.name}`} variant="default">
      {(close) => (
        <form
          action={async (fd) => {
            fd.set("percent", String(computedPercent));
            await updatePaymentStage(stage.id, fd);
            close();
          }}
          className="space-y-3"
        >
          <Field label="Đợt số *"><Input name="stageNo" type="number" required defaultValue={stage.stageNo} /></Field>

          <StageAmountFields
            contractValue={contractValue}
            vatRate={vatRate}
            remainingPercent={remainingPercent}
            mode={mode}
            setMode={setMode}
            percentInput={percentInput}
            setPercentInput={setPercentInput}
            amountInput={amountInput}
            setAmountInput={setAmountInput}
          />

          <Field label="Tên đợt *"><Input name="name" required defaultValue={stage.name} /></Field>
          <Field label="Milestone kích hoạt (nghiệm thu xong mới tới hạn)">
            <Select name="triggerMilestoneId" defaultValue={stage.triggerMilestoneId ?? ""}>
              <option value="">— Không (tới hạn ngay, vd đợt ký HĐ) —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hạn thanh toán sau nghiệm thu (ngày)">
            <Input name="dueDaysAfterTrigger" type="number" defaultValue={stage.dueDaysAfterTrigger} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFinal" defaultChecked={stage.isFinal} />
            Đợt cuối (quyết toán phát sinh + hoàn tiền giữ lại bảo hành)
          </label>

          <Field label="Trạng thái">
            <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="UPCOMING">Chưa tới</option>
              <option value="DUE">Tới hạn</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="PARTIAL">Đã trả một phần</option>
              <option value="PAID">Đã trả đủ</option>
            </Select>
          </Field>

          {status === "UPCOMING" ? (
            <p className="text-xs text-muted">
              "Chưa tới" không có hạn cụ thể — hạn sẽ tự gán khi milestone được nghiệm thu.
            </p>
          ) : (
            <Field label="Hạn thanh toán (ngày cụ thể)">
              <Input name="dueDate" type="date" defaultValue={stage.dueDate?.slice(0, 10) ?? ""} />
            </Field>
          )}

          {(status === "PAID" || status === "PARTIAL") && (
            <div className="border border-line rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted uppercase">
                Thông tin đã trả {status === "PARTIAL" && "(một phần)"}
              </p>
              <p className="text-xs text-muted">
                Lưu ý: sửa ở đây sẽ thay thế toàn bộ lịch sử giao dịch của đợt bằng đúng 1 khoản này.
                Nếu cần cộng dồn nhiều lần trả, dùng nút &quot;+ Trả tiền&quot; ở bảng đợt thanh toán thay vì sửa ở đây.
              </p>
              <Field label="Số tiền thực trả (VND) *">
                <Input
                  name="paidAmount"
                  required
                  inputMode="numeric"
                  defaultValue={stage.paidAmount != null ? String(stage.paidAmount) : ""}
                />
              </Field>
              <Field label="Ngày trả">
                <Input name="paidDate" type="date" defaultValue={stage.paidDate?.slice(0, 10) ?? ""} />
              </Field>
              {bankAccounts.length > 0 && (
                <Field label="Trả từ tài khoản">
                  <Select name="paidFromAccountId" defaultValue={stage.paidFromAccountId ?? ""}>
                    <option value="">— Không ghi rõ —</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.nickname} ({a.bankName} · {a.accountNumber})</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}

          <SubmitRow />
          <button
            type="button"
            onClick={async () => {
              const warning =
                stage.status === "PAID"
                  ? `Đợt ${stage.stageNo}: ${stage.name} ĐÃ TRẢ ${stage.paidAmount?.toLocaleString("vi-VN")}₫. Xóa sẽ MẤT VĨNH VIỄN lịch sử thanh toán này. Chắc chắn xóa?`
                  : `Xóa đợt ${stage.stageNo}: ${stage.name}?`;
              if (!confirm(warning)) return;
              try {
                await deletePaymentStage(stage.id);
                close();
                router.refresh();
              } catch (e) {
                alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
              }
            }}
            className="w-full text-critical text-[13px] font-semibold py-1.5 hover:underline"
          >
            Xóa đợt thanh toán
          </button>
        </form>
      )}
    </ModalButton>
  );
}

/**
 * Ghi nhận 1 lần chuyển tiền cho đợt — có thể bấm nhiều lần cho cùng 1 đợt
 * (trả nhiều đợt nhỏ). Mặc định gợi ý đúng số tiền CÒN THIẾU, không phải toàn bộ đợt.
 */
export function AddPaymentForm({
  stageId,
  remainingAmount,
  vendorBank,
  bankAccounts,
}: {
  stageId: string;
  remainingAmount: number;
  vendorBank?: { bankName: string | null; bankAccountNumber: string | null; bankAccountHolder: string | null };
  bankAccounts: { id: string; nickname: string; bankName: string; accountNumber: string }[];
}) {
  const hasVendorBank = vendorBank?.bankName && vendorBank?.bankAccountNumber;
  return (
    <ModalButton label="+ Trả tiền" title="Ghi nhận thanh toán" variant="default">
      {(close) => (
        <form action={async (fd) => { await addPaymentTransaction(stageId, fd); close(); }} className="space-y-3">
          {hasVendorBank && (
            <div className="text-[13px] bg-page border border-line rounded-lg p-3">
              <p className="text-xs font-semibold text-muted uppercase mb-1">Chuyển tới TK nhà thầu</p>
              {vendorBank!.bankName} · {vendorBank!.bankAccountNumber}
              {vendorBank!.bankAccountHolder && ` · ${vendorBank!.bankAccountHolder}`}
            </div>
          )}
          <Field label="Số tiền lần này (VND) *">
            <Input name="amount" required inputMode="numeric" defaultValue={String(Math.round(remainingAmount))} />
          </Field>
          <p className="text-xs text-muted">Còn thiếu ≈ {Math.round(remainingAmount).toLocaleString("vi-VN")}₫. Có thể trả ít hơn nếu đây là lần trả một phần.</p>
          <Field label="Ngày trả"><Input name="paidDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          {bankAccounts.length > 0 && (
            <Field label="Trả từ tài khoản">
              <Select name="paidFromAccountId" defaultValue="">
                <option value="">— Không ghi rõ —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.nickname} ({a.bankName} · {a.accountNumber})</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Ghi chú"><Input name="note" placeholder="Trả đợt 1/2..." /></Field>
          <SubmitRow label="Xác nhận" />
        </form>
      )}
    </ModalButton>
  );
}

/** Danh sách các lần đã trả cho 1 đợt, xóa được từng dòng nếu ghi nhầm */
export function PaymentTransactionList({
  transactions,
}: {
  transactions: { id: string; amount: number; paidDate: string; accountNickname: string | null; note: string | null }[];
}) {
  const router = useRouter();
  if (transactions.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-xs text-ink-2">
          <span className="money">{fmtDate(t.paidDate)}</span>
          <span className="font-semibold money">{Number(t.amount).toLocaleString("vi-VN")}₫</span>
          {t.accountNickname && <span>· {t.accountNickname}</span>}
          {t.note && <span className="italic">· {t.note}</span>}
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Xóa giao dịch này?")) return;
              await deletePaymentTransaction(t.id);
              router.refresh();
            }}
            className="text-critical hover:underline"
          >
            Xóa
          </button>
        </div>
      ))}
    </div>
  );
}

/* Preset các điều khoản phạt phổ biến trong HĐ xây nhà VN */
const PENALTY_PRESETS = [
  { label: "Thầu trễ tiến độ — 0,05%/ngày, trần 8%", type: "CONTRACTOR_LATE_PROGRESS", basis: "PCT_OF_CONTRACT_PER_DAY", rate: "0.05", capPct: "8" },
  { label: "CĐT chậm thanh toán — 0,5%/ngày", type: "OWNER_LATE_PAYMENT", basis: "PCT_OF_CONTRACT_PER_DAY", rate: "0.5", capPct: "8" },
  { label: "Hủy ngang hợp đồng — 8% giá trị HĐ", type: "TERMINATION", basis: "PCT_OF_CONTRACT", rate: "8", capPct: "" },
  { label: "Vật tư giả/sai xuất xứ — 8% giá trị vật tư", type: "FAKE_MATERIAL", basis: "PCT_OF_ITEM_VALUE", rate: "8", capPct: "" },
  { label: "CĐT gây chờ việc — 4.000.000₫/ngày", type: "OWNER_IDLE_WAIT", basis: "FIXED_PER_DAY", rate: "4000000", capPct: "" },
];

export function AddPenaltyRuleForm({ contractId }: { contractId: string }) {
  const [preset, setPreset] = useState(PENALTY_PRESETS[0]);
  return (
    <ModalButton label="+ Điều khoản phạt" title="Thêm điều khoản phạt" variant="default">
      {(close) => (
        <form action={async (fd) => { await addPenaltyRule(contractId, fd); close(); }} className="space-y-3">
          <Field label="Chọn nhanh điều khoản phổ biến">
            <Select
              value={PENALTY_PRESETS.indexOf(preset)}
              onChange={(e) => setPreset(PENALTY_PRESETS[Number(e.target.value)])}
            >
              {PENALTY_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Loại phạt">
            <Select name="type" value={preset.type} onChange={() => {}}>{opts(PENALTY_TYPE)}</Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cách tính">
              <Select name="basis" value={preset.basis} onChange={() => {}}>{opts(PENALTY_BASIS)}</Select>
            </Field>
            <Field label="Mức phạt"><Input name="rate" defaultValue={preset.rate} key={`r${preset.rate}`} required /></Field>
            <Field label="Trần phạt (%)"><Input name="capPct" defaultValue={preset.capPct} key={`c${preset.capPct}`} placeholder="8" /></Field>
          </div>
          <Field label="Số ngày ân hạn"><Input name="graceDays" type="number" defaultValue="0" /></Field>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

export function RecordPenaltyEventForm({
  contractId,
  rules,
}: {
  contractId: string;
  rules: { id: string; label: string }[];
}) {
  return (
    <ModalButton label="+ Ghi nhận vi phạm" title="Ghi nhận sự kiện vi phạm" variant="default">
      {(close) => (
        <form action={async (fd) => { await recordPenaltyEvent(contractId, fd); close(); }} className="space-y-3">
          <Field label="Điều khoản áp dụng *">
            <Select name="ruleId" required>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Từ ngày *"><Input name="startDate" type="date" required /></Field>
            <Field label="Đến ngày (bỏ trống nếu đang chạy)"><Input name="endDate" type="date" /></Field>
          </div>
          <Field label="Giá trị vật tư vi phạm (nếu phạt theo vật tư)">
            <Input name="baseAmount" inputMode="numeric" />
          </Field>
          <Field label="Ghi chú"><Textarea name="note" rows={2} /></Field>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

export function AddDiscountForm({
  contractId,
  otherContracts,
}: {
  contractId: string;
  otherContracts: { id: string; label: string }[];
}) {
  return (
    <ModalButton label="+ Giảm trừ" title="Thêm giảm trừ / khuyến mãi" variant="default">
      {(close) => (
        <form action={async (fd) => { await addDiscount(contractId, fd); close(); }} className="space-y-3">
          <Field label="Loại"><Select name="type">{opts(DISCOUNT_TYPE)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giảm theo % (vd 100 = miễn phí)"><Input name="percent" inputMode="decimal" /></Field>
            <Field label="Hoặc số tiền cố định (VND)"><Input name="amount" inputMode="numeric" /></Field>
          </div>
          <Field label="Điều kiện: chỉ hiệu lực khi HĐ này được ký">
            <Select name="conditionContractId" defaultValue="">
              <option value="">— Không điều kiện —</option>
              {otherContracts.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mô tả"><Input name="description" placeholder="Miễn 100% phí thiết kế khi ký HĐ thi công" /></Field>
          <SubmitRow />
        </form>
      )}
    </ModalButton>
  );
}

export function CreateVariationForm({ contractId }: { contractId: string }) {
  return (
    <ModalButton label="+ Phiếu phát sinh" title="Lập phiếu yêu cầu thay đổi (Variation)" variant="default">
      {(close) => (
        <form action={async (fd) => { await createVariation(contractId, fd); close(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã (tự sinh nếu bỏ trống)"><Input name="code" placeholder="VO-001" /></Field>
            <Field label="Lý do"><Select name="reason">{opts(VARIATION_REASON)}</Select></Field>
          </div>
          <Field label="Nội dung *"><Input name="title" required placeholder="Nâng cấp gạch 60x60 lên 80x80" /></Field>
          <Field label="Chênh lệch chi phí (VND, âm nếu giảm) *">
            <Input name="costDelta" required placeholder="28000000 hoặc -5000000" />
          </Field>
          <Field label="Gia hạn tiến độ (ngày)"><Input name="timeExtensionDays" type="number" defaultValue="0" /></Field>
          <SubmitRow label="Gửi duyệt" />
        </form>
      )}
    </ModalButton>
  );
}

export function VariationDecision({ variationId }: { variationId: string }) {
  return (
    <span className="inline-flex gap-1.5">
      <Button variant="primary" onClick={() => decideVariation(variationId, true)}>Duyệt</Button>
      <Button variant="danger" onClick={() => decideVariation(variationId, false)}>Từ chối</Button>
    </span>
  );
}

/* Tải file lên và tự gắn với hợp đồng này — không cần qua trang Hồ sơ */
export function UploadContractFileForm({
  contractId,
  projectId,
  contractCode,
}: {
  contractId: string;
  projectId: string;
  contractCode: string;
}) {
  return (
    <ModalButton label="+ Tải file hợp đồng" title={`Tải file — ${contractCode}`} variant="default">
      {(close) => <UploadForm contractId={contractId} projectId={projectId} close={close} />}
    </ModalButton>
  );
}

function UploadForm({
  contractId,
  projectId,
  close,
}: {
  contractId: string;
  projectId: string;
  close: () => void;
}) {
  const [docType, setDocType] = useState("CONTRACT_FILE");
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
      <input type="hidden" name="contractId" value={contractId} />
      <Field label="File * (tối đa 50MB)"><Input name="file" type="file" required /></Field>
      <Field label="Loại hồ sơ">
        <Select name="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {Object.entries(DOC_TYPE).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </Field>
      <Field label="Tiêu đề (bỏ trống = tên file)"><Input name="title" /></Field>
      {state.error && <p className="text-critical text-sm">⚠️ {state.error}</p>}
      <div className="pt-2">
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Đang tải lên…" : "Tải lên"}
        </Button>
      </div>
    </form>
  );
}

export type ContractPaymentStageRow = {
  id: string;
  stageNo: number;
  name: string;
  gross: number;
  dueDate: string | null;
  status: string;
  paidAmount: number | null;
};

const STAGE_SEV: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  PAID: "good",
  PARTIAL: "warning",
  DUE: "warning",
  OVERDUE: "critical",
  UPCOMING: "neutral",
};

const CONTRACT_STATUS_SEV: Record<string, "good" | "warning" | "critical" | "neutral"> = {
  DRAFT: "neutral", SIGNED: "warning", IN_PROGRESS: "good",
  COMPLETED: "neutral", TERMINATED: "critical",
};

export type ContractListRow = {
  id: string;
  vendorId: string;
  code: string;
  title: string;
  vendorName: string;
  vendorType: string;
  contractValue: number;
  vatRate: number;
  retentionPct: number;
  valueWithVat: number;
  totalPaid: number;
  paidStagesCount: number;
  totalStagesCount: number;
  signedDate: string | null;
  startDate: string | null;
  plannedEndDate: string | null;
  status: string;
  stages: ContractPaymentStageRow[];
};

const CONTRACT_ROW_COLS = 8;

/** 1 dòng hợp đồng trong bảng danh sách; khi xổ "Các đợt" thì thêm 1 dòng riêng trải hết bảng bên dưới, không nhét vào 1 ô */
export function ContractRow({
  c,
  vendors,
}: {
  c: ContractListRow;
  vendors: { id: string; name: string; type: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Fragment>
      <tr className="border-b border-grid last:border-0 text-[13px] hover:bg-page">
        <td className="py-2.5 pr-2">
          <Link href={`/contracts/${c.id}`} className="font-semibold text-brand hover:underline">
            {c.code}
          </Link>
          <div className="text-muted text-xs">{c.title}</div>
        </td>
        <td className="py-2.5 pr-2">
          {c.vendorName}
          <div className="text-muted text-xs">{VENDOR_TYPE[c.vendorType]}</div>
        </td>
        <td className="py-2.5 pr-2 text-right money font-bold">
          {fmtVND(Math.round(c.valueWithVat))}
          <div className="text-muted text-xs font-normal">
            ({fmtVND(c.contractValue)} + VAT {c.vatRate}%)
          </div>
        </td>
        <td className="py-2.5 pr-2 text-right money font-bold">
          {fmtVND(c.totalPaid)}
          <div className="text-muted text-xs font-normal">
            {c.paidStagesCount}/{c.totalStagesCount} đợt đã trả đủ
          </div>
        </td>
        <td className="py-2.5 pr-2">
          {c.stages.length === 0 ? (
            <span className="text-muted text-xs">—</span>
          ) : (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-brand text-xs font-semibold whitespace-nowrap"
            >
              {open ? "▲ Ẩn đợt" : `▾ Xem ${c.stages.length} đợt`}
            </button>
          )}
        </td>
        <td className="py-2.5 pr-2 money">{fmtDate(c.plannedEndDate)}</td>
        <td className="py-2.5 pr-2"><Tag sev={CONTRACT_STATUS_SEV[c.status]}>{CONTRACT_STATUS[c.status]}</Tag></td>
        <td className="py-2.5 text-right">
          <EditContractForm
            contract={{
              id: c.id,
              vendorId: c.vendorId,
              code: c.code,
              title: c.title,
              status: c.status,
              contractValue: c.contractValue,
              vatRate: c.vatRate,
              retentionPct: c.retentionPct,
              signedDate: c.signedDate,
              startDate: c.startDate,
              plannedEndDate: c.plannedEndDate,
            }}
            vendors={vendors}
          />
        </td>
      </tr>
      {open && (
        <tr className="border-b border-grid last:border-0 bg-page/60">
          <td colSpan={CONTRACT_ROW_COLS} className="py-2.5 px-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {c.stages.map((s) => (
                <div
                  key={s.id}
                  className="border border-line rounded-lg bg-surface px-3 py-2 text-[12px] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink-2">Đợt {s.stageNo}: {s.name}</span>
                    <Tag sev={STAGE_SEV[s.status] ?? "neutral"}>{PAYMENT_STATUS[s.status] ?? s.status}</Tag>
                  </div>
                  {s.dueDate && <div className="text-muted">Hạn: {fmtDate(s.dueDate)}</div>}
                  <div className="money font-semibold">
                    {s.paidAmount ? fmtVND(s.paidAmount) : "0₫"}{" "}
                    <span className="text-muted font-normal">/ {fmtVND(s.gross)}</span>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

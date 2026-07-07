"use client";

import { ModalButton } from "@/components/Modal";
import { Button, Field, Input } from "@/components/ui";
import { BankNameInput } from "@/components/BankNameInput";
import { createBankAccount, updateBankAccount, deleteBankAccount } from "./actions";

export function CreateBankAccountForm({ projectId }: { projectId: string }) {
  return (
    <ModalButton label="+ Tài khoản ngân hàng" title="Thêm tài khoản ngân hàng của bạn">
      {(close) => (
        <form action={async (fd) => { await createBankAccount(projectId, fd); close(); }} className="space-y-3">
          <Field label="Tên gợi nhớ *"><Input name="nickname" required placeholder="Vietcombank chính" /></Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Ngân hàng *"><BankNameInput name="bankName" required placeholder="Vietcombank" /></Field>
            <Field label="Số tài khoản *"><Input name="accountNumber" required /></Field>
          </div>
          <Field label="Tên chủ tài khoản"><Input name="accountHolder" /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function EditBankAccountForm({
  account,
}: {
  account: { id: string; nickname: string; bankName: string; accountNumber: string; accountHolder: string | null };
}) {
  return (
    <ModalButton label="Sửa" title={`Sửa tài khoản — ${account.nickname}`} variant="default">
      {(close) => (
        <form
          action={async (fd) => { await updateBankAccount(account.id, fd); close(); }}
          className="space-y-3"
        >
          <Field label="Tên gợi nhớ *"><Input name="nickname" required defaultValue={account.nickname} /></Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Ngân hàng *"><BankNameInput name="bankName" required defaultValue={account.bankName} /></Field>
            <Field label="Số tài khoản *"><Input name="accountNumber" required defaultValue={account.accountNumber} /></Field>
          </div>
          <Field label="Tên chủ tài khoản"><Input name="accountHolder" defaultValue={account.accountHolder ?? ""} /></Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Xóa tài khoản "${account.nickname}"?`)) return;
              try {
                await deleteBankAccount(account.id);
                close();
              } catch (e) {
                alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
              }
            }}
            className="w-full text-critical text-[13px] font-semibold py-1.5 hover:underline"
          >
            Xóa tài khoản
          </button>
        </form>
      )}
    </ModalButton>
  );
}

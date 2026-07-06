"use client";

import { useId } from "react";
import { Input } from "@/components/ui";
import { VIETNAM_BANKS } from "@/lib/banks";

/** Ô nhập tên ngân hàng: dropdown gợi ý danh sách NH Việt Nam, vẫn gõ tự do được nếu không có trong danh sách */
export function BankNameInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const listId = useId();
  return (
    <>
      <Input {...props} list={listId} autoComplete="off" />
      <datalist id={listId}>
        {VIETNAM_BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
    </>
  );
}

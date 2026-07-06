"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Nút mở modal + khung modal. children là nội dung form. */
export function ModalButton({
  label,
  title,
  variant = "primary",
  children,
}: {
  label: string;
  title: string;
  variant?: "default" | "primary";
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">{title}</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink text-lg px-1">
                ✕
              </button>
            </div>
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </div>
      )}
    </>
  );
}

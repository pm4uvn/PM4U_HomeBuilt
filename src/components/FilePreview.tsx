"use client";

/* Xem trước file (ảnh/PDF) ngay trong trang — không cần mở tab mới */

import { useState } from "react";

export function PreviewButton({
  url,
  mimeType,
  title,
  label = "Xem",
}: {
  url: string;
  mimeType: string | null;
  title: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const canPreview = isImage || isPdf;

  if (!canPreview) {
    // Loại file không xem trước được (docx, video lạ...) -> mở tab mới như cũ
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-brand font-semibold hover:underline text-[13px]">
        {label} ↗
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-brand font-semibold hover:underline text-[13px]"
      >
        {label} 👁
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-surface border border-line rounded-2xl p-3 w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-bold text-sm truncate">{title}</h3>
              <div className="flex items-center gap-3 shrink-0">
                <a href={url} target="_blank" rel="noreferrer" className="text-brand text-xs font-semibold hover:underline">
                  Mở tab mới ↗
                </a>
                <button onClick={() => setOpen(false)} className="text-muted hover:text-ink text-lg px-1">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-page flex items-center justify-center">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
              ) : (
                <iframe src={url} title={title} className="w-full h-full border-0" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

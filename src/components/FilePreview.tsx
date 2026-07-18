"use client";

/* Xem trước file (ảnh/PDF) ngay trong trang — không cần mở tab mới */

import { useEffect, useState } from "react";

export type PreviewSibling = { url: string; mimeType: string | null; title: string };

export function PreviewButton({
  url,
  mimeType,
  title,
  label = "Xem",
  children,
  siblings,
  index,
}: {
  url: string;
  mimeType: string | null;
  title: string;
  label?: string;
  /** Nếu truyền vào, dùng làm phần tử để bấm mở preview thay cho nút text mặc định (vd 1 thumbnail ảnh) */
  children?: React.ReactNode;
  /** Toàn bộ ảnh/file cùng nhóm (VD cùng 1 mốc/việc/chủ đề) — có thêm >1 ảnh thì hiện nút ◀ ▶ chuyển ảnh trong lúc xem, khỏi phải đóng ra mở lại từng ảnh */
  siblings?: PreviewSibling[];
  /** Vị trí của ảnh này trong `siblings` — bắt buộc kèm theo `siblings` để biết bắt đầu xem từ đâu */
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(index ?? 0);
  const gallery = siblings && siblings.length > 1 ? siblings : null;
  const current = gallery ? gallery[pos] : { url, mimeType, title };

  const isImage = current.mimeType?.startsWith("image/");
  const isPdf = current.mimeType === "application/pdf";
  const canPreview = isImage || isPdf;

  const openAt = () => {
    setPos(index ?? 0);
    setOpen(true);
  };
  const next = () => gallery && setPos((p) => (p + 1) % gallery.length);
  const prev = () => gallery && setPos((p) => (p - 1 + gallery.length) % gallery.length);

  useEffect(() => {
    if (!open || !gallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gallery]);

  if (!canPreview) {
    // Loại file không xem trước được (docx, video lạ...) -> mở tab mới như cũ
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-brand font-semibold hover:underline text-[13px]">
        {children ?? `${label} ↗`}
      </a>
    );
  }

  return (
    <>
      <button
        onClick={openAt}
        className={children ? "" : "text-brand font-semibold hover:underline text-[13px]"}
      >
        {children ?? `${label} 👁`}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-surface border border-line rounded-2xl p-3 w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-bold text-sm truncate">
                {current.title}
                {gallery && <span className="text-muted font-normal ml-2">{pos + 1}/{gallery.length}</span>}
              </h3>
              <div className="flex items-center gap-3 shrink-0">
                <a href={current.url} target="_blank" rel="noreferrer" className="text-brand text-xs font-semibold hover:underline">
                  Mở tab mới ↗
                </a>
                <button onClick={() => setOpen(false)} className="text-muted hover:text-ink text-lg px-1">
                  ✕
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden bg-page flex items-center justify-center">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.url} alt={current.title} className="max-w-full max-h-full object-contain" />
              ) : (
                <iframe src={current.url} title={current.title} className="w-full h-full border-0" />
              )}
              {gallery && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    title="Ảnh trước (←)"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white text-lg flex items-center justify-center hover:bg-black/70"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    title="Ảnh kế (→)"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white text-lg flex items-center justify-center hover:bg-black/70"
                  >
                    ▶
                  </button>
                </>
              )}
            </div>
            {gallery && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                {gallery.map((g, i) => (
                  <button
                    key={g.url}
                    type="button"
                    onClick={() => setPos(i)}
                    className={`shrink-0 w-12 h-12 rounded border overflow-hidden ${i === pos ? "border-brand" : "border-line opacity-60 hover:opacity-100"}`}
                  >
                    {g.mimeType?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.url} alt={g.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted">PDF</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

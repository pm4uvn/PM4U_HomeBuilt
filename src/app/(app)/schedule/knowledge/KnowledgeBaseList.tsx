"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { PreviewButton } from "@/components/FilePreview";
import { KNOWLEDGE_CATEGORY_DEFAULT, type KnowledgeArticle } from "@/lib/knowledge-base";

/** Danh sách chủ đề kiến thức — mỗi chủ đề thu gọn mặc định, bấm để xổ ra nội dung chi tiết */
export function KnowledgeBaseList({ articles }: { articles: KnowledgeArticle[] }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(articles.map((a) => a.category ?? KNOWLEDGE_CATEGORY_DEFAULT));
    return [...set];
  }, [articles]);

  const filtered = articles.filter((a) => {
    const cat = a.category ?? KNOWLEDGE_CATEGORY_DEFAULT;
    if (category && cat !== category) return false;
    return (
      a.topic.toLowerCase().includes(query.toLowerCase()) ||
      a.summary.toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <Card>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
              category === null ? "bg-brand text-white border-brand" : "border-line text-ink-2 hover:bg-page"
            }`}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                category === c ? "bg-brand text-white border-brand" : "border-line text-ink-2 hover:bg-page"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm chủ đề... (VD: ép cọc, ranh đất, giám sát, sleeve, tô trát)"
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm bg-page outline-none focus:border-brand mb-3"
      />
      <div className="space-y-1.5">
        {filtered.map((a) => {
          const open = openTopic === a.topic;
          return (
            <div key={a.topic} className="border border-line rounded-lg">
              <button
                type="button"
                onClick={() => setOpenTopic(open ? null : a.topic)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
              >
                <span className="text-muted">{open ? "▾" : "▸"}</span>
                <span className="font-semibold text-[13.5px]">{a.topic}</span>
                {!open && <span className="text-muted text-xs ml-2 truncate">{a.summary}</span>}
              </button>
              {open && (
                <div className="border-t border-grid px-3 py-2.5">
                  <p className="text-[12.5px] text-ink-2 italic mb-2">{a.summary}</p>
                  <ul className="list-disc list-inside space-y-1 text-[13px] text-ink-2">
                    {a.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                  {a.images && a.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                      {a.images.map((src, i) => (
                        <PreviewButton
                          key={src}
                          url={src}
                          mimeType="image/jpeg"
                          title={`${a.topic} — ảnh ${i + 1}`}
                          siblings={a.images!.map((s, j) => ({ url: s, mimeType: "image/jpeg", title: `${a.topic} — ảnh ${j + 1}` }))}
                          index={i}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`${a.topic} — minh họa ${i + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border border-line hover:opacity-80"
                          />
                        </PreviewButton>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted text-center py-4">Không tìm thấy chủ đề phù hợp.</p>}
      </div>
    </Card>
  );
}

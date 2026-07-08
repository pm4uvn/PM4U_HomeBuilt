"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { KnowledgeArticle } from "@/lib/knowledge-base";

/** Danh sách chủ đề kiến thức — mỗi chủ đề thu gọn mặc định, bấm để xổ ra nội dung chi tiết */
export function KnowledgeBaseList({ articles }: { articles: KnowledgeArticle[] }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const filtered = articles.filter(
    (a) =>
      a.topic.toLowerCase().includes(query.toLowerCase()) ||
      a.summary.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Card>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm chủ đề... (VD: ép cọc, ranh đất, giám sát)"
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

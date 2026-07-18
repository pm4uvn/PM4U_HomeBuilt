"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, Button } from "@/components/ui";
import { generateShareLink, revokeShareLink } from "./actions";

export function ShareControls({ projectId, shareToken }: { projectId: string; shareToken: string | null }) {
  const [token, setToken] = useState(shareToken);
  const [origin, setOrigin] = useState(""); // trống lúc SSR, set sau khi mount để tránh lệch hydrate
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setOrigin(window.location.origin), []);

  const shareUrl = token ? `${origin}/share/${token}` : "";

  const copy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card title="🔗 Chia sẻ tiến độ">
      {token ? (
        <div className="space-y-2">
          <p className="text-[13px] text-ink-2">
            Ai có link này xem được tiến độ + ảnh công trường, không cần đăng nhập — không lộ thông tin hợp đồng/tài chính.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-[220px] text-[12px] border border-line rounded px-2 py-1.5 bg-page text-ink-2"
            />
            <Button type="button" variant="default" className="!py-1.5" onClick={copy}>
              {copied ? "Đã sao chép ✓" : "Sao chép"}
            </Button>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => setToken(await generateShareLink(projectId)))}
              className="text-brand text-xs font-semibold hover:underline"
            >
              Tạo lại link (hủy link cũ)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm("Thu hồi link chia sẻ? Người đang giữ link cũ sẽ không xem được nữa.")) return;
                startTransition(async () => { await revokeShareLink(projectId); setToken(null); });
              }}
              className="text-critical text-xs font-semibold hover:underline"
            >
              Thu hồi link
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-ink-2">Tạo link để gửi cho người thân xem tiến độ + ảnh công trường, không cần tài khoản.</p>
          <Button
            type="button"
            variant="primary"
            disabled={pending}
            onClick={() => startTransition(async () => setToken(await generateShareLink(projectId)))}
          >
            {pending ? "Đang tạo..." : "Tạo link chia sẻ"}
          </Button>
        </div>
      )}
    </Card>
  );
}

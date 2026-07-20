"use client";

import { useState, useTransition } from "react";
import { Card, Button } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { getDayInfo } from "@/lib/lunar";
import type { DayForecast } from "@/services/weather.service";
import { updateProjectWeatherCoords } from "./actions";

export function WeatherForecast({
  projectId, forecast, lat, lng,
}: {
  projectId: string;
  forecast: DayForecast[];
  lat: number | null;
  lng: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [latInput, setLatInput] = useState(lat != null ? String(lat) : "");
  const [lngInput, setLngInput] = useState(lng != null ? String(lng) : "");
  const [pending, startTransition] = useTransition();

  const save = () => {
    const la = Number(latInput);
    const lo = Number(lngInput);
    if (isNaN(la) || isNaN(lo)) return;
    startTransition(async () => {
      await updateProjectWeatherCoords(projectId, la, lo);
      setEditing(false);
    });
  };

  return (
    <Card title="🌦️ Thời tiết & Lịch vạn niên 7 ngày">
      {forecast.length === 0 ? (
        <p className="text-muted text-sm text-center py-4">
          Không lấy được dữ liệu dự báo lúc này — thử tải lại trang sau.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {forecast.map((d) => {
            const lunar = getDayInfo(new Date(`${d.date}T00:00:00`));
            return (
              <div
                key={d.date}
                className="shrink-0 w-[112px] border rounded-lg p-2 text-center"
                style={{ borderColor: d.isRisky ? "var(--critical)" : "var(--line)" }}
              >
                <div className="text-[11px] text-muted">{fmtDate(d.date).slice(0, 5)}</div>
                <div className="text-2xl my-1">{d.icon}</div>
                <div className="text-[11.5px] font-semibold" style={{ color: d.isRisky ? "var(--critical)" : undefined }}>
                  {d.label}
                </div>
                <div className="text-[11px] text-ink-2 mt-1">
                  {d.tempMin}° – {d.tempMax}°
                </div>
                <div className="text-[11px] text-muted">💧 {d.rainProbability}% · {d.rainMm}mm</div>
                <div className="border-t border-grid mt-1.5 pt-1.5">
                  <div className="text-[10.5px] text-muted" title={lunar.dayCanChi}>
                    Âm {lunar.lunarDay}/{lunar.lunarMonth}{lunar.isLeapMonth ? " nhuận" : ""}
                  </div>
                  <div
                    className="text-[10.5px] font-semibold mt-0.5"
                    style={{ color: lunar.isHoangDao ? "var(--good)" : "var(--critical)" }}
                  >
                    {lunar.isHoangDao ? "🟢 Hoàng đạo" : "🔴 Hắc đạo"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-grid">
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Vĩ độ (VD 10.9838)"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="text-[12px] border border-line rounded px-2 py-1 bg-page w-36 outline-none focus:border-brand"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Kinh độ (VD 106.4900)"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              className="text-[12px] border border-line rounded px-2 py-1 bg-page w-36 outline-none focus:border-brand"
            />
            <Button type="button" variant="primary" className="!py-1" disabled={pending} onClick={save}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:underline">
              Hủy
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="text-brand text-xs font-semibold hover:underline">
            ✏️ Sửa tọa độ dự báo {lat == null && "(đang dùng mặc định Củ Chi, TP.HCM)"}
          </button>
        )}
        <p className="text-[10.5px] text-muted mt-1">
          Lấy tọa độ: mở Google Maps, bấm giữ đúng vị trí công trình, tọa độ sẽ hiện ra để copy.
        </p>
      </div>
    </Card>
  );
}

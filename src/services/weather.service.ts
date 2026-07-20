/**
 * Dự báo thời tiết theo ngày — khác với thời tiết HỒI CỨU đã ghi trong Nhật ký công trình
 * (DailyLog.weather, dùng tính isForceMajeure). Dùng Open-Meteo (api.open-meteo.com) — miễn phí,
 * không cần API key, đủ dữ liệu cần cho xây dựng dân dụng VN.
 */

// Củ Chi, TP.HCM — dùng khi Project chưa nhập tọa độ thật, để có dữ liệu ngay không cần cấu hình trước
const DEFAULT_COORDS = { lat: 10.9838, lng: 106.49 };

export type DayForecast = {
  date: string; // YYYY-MM-DD
  label: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  rainProbability: number; // %
  rainMm: number;
  isRisky: boolean; // mưa to/dông — dùng tô cảnh báo + sinh Alert
};

/** Mã thời tiết WMO (weathercode Open-Meteo trả về) -> nhãn tiếng Việt + emoji + có phải rủi ro mưa không */
function mapWeatherCode(code: number): { label: string; icon: string; isRisky: boolean } {
  if (code === 0 || code === 1) return { label: "Nắng", icon: "☀️", isRisky: false };
  if (code === 2 || code === 3) return { label: "Nhiều mây", icon: "☁️", isRisky: false };
  if (code === 45 || code === 48) return { label: "Sương mù", icon: "🌫️", isRisky: false };
  if ([51, 53, 55, 56, 57, 61, 63, 80, 81].includes(code)) return { label: "Mưa nhỏ", icon: "🌦️", isRisky: false };
  if (code === 65 || code === 82) return { label: "Mưa to", icon: "🌧️", isRisky: true };
  if (code >= 95) return { label: "Dông bão", icon: "⛈️", isRisky: true };
  return { label: "Nhiều mây", icon: "☁️", isRisky: false };
}

/** Dự báo N ngày tới (mặc định 7) — không throw khi API lỗi/timeout, trả [] để không sập cả trang */
export async function getWeatherForecast(
  lat: number | null | undefined,
  lng: number | null | undefined,
  days = 7,
): Promise<DayForecast[]> {
  const latitude = lat ?? DEFAULT_COORDS.lat;
  const longitude = lng ?? DEFAULT_COORDS.lng;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&daily=weathercode,precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min` +
    `&timezone=Asia%2FHo_Chi_Minh&forecast_days=${days}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h — dự báo không đổi liên tục
    if (!res.ok) return [];
    const data = await res.json();
    const daily = data?.daily;
    if (!daily?.time) return [];

    return daily.time.map((date: string, i: number) => {
      const { label, icon, isRisky } = mapWeatherCode(daily.weathercode[i]);
      return {
        date,
        label,
        icon,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        rainProbability: daily.precipitation_probability_max[i] ?? 0,
        rainMm: daily.precipitation_sum[i] ?? 0,
        isRisky,
      };
    });
  } catch {
    return [];
  }
}

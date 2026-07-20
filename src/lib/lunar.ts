/**
 * Lịch âm + phong thủy từng ngày (Can Chi, ngày Hoàng Đạo/Hắc Đạo) — thuần tính toán, không I/O,
 * dùng được cả server lẫn client. Port trực tiếp từ thuật toán Hồ Ngọc Đức (dựa trên "Astronomical
 * Algorithms" — Jean Meeus, 1998), bản gốc: http://www.informatik.uni-leipzig.de/~duc/amlich —
 * đã đọc source thật (qua npm package solar-lunar-converter, MIT, credit Ho Ngoc Duc 2006) để chép
 * đúng công thức, KHÔNG cài package đó vì nó có lỗi tự lấy múi giờ máy chủ thay vì dùng tham số
 * truyền vào — ở đây cố định timeZone = 7 (giờ Việt Nam) cho đúng bất kể server chạy múi giờ nào.
 */

const TIME_ZONE = 7;

function INT(d: number): number {
  return Math.floor(d);
}

/** Số ngày Julian của dd/mm/yyyy dương lịch — công thức từ tondering.dk/claus/calendar.html */
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

/** Thời điểm trăng mới thứ k sau trăng mới 1/1/1900 — trả về số ngày Julian dạng thập phân */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return Jd1 + C1 - deltat;
}

/** Kinh độ mặt trời (radian, 0-2π) tại thời điểm jdn (số ngày Julian) */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * INT(L / (Math.PI * 2));
  return L;
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  return INT((sunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return INT(newMoon(k) + 0.5 + timeZone / 24);
}

/** Ngày bắt đầu tháng 11 âm lịch của năm yy (mốc neo để suy ra các tháng còn lại) */
function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = getSunLongitude(getNewMoonDay(k + 1, timeZone), timeZone);
  let i = 1;
  let arc = last;
  do {
    i++;
    last = arc;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export type LunarDate = { day: number; month: number; year: number; isLeapMonth: boolean };

/** Chuyển ngày dương lịch (dd/mm/yyyy) sang âm lịch */
export function convertSolar2Lunar(dd: number, mm: number, yy: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, TIME_ZONE);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, TIME_ZONE);

  let a11 = getLunarMonth11(yy, TIME_ZONE);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, TIME_ZONE);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, TIME_ZONE);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let isLeapMonth = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, TIME_ZONE);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) isLeapMonth = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeapMonth };
}

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

/** Can Chi của ngày, theo số ngày Julian — hằng số (+9)/(+1) chuẩn đi kèm thuật toán Hồ Ngọc Đức */
export function getDayCanChi(jd: number): { can: string; chi: string; label: string } {
  const can = CAN[(jd + 9) % 10];
  const chi = CHI[(jd + 1) % 12];
  return { can, chi, label: `${can} ${chi}` };
}

/** Can Chi của năm âm lịch — đã kiểm chứng chéo: năm 2026 -> "Bính Ngọ", khớp thực tế */
export function getYearCanChi(lunarYear: number): { can: string; chi: string; label: string } {
  const can = CAN[(lunarYear + 6) % 10];
  const chi = CHI[(lunarYear + 8) % 12];
  return { can, chi, label: `${can} ${chi}` };
}

/**
 * Ngày Hoàng Đạo theo tháng (hệ Lục Diệu) — bảng gốc lấy nguyên văn, đã tự kiểm chứng nội bộ: mỗi
 * tháng kế tiếp lệch đúng +2 vị trí Chi một cách nhất quán qua cả 6 dòng (cấp số cộng, không lỗi).
 * Index 0 = tháng 1 & 7, index 1 = tháng 2 & 8, ... index 5 = tháng 6 & 12.
 */
const GOOD_CHI_BY_MONTH_PAIR: string[][] = [
  ["Tý", "Sửu", "Thìn", "Tỵ", "Mùi", "Tuất"], // tháng 1, 7
  ["Dần", "Mão", "Ngọ", "Mùi", "Dậu", "Tý"], // tháng 2, 8
  ["Thìn", "Tỵ", "Thân", "Dậu", "Hợi", "Dần"], // tháng 3, 9
  ["Ngọ", "Mùi", "Tuất", "Hợi", "Sửu", "Thìn"], // tháng 4, 10
  ["Thân", "Dậu", "Tý", "Sửu", "Mão", "Ngọ"], // tháng 5, 11
  ["Tuất", "Hợi", "Dần", "Mão", "Tỵ", "Thân"], // tháng 6, 12
];

/** Ngày Hoàng Đạo (tốt) hay Hắc Đạo (xấu) trong tháng — dựa Chi của ngày + tháng âm lịch */
export function isHoangDaoDay(lunarMonth: number, dayChi: string): boolean {
  const pairIndex = (lunarMonth - 1) % 6;
  return GOOD_CHI_BY_MONTH_PAIR[pairIndex].includes(dayChi);
}

export type DayInfo = {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  dayCanChi: string;
  yearCanChi: string;
  isHoangDao: boolean;
};

/** Hàm tổng hợp duy nhất — các nơi khác chỉ cần gọi hàm này với 1 ngày dương lịch bất kỳ */
export function getDayInfo(date: Date): DayInfo {
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  const yy = date.getFullYear();
  const lunar = convertSolar2Lunar(dd, mm, yy);
  const jd = jdFromDate(dd, mm, yy);
  const { label: dayCanChi, chi: dayChi } = getDayCanChi(jd);
  const { label: yearCanChi } = getYearCanChi(lunar.year);
  return {
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    isLeapMonth: lunar.isLeapMonth,
    dayCanChi,
    yearCanChi,
    isHoangDao: isHoangDaoDay(lunar.month, dayChi),
  };
}

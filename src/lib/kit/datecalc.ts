/** Calendar math on plain year/month/day integers, so time zones and DST never get involved. */

export type Ymd = { y: number; m: number; d: number };

export const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

/** Days since 1970-01-01 in the proleptic Gregorian calendar (Hinnant's days_from_civil). */
export function toDayNumber({ y, m, d }: Ymd): number {
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yoe = year - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(days: number): Ymd {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
}

export function parseYmd(text: string): Ymd | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function formatYmd({ y, m, d }: Ymd): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function formatChinese({ y, m, d }: Ymd): string {
  return `${y} 年 ${m} 月 ${d} 日`;
}

/** Today's date in Beijing (Asia/Shanghai), whatever the device's own time zone is. */
export function beijingToday(now: Date = new Date()): Ymd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function compareYmd(a: Ymd, b: Ymd): number {
  return toDayNumber(a) - toDayNumber(b);
}

export function daysBetween(from: Ymd, to: Ymd): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday. */
export function weekday(date: Ymd): number {
  return (((toDayNumber(date) + 4) % 7) + 7) % 7;
}

export function dayOfYear(date: Ymd): number {
  return daysBetween({ y: date.y, m: 1, d: 1 }, date) + 1;
}

export function addDays(date: Ymd, days: number): Ymd {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Adds calendar months, clamping to the month's last day (1-31 + 1 个月 = 2-28 or 2-29). */
export function addMonths(date: Ymd, months: number): Ymd {
  const index = date.y * 12 + (date.m - 1) + months;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

export function addYears(date: Ymd, years: number): Ymd {
  return addMonths(date, years * 12);
}

export type ShiftUnit = "day" | "week" | "month" | "year";

export function shiftDate(date: Ymd, amount: number, unit: ShiftUnit): Ymd {
  if (unit === "week") return addDays(date, amount * 7);
  if (unit === "month") return addMonths(date, amount);
  if (unit === "year") return addYears(date, amount);
  return addDays(date, amount);
}

/** Mon–Fri days in the half-open range [from, to). */
export function countWorkdays(from: Ymd, to: Ymd): number {
  const start = toDayNumber(from);
  const total = toDayNumber(to) - start;
  if (total <= 0) return 0;
  const fullWeeks = Math.floor(total / 7);
  let count = fullWeeks * 5;
  const first = weekday(from);
  for (let offset = 0; offset < total - fullWeeks * 7; offset++) {
    const day = (first + offset) % 7;
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Whole calendar months from `from` to `to` (to >= from), then the leftover days. */
export function monthsAndDays(from: Ymd, to: Ymd): { months: number; days: number } {
  let months = (to.y - from.y) * 12 + (to.m - from.m);
  if (compareYmd(addMonths(from, months), to) > 0) months--;
  return { months, days: daysBetween(addMonths(from, months), to) };
}

export type DateDiff = {
  /** Signed: negative when the end is earlier than the start. */
  days: number;
  weeks: number;
  weekDays: number;
  months: number;
  monthDays: number;
  workdays: number;
};

export function diffDates(start: Ymd, end: Ymd, inclusive: boolean): DateDiff {
  const earlier = compareYmd(end, start) < 0;
  const low = earlier ? end : start;
  const high = inclusive ? addDays(earlier ? start : end, 1) : earlier ? start : end;
  const span = daysBetween(low, high);
  const { months, days } = monthsAndDays(low, high);
  return {
    days: earlier ? -span : span,
    weeks: Math.floor(span / 7),
    weekDays: span % 7,
    months,
    monthDays: days,
    workdays: countWorkdays(low, high),
  };
}

export type Festival = { name: string; m: number; d: number };

export const FESTIVALS: Festival[] = [
  { name: "元旦", m: 1, d: 1 },
  { name: "情人节", m: 2, d: 14 },
  { name: "劳动节", m: 5, d: 1 },
  { name: "儿童节", m: 6, d: 1 },
  { name: "夏至", m: 6, d: 21 },
  { name: "国庆节", m: 10, d: 1 },
  { name: "圣诞节", m: 12, d: 25 },
];

/** The next time a fixed month/day comes round, counting today itself. */
export function nextOccurrence(m: number, d: number, today: Ymd): Ymd {
  const thisYear = { y: today.y, m, d: Math.min(d, daysInMonth(today.y, m)) };
  if (compareYmd(thisYear, today) >= 0) return thisYear;
  return { y: today.y + 1, m, d: Math.min(d, daysInMonth(today.y + 1, m)) };
}

export function upcomingFestivals(today: Ymd): (Festival & { date: Ymd; daysLeft: number })[] {
  return FESTIVALS.map((festival) => {
    const date = nextOccurrence(festival.m, festival.d, today);
    return { ...festival, date, daysLeft: daysBetween(today, date) };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
}

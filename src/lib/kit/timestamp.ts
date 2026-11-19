/** Unix timestamp <-> Beijing time. Beijing is a fixed UTC+8 with no DST, so all maths uses explicit offsets. */

export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** ECMAScript Date range: ±100,000,000 days around 1970. */
const MAX_MS = 8.64e15;

export type TsUnit = "s" | "ms" | "us" | "ns";

export const UNIT_LABELS: Record<TsUnit, string> = { s: "秒", ms: "毫秒", us: "微秒", ns: "纳秒" };

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/** Guess the unit from the number of integer digits: 10 = 秒, 13 = 毫秒, 16 = 微秒, 19 = 纳秒. */
export function detectUnit(integerDigits: number): TsUnit | null {
  if (integerDigits <= 11) return "s";
  if (integerDigits <= 14) return "ms";
  if (integerDigits <= 17) return "us";
  if (integerDigits <= 19) return "ns";
  return null;
}

export type ParsedTimestamp =
  | { ok: true; ms: number; unit: TsUnit; digits: number }
  | { ok: false; error: string };

/** Parses a timestamp string into epoch milliseconds (sub-millisecond precision is truncated). */
export function parseTimestamp(
  input: string,
  force: "auto" | TsUnit = "auto",
): ParsedTimestamp | null {
  const cleaned = input.replace(/[\s,_]/g, "");
  if (!cleaned) return null;
  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return { ok: false, error: "时间戳只能包含数字（可以带负号和小数点）" };
  const [, sign, rawInteger, fraction = ""] = match;
  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const digits = integer.length;
  const unit = force === "auto" ? detectUnit(digits) : force;
  if (!unit) return { ok: false, error: `有 ${digits} 位，位数太多，认不出是什么单位` };

  let ms: number;
  if (unit === "s") ms = Number(integer) * 1000 + Number(fraction.slice(0, 3).padEnd(3, "0"));
  else if (unit === "ms") ms = Number(integer);
  else if (unit === "us") ms = Number(integer.slice(0, -3) || "0");
  else ms = Number(integer.slice(0, -6) || "0");
  if (sign === "-") ms = -ms;

  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS - DAY_MS) {
    return { ok: false, error: "超出可以表示的时间范围（大约公元前 27 万年到公元 27 万年）" };
  }
  return { ok: true, ms: ms === 0 ? 0 : ms, unit, digits };
}

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  weekday: number;
};

function partsAt(ms: number, offsetMs: number): Parts {
  const date = new Date(ms + offsetMs);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
    weekday: date.getUTCDay(),
  };
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

function formatYear(year: number): string {
  return year < 0 ? `-${pad(-year, 6)}` : pad(year, 4);
}

function formatParts(parts: Parts): string {
  return `${formatYear(parts.year)}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

/** "2026-11-19 15:30:00" in Beijing time. */
export function beijingDateTime(ms: number): string {
  return formatParts(partsAt(ms, BEIJING_OFFSET_MS));
}

/** "2026-11-19 15:30:00 星期四" in Beijing time. */
export function beijingWithWeekday(ms: number): string {
  const parts = partsAt(ms, BEIJING_OFFSET_MS);
  return `${formatParts(parts)} 星期${WEEKDAYS[parts.weekday]}`;
}

/** "2026-11-19 07:30:00" in UTC. */
export function utcDateTime(ms: number): string {
  return formatParts(partsAt(ms, 0));
}

/** "2026-11-19T15:30:00+08:00" (milliseconds only when non-zero). */
export function isoBeijing(ms: number): string {
  const parts = partsAt(ms, BEIJING_OFFSET_MS);
  const fraction = parts.millisecond ? `.${pad(parts.millisecond, 3)}` : "";
  return `${formatParts(parts).replace(" ", "T")}${fraction}+08:00`;
}

/** Value for <input type="datetime-local" step="1">, in Beijing time; "" when the year can't be shown. */
export function toDatetimeLocal(ms: number): string {
  const parts = partsAt(ms, BEIJING_OFFSET_MS);
  if (parts.year < 0 || parts.year > 9999) return "";
  return formatParts(parts).replace(" ", "T");
}

/** "3 天前" / "2 小时后" / "就是现在". */
export function relativeTime(ms: number, nowMs: number): string {
  const diff = ms - nowMs;
  const abs = Math.abs(diff);
  if (abs < 1000) return "就是现在";
  const suffix = diff < 0 ? "前" : "后";
  const seconds = Math.floor(abs / 1000);
  if (seconds < 60) return `${seconds} 秒${suffix}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟${suffix}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天${suffix}`;
  if (days < 365) return `${Math.floor(days / 30)} 个月${suffix}`;
  return `${Math.floor(days / 365)} 年${suffix}`;
}

/** Midnight UTC of a calendar date; avoids Date.UTC's 0–99 → 1900s year mapping. */
function utcMidnight(year: number, monthIndex: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  return date.getTime();
}

/** 1-based day of the year for the Beijing calendar date. */
export function dayOfYear(ms: number): number {
  const { year, month, day } = partsAt(ms, BEIJING_OFFSET_MS);
  return Math.round((utcMidnight(year, month - 1, day) - utcMidnight(year, 0, 1)) / DAY_MS) + 1;
}

/** ISO 8601 week (weeks start on Monday; week 1 contains the year's first Thursday), Beijing calendar. */
export function isoWeek(ms: number): { year: number; week: number } {
  const { year, month, day } = partsAt(ms, BEIJING_OFFSET_MS);
  const date = utcMidnight(year, month - 1, day);
  const mondayBased = (new Date(date).getUTCDay() + 6) % 7;
  const thursday = date + (3 - mondayBased) * DAY_MS;
  const weekYear = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - utcMidnight(weekYear, 0, 1)) / DAY_MS / 7) + 1;
  return { year: weekYear, week };
}

export type ParsedDateTime =
  | { ok: true; ms: number; explicitOffset: boolean }
  | { ok: false; error: string };

const DATE_TIME_RE =
  /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?(?:[.,](\d{1,9}))?)?\s*(Z|(?:UTC|GMT)?\s*[+-]\d{1,2}(?::?\d{2})?|UTC|GMT)?$/i;

function daysInMonth(year: number, month: number): number {
  return Math.round((utcMidnight(year, month, 1) - utcMidnight(year, month - 1, 1)) / DAY_MS);
}

function parseOffset(text: string | undefined): number | null {
  if (!text) return BEIJING_OFFSET_MS;
  const match = /([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(text);
  if (!match) return 0;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 14 || minutes > 59) return null;
  return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes) * 60 * 1000;
}

/**
 * Parses common date-time spellings. Without an explicit offset the time is Beijing time.
 * Accepts 2026-11-19 15:30:00, 2026/11/19 15:30, 2026.11.19, 2026年11月19日 15时30分, ISO strings with Z/±hh:mm.
 */
export function parseDateTime(input: string): ParsedDateTime | null {
  const text = input.trim();
  if (!text) return null;
  const normalized = text
    .replace(/\s*[年月]\s*/g, "-")
    .replace(/\s*[日号]\s*/g, " ")
    .replace(/\s*[时点]\s*/g, ":")
    .replace(/\s*分\s*/g, ":")
    .replace(/\s*秒\s*/g, "")
    .replace(/:+(?=\s|$)/g, "")
    .trim();
  const match = DATE_TIME_RE.exec(normalized);
  if (!match) {
    return { ok: false, error: "认不出这个时间格式，试试 2026-11-19 15:30:00 这样的写法" };
  }
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map((part) => Number(part ?? 0));
  const millisecond = Number((match[7] ?? "").slice(0, 3).padEnd(3, "0"));
  if (month < 1 || month > 12) return { ok: false, error: `没有 ${month} 月` };
  if (day < 1 || day > daysInMonth(year, month)) {
    return { ok: false, error: `${year} 年 ${month} 月没有 ${day} 日` };
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return { ok: false, error: "时分秒超出范围（时 0–23，分和秒 0–59）" };
  }
  const offset = parseOffset(match[8]);
  if (offset === null) return { ok: false, error: "时区偏移不对，应该像 +08:00 或 -05:00 这样" };
  const ms =
    utcMidnight(year, month - 1, day) +
    ((hour * 60 + minute) * 60 + second) * 1000 +
    millisecond -
    offset;
  return { ok: true, ms, explicitOffset: Boolean(match[8]) };
}

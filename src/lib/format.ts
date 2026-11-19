const BEIJING = "Asia/Shanghai";

export function relativeTime(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** The Beijing calendar day of an instant as YYYY-MM-DD. */
export function beijingDateKey(value: string | number | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BEIJING, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(value),
  );
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** Timeline separator for a Beijing day key: 今天, 昨天, 11月17日 周一, or 2025年3月2日 周日 in earlier years. */
export function dayLabel(key: string, now = Date.now()): string {
  const today = beijingDateKey(now);
  if (key === today) return "今天";
  if (key === beijingDateKey(now - 86_400_000)) return "昨天";
  const [year, month, day] = key.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const prefix = String(year) === today.slice(0, 4) ? "" : `${year}年`;
  return `${prefix}${month}月${day}日 ${weekday}`;
}

export function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function formatPrice(price: number | null): string {
  if (price === null) return "价格待定";
  return `¥${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

export function daysLeft(iso: string | null, now = Date.now()): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
}

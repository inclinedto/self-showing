/**
 * 金额大写：按字符串解析金额（不经过浮点数），四舍五入到分，
 * 再按《支付结算办法》的写法转换成人民币大写。
 */

export type Amount = {
  negative: boolean;
  /** Integer part without leading zeros ("0" for zero). */
  integer: string;
  /** Exactly two digits: 角 and 分. */
  fraction: string;
  /** True when digits beyond 分 changed the value and were rounded away. */
  rounded: boolean;
};

export type ParseResult =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ok"; amount: Amount };

export const MAX_INTEGER_DIGITS = 16;

const AMOUNT = /^([+-]?)[¥￥]?([+-]?)(\d*)(?:\.(\d*))?元?$/;

function normalize(input: string): string {
  return input
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, ".")
    .replace(/[－—−]/g, "-")
    .replace(/＋/g, "+")
    .replace(/[\s,，]/g, "")
    .replace(/^(?:人民币|RMB|CNY)/i, "");
}

/** Adds one to a string of decimal digits, e.g. "0999" → "1000", "99" → "100". */
function increment(digits: string): string {
  const chars = digits.split("");
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== "9") {
      chars[i] = String(Number(chars[i]) + 1);
      return chars.join("");
    }
    chars[i] = "0";
  }
  return `1${chars.join("")}`;
}

export function parseAmount(input: string): ParseResult {
  const text = normalize(input);
  if (!text) return { kind: "empty" };
  const match = AMOUNT.exec(text);
  if (!match || (match[1] && match[2]) || (!match[3] && !match[4])) {
    return { kind: "error", message: "请输入有效的金额，例如 12345.67、¥1,000 或 -8.5" };
  }
  const sign = match[1] || match[2];
  let integer = match[3].replace(/^0+/, "") || "0";
  let fraction = match[4] ?? "";
  let rounded = false;

  if (fraction.length > 2) {
    const rest = fraction.slice(2);
    rounded = /[1-9]/.test(rest);
    fraction = fraction.slice(0, 2);
    if (rest[0] >= "5") {
      const sum = increment(integer + fraction);
      integer = sum.slice(0, -2).replace(/^0+/, "") || "0";
      fraction = sum.slice(-2);
    }
  }
  fraction = fraction.padEnd(2, "0");

  if (integer.length > MAX_INTEGER_DIGITS) {
    return {
      kind: "error",
      message: `整数部分最多支持 ${MAX_INTEGER_DIGITS} 位（到万亿），现在有 ${integer.length} 位`,
    };
  }
  const zero = integer === "0" && fraction === "00";
  return { kind: "ok", amount: { negative: sign === "-" && !zero, integer, fraction, rounded } };
}

const UPPER_DIGITS = "零壹贰叁肆伍陆柒捌玖";
const UPPER_UNITS = ["仟", "佰", "拾", ""];
const LOWER_DIGITS = "零一二三四五六七八九";
const LOWER_UNITS = ["千", "百", "十", ""];

/**
 * Reads an integer in groups of four digits (个、万、亿、万亿).
 * Any run of zeros followed by a non-zero digit becomes a single 零.
 */
function readInteger(integer: string, digits: string, units: string[]): string {
  if (/^0*$/.test(integer)) return digits[0];
  const padded = integer.padStart(Math.ceil(integer.length / 4) * 4, "0");
  const groups = padded.length / 4;
  let out = "";
  let pendingZero = false;
  for (let g = 0; g < groups; g++) {
    const level = groups - 1 - g;
    let groupHasDigit = false;
    for (let p = 0; p < 4; p++) {
      const digit = padded.charCodeAt(g * 4 + p) - 48;
      if (digit === 0) {
        if (out) pendingZero = true;
        continue;
      }
      if (pendingZero) out += digits[0];
      pendingZero = false;
      out += digits[digit] + units[p];
      groupHasDigit = true;
    }
    if ((level === 1 || level === 3) && groupHasDigit) out += "万";
    if (level === 2 && out) out += "亿";
  }
  return out;
}

/** 人民币大写，例如 1000000.05 → 壹佰万元零伍分。 */
export function toRmbUpper(amount: Amount): string {
  const jiao = Number(amount.fraction[0]);
  const fen = Number(amount.fraction[1]);
  const hasInteger = amount.integer !== "0";
  let out = hasInteger ? `${readInteger(amount.integer, UPPER_DIGITS, UPPER_UNITS)}元` : "";
  if (!jiao && !fen) {
    out = `${out || "零元"}整`;
  } else {
    if (jiao) out += `${UPPER_DIGITS[jiao]}角`;
    else if (hasInteger) out += "零";
    if (fen) out += `${UPPER_DIGITS[fen]}分`;
  }
  return (amount.negative ? "负" : "") + out;
}

/** 中文小写，例如 12345.67 → 一万二千三百四十五点六七，12 → 十二。 */
export function toChineseLower(amount: Amount): string {
  let integer = readInteger(amount.integer, LOWER_DIGITS, LOWER_UNITS);
  if (integer.startsWith("一十")) integer = integer.slice(1);
  const fraction = amount.fraction.replace(/0+$/, "");
  const decimals = Array.from(fraction, (digit) => LOWER_DIGITS[Number(digit)]).join("");
  return (amount.negative ? "负" : "") + integer + (decimals ? `点${decimals}` : "");
}

/** 千分位，例如 12,345.67。 */
export function toThousands(amount: Amount): string {
  const integer = amount.integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount.negative ? "-" : ""}${integer}.${amount.fraction}`;
}

/** 两位小数的规范金额，例如 12345.60。 */
export function toPlain(amount: Amount): string {
  return `${amount.negative ? "-" : ""}${amount.integer}.${amount.fraction}`;
}

/** Convenience for tests and simple callers: uppercase text or the error message. */
export function daxie(input: string): string {
  const result = parseAmount(input);
  if (result.kind === "ok") return toRmbUpper(result.amount);
  return result.kind === "error" ? result.message : "";
}

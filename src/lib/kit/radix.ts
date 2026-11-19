/** Base conversion for arbitrarily large integers (BigInt). */

export type ParsedInteger =
  | { ok: true; value: bigint; base: number; prefixBase?: number }
  | { ok: false; error: string };

export const MAX_INPUT_DIGITS = 20000;

const BASE_NAMES: Record<number, string> = {
  2: "二进制",
  8: "八进制",
  10: "十进制",
  16: "十六进制",
  32: "三十二进制",
  36: "三十六进制",
};

const PREFIXES: Record<string, number> = { b: 2, o: 8, x: 16 };
const IGNORED = /[\s_,，]/;

export function baseName(base: number): string {
  return BASE_NAMES[base] ?? `${base} 进制`;
}

export function isValidBase(base: number): boolean {
  return Number.isInteger(base) && base >= 2 && base <= 36;
}

/** 0–35 for 0-9 / a-z (case-insensitive), -1 for anything else. */
export function digitValue(char: string): number {
  const code = char.toLowerCase().charCodeAt(0);
  if (char.length !== 1) return -1;
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 122) return code - 87;
  return -1;
}

/** Human description of the digits a base allows, e.g. "0-9、a-f". */
export function allowedDigits(base: number): string {
  if (base <= 10) return `0-${base - 1}`;
  const last = String.fromCharCode(86 + base);
  return base === 11 ? "0-9 和 a" : `0-9、a-${last}`;
}

/** Horner's method in chunks that fit a double exactly, so long inputs stay fast. */
function parseChunked(digits: string, base: number): bigint {
  const size = Math.floor(53 / Math.log2(base));
  const step = BigInt(base) ** BigInt(size);
  const first = digits.length % size || size;
  let value = BigInt(Number.parseInt(digits.slice(0, first), base));
  for (let at = first; at < digits.length; at += size) {
    value = value * step + BigInt(Number.parseInt(digits.slice(at, at + size), base));
  }
  return value;
}

/**
 * Parses an integer written in `base`. Spaces, underscores and commas are ignored; a leading +/- and
 * 0b/0o/0x prefixes are accepted. A prefix that can't be digits of `base` switches to the prefix's base.
 * Returns null for empty input.
 */
export function parseInteger(input: string, base: number): ParsedInteger | null {
  if (!isValidBase(base)) return { ok: false, error: "进制必须是 2 到 36 之间的整数" };
  const chars: { char: string; position: number }[] = [];
  Array.from(input).forEach((char, index) => {
    if (!IGNORED.test(char)) chars.push({ char, position: index + 1 });
  });
  if (chars.length === 0) return null;

  let start = 0;
  let negative = false;
  if (chars[0].char === "-" || chars[0].char === "+") {
    negative = chars[0].char === "-";
    start = 1;
  }

  let effectiveBase = base;
  let prefixBase: number | undefined;
  if (chars.length - start >= 2 && chars[start].char === "0") {
    const letter = chars[start + 1].char;
    const prefix = PREFIXES[letter.toLowerCase()];
    if (prefix !== undefined && (prefix === base || digitValue(letter) >= base)) {
      effectiveBase = prefix;
      if (prefix !== base) prefixBase = prefix;
      start += 2;
    }
  }

  const digits = chars.slice(start);
  if (digits.length === 0) return { ok: false, error: "只有符号或前缀，后面还要跟数字" };
  if (digits.length > MAX_INPUT_DIGITS) {
    return { ok: false, error: `数字太长了，最多支持 ${MAX_INPUT_DIGITS} 位` };
  }
  const name = baseName(effectiveBase);
  for (const { char, position } of digits) {
    const value = digitValue(char);
    if (value >= 0 && value < effectiveBase) continue;
    if (char === ".") return { ok: false, error: `第 ${position} 个字符是小数点，目前只支持整数` };
    if (char === "-" || char === "+") {
      return { ok: false, error: `第 ${position} 个字符“${char}”位置不对，正负号只能写在最前面` };
    }
    return {
      ok: false,
      error: `第 ${position} 个字符“${char}”不是合法的${name}数字（${name}只能用 ${allowedDigits(effectiveBase)}）`,
    };
  }

  const text = digits
    .map((digit) => digit.char)
    .join("")
    .toLowerCase();
  let value: bigint;
  if (effectiveBase === 10) value = BigInt(text);
  else if (effectiveBase === 16) value = BigInt(`0x${text}`);
  else if (effectiveBase === 8) value = BigInt(`0o${text}`);
  else if (effectiveBase === 2) value = BigInt(`0b${text}`);
  else value = parseChunked(text, effectiveBase);
  return { ok: true, value: negative ? -value : value, base: effectiveBase, prefixBase };
}

export function toBase(value: bigint, base: number, upper = false): string {
  const text = value.toString(base);
  return upper ? text.toUpperCase() : text;
}

/** Groups digits from the right, e.g. ("1234567", 3, ",") → "1,234,567". Keeps a leading minus. */
export function groupDigits(
  digits: string,
  size: number,
  separator: string,
  padGroups = false,
): string {
  const negative = digits.startsWith("-");
  let body = negative ? digits.slice(1) : digits;
  if (padGroups && body.length % size)
    body = body.padStart(body.length + size - (body.length % size), "0");
  const groups: string[] = [];
  for (let end = body.length; end > 0; end -= size)
    groups.push(body.slice(Math.max(0, end - size), end));
  return (negative ? "-" : "") + groups.reverse().join(separator);
}

/** Number of bits needed for the magnitude (0 for zero). */
export function bitLength(value: bigint): number {
  const zero = BigInt(0);
  const magnitude = value < zero ? -value : value;
  return magnitude === zero ? 0 : magnitude.toString(2).length;
}

const pow2 = (bits: number) => BigInt(2) ** BigInt(bits);

/** Which common integer types can hold the value, plus a JavaScript Number precision warning. */
export function rangeHints(value: bigint): string[] {
  const hints: string[] = [];
  const one = BigInt(1);
  if (value >= BigInt(0)) {
    if (value < pow2(32)) hints.push("在 32 位无符号整数范围内（uint32，0 ~ 4294967295）");
    else if (value < pow2(64)) hints.push("在 64 位无符号整数范围内（uint64，0 ~ 2^64 − 1）");
    else hints.push("超出 64 位整数范围，只能用大数（BigInt）表示");
  } else if (value >= -pow2(31)) {
    hints.push("在 32 位有符号整数范围内（int32，−2^31 ~ 2^31 − 1）");
  } else if (value >= -pow2(63)) {
    hints.push("在 64 位有符号整数范围内（int64，−2^63 ~ 2^63 − 1）");
  } else {
    hints.push("超出 64 位整数范围，只能用大数（BigInt）表示");
  }
  const safe = pow2(53) - one;
  if (value > safe || value < -safe)
    hints.push("超过 2^53 − 1，JavaScript 的普通数字（Number）会丢精度");
  return hints;
}

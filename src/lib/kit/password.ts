/** Password / UUID generation. Randomness is injected so tests can be deterministic. */

/** Returns a uniformly random unsigned 32-bit integer. */
export type RandomUint32 = () => number;

export const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const LOWER = "abcdefghijklmnopqrstuvwxyz";
export const DIGITS = "0123456789";
export const DEFAULT_SYMBOLS = "!@#$%^&*-_=+?";
export const AMBIGUOUS = "0Oo1lI|`'\"";

export type CharsetOptions = {
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  symbolSet: string;
};

const TWO_32 = 2 ** 32;

/** The selected character sets, each de-duplicated, without whitespace and (optionally) look-alikes. */
export function buildCharsets(options: CharsetOptions): string[] {
  const clean = (chars: string) =>
    Array.from(new Set(Array.from(chars)))
      .filter((char) => !/\s/.test(char) && !(options.excludeAmbiguous && AMBIGUOUS.includes(char)))
      .join("");
  const sets: string[] = [];
  if (options.upper) sets.push(clean(UPPER));
  if (options.lower) sets.push(clean(LOWER));
  if (options.digits) sets.push(clean(DIGITS));
  if (options.symbols) sets.push(clean(options.symbolSet));
  return sets.filter((set) => set.length > 0);
}

/** Number of distinct characters across all sets. */
export function charsetSize(sets: string[]): number {
  return new Set(sets.flatMap((set) => Array.from(set))).size;
}

/** Uniform integer in [0, n) via rejection sampling, so there is no modulo bias. */
export function unbiasedIndex(n: number, random: RandomUint32): number {
  if (!Number.isInteger(n) || n <= 0 || n > TWO_32) throw new RangeError(`bad range: ${n}`);
  const limit = TWO_32 - (TWO_32 % n);
  for (;;) {
    const value = random() >>> 0;
    if (value < limit) return value % n;
  }
}

/** In-place Fisher–Yates shuffle using the unbiased index. */
export function shuffle<T>(items: T[], random: RandomUint32): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = unbiasedIndex(i + 1, random);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** A password with at least one character from each set (when length allows), shuffled. */
export function generatePassword(length: number, sets: string[], random: RandomUint32): string {
  const pools = sets.map((set) => Array.from(set)).filter((pool) => pool.length > 0);
  const all = Array.from(new Set(pools.flat()));
  if (all.length === 0 || length <= 0) return "";
  const chars = pools.slice(0, length).map((pool) => pool[unbiasedIndex(pool.length, random)]);
  while (chars.length < length) chars.push(all[unbiasedIndex(all.length, random)]);
  return shuffle(chars, random).join("");
}

export function entropyBits(length: number, size: number): number {
  return size > 1 ? length * Math.log2(size) : 0;
}

export type Strength = { level: 0 | 1 | 2 | 3; label: "弱" | "一般" | "强" | "很强" };

export function strength(bits: number): Strength {
  if (bits < 40) return { level: 0, label: "弱" };
  if (bits < 60) return { level: 1, label: "一般" };
  if (bits < 80) return { level: 2, label: "强" };
  return { level: 3, label: "很强" };
}

/** RFC 4122 version 4 UUID from 16 random bytes. */
export function uuidFromBytes(bytes: Uint8Array): string {
  const b = Uint8Array.from(bytes.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type UuidFormat = { upper: boolean; noHyphens: boolean; braces: boolean };

export function formatUuid(uuid: string, format: UuidFormat): string {
  let text = format.noHyphens ? uuid.replace(/-/g, "") : uuid;
  text = format.upper ? text.toUpperCase() : text.toLowerCase();
  return format.braces ? `{${text}}` : text;
}

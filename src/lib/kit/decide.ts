/** Unbiased random helpers. A RandomSource returns uniformly distributed unsigned 32-bit integers. */

export type RandomSource = () => number;

const TWO_32 = 2 ** 32;
const TWO_53 = 2 ** 53;

export function cryptoSource(): RandomSource {
  const buffer = new Uint32Array(64);
  let index = buffer.length;
  return () => {
    if (index >= buffer.length) {
      crypto.getRandomValues(buffer);
      index = 0;
    }
    return buffer[index++];
  };
}

/** Uniform integer in [0, n) by rejection sampling, so no value is favoured. Supports n up to 2^53. */
export function randomBelow(n: number, source: RandomSource): number {
  if (!Number.isInteger(n) || n < 1 || n > TWO_53) throw new RangeError("n out of range");
  if (n === 1) return 0;
  if (n <= TWO_32) {
    const limit = TWO_32 - (TWO_32 % n);
    for (;;) {
      const value = source();
      if (value < limit) return value % n;
    }
  }
  const limit = TWO_53 - (TWO_53 % n);
  for (;;) {
    const value = (source() & 0x1fffff) * TWO_32 + source();
    if (value < limit) return value % n;
  }
}

export function randomBetween(min: number, max: number, source: RandomSource): number {
  return min + randomBelow(max - min + 1, source);
}

export function flipCoin(source: RandomSource): boolean {
  return randomBelow(2, source) === 0;
}

export function rollDice(count: number, source: RandomSource): number[] {
  return Array.from({ length: count }, () => randomBetween(1, 6, source));
}

/** Picks one option, avoiding `avoid` unless that would leave nothing to pick. */
export function pickOption(
  options: string[],
  avoid: string[],
  source: RandomSource,
): string | undefined {
  if (options.length === 0) return undefined;
  const blocked = new Set(avoid);
  const pool = options.filter((option) => !blocked.has(option));
  const from = pool.length > 0 ? pool : options;
  return from[randomBelow(from.length, source)];
}

export const MAX_OPTIONS = 200;
export const MAX_OPTION_LENGTH = 40;

export function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const option = line.trim().slice(0, MAX_OPTION_LENGTH);
    if (option) seen.add(option);
    if (seen.size >= MAX_OPTIONS) break;
  }
  return [...seen];
}

export const MAX_DRAW = 1000;

export type DrawRequest = { min: string; max: string; count: string; unique: boolean };

export type DrawCheck =
  | { ok: true; min: number; max: number; count: number }
  | { ok: false; error: string };

export function checkDraw({ min, max, count, unique }: DrawRequest): DrawCheck {
  const low = Number(min.trim());
  const high = Number(max.trim());
  const amount = Number(count.trim());
  if (min.trim() === "" || max.trim() === "" || !Number.isInteger(low) || !Number.isInteger(high)) {
    return { ok: false, error: "最小值和最大值都要填整数" };
  }
  if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high)) {
    return { ok: false, error: "数字太大了，换小一点的范围吧" };
  }
  if (low > high) return { ok: false, error: "最小值不能大于最大值" };
  if (high - low + 1 > TWO_53) return { ok: false, error: "范围太大了，换小一点的范围吧" };
  if (count.trim() === "" || !Number.isInteger(amount) || amount < 1) {
    return { ok: false, error: "数量至少是 1" };
  }
  if (amount > MAX_DRAW) return { ok: false, error: `一次最多抽 ${MAX_DRAW} 个` };
  if (unique && amount > high - low + 1) {
    return { ok: false, error: `不重复时最多只能抽 ${high - low + 1} 个（范围里只有这么多数）` };
  }
  return { ok: true, min: low, max: high, count: amount };
}

export function drawNumbers(
  min: number,
  max: number,
  count: number,
  unique: boolean,
  source: RandomSource,
): number[] {
  const size = max - min + 1;
  if (!unique) return Array.from({ length: count }, () => min + randomBelow(size, source));
  if (count * 2 <= size) {
    const picked = new Set<number>();
    while (picked.size < count) picked.add(min + randomBelow(size, source));
    return [...picked];
  }
  // Dense draws: partial Fisher–Yates. Only reached when size < 2 × count ≤ 2000.
  const pool = Array.from({ length: size }, (_, index) => min + index);
  for (let index = 0; index < count; index++) {
    const swap = index + randomBelow(size - index, source);
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, count);
}

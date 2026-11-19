import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AMBIGUOUS,
  buildCharsets,
  charsetSize,
  DEFAULT_SYMBOLS,
  DIGITS,
  entropyBits,
  formatUuid,
  generatePassword,
  LOWER,
  type RandomUint32,
  shuffle,
  strength,
  UPPER,
  unbiasedIndex,
  uuidFromBytes,
} from "../src/lib/kit/password.ts";

/** Deterministic 32-bit PRNG (mulberry32). */
function seeded(seed: number): RandomUint32 {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

function sequence(values: number[]): RandomUint32 & { used: () => number } {
  let index = 0;
  const next = () => values[index++ % values.length];
  return Object.assign(next, { used: () => index });
}

const ALL_ON = {
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  symbolSet: DEFAULT_SYMBOLS,
};

test("unbiasedIndex rejects values from the biased tail", () => {
  // 2^32 % 3 === 1, so 0xFFFFFFFF is the single rejected value for n = 3.
  const random = sequence([0xffffffff, 5]);
  assert.equal(unbiasedIndex(3, random), 2);
  assert.equal(random.used(), 2);
  assert.equal(unbiasedIndex(1, sequence([123])), 0);
  assert.throws(() => unbiasedIndex(0, sequence([1])), RangeError);
  assert.throws(() => unbiasedIndex(2.5, sequence([1])), RangeError);
});

test("unbiasedIndex is roughly uniform", () => {
  const random = seeded(42);
  const counts = new Array(6).fill(0);
  const total = 60000;
  for (let i = 0; i < total; i += 1) counts[unbiasedIndex(6, random)] += 1;
  for (const count of counts)
    assert.ok(Math.abs(count - total / 6) < total / 6 / 20, String(counts));
});

test("buildCharsets honours options and strips look-alikes", () => {
  assert.deepEqual(buildCharsets(ALL_ON), [UPPER, LOWER, DIGITS, DEFAULT_SYMBOLS]);
  const clean = buildCharsets({ ...ALL_ON, excludeAmbiguous: true, symbolSet: "!|`'\"@" });
  for (const set of clean) {
    for (const char of AMBIGUOUS) assert.ok(!set.includes(char), `${char} in ${set}`);
  }
  assert.equal(clean[3], "!@");
  assert.deepEqual(
    buildCharsets({ ...ALL_ON, upper: false, lower: false, digits: false, symbolSet: "a a!!" }),
    ["a!"],
  );
  assert.deepEqual(
    buildCharsets({ ...ALL_ON, upper: false, lower: false, digits: false, symbolSet: "  " }),
    [],
  );
  assert.equal(charsetSize(buildCharsets(ALL_ON)), 26 + 26 + 10 + DEFAULT_SYMBOLS.length);
  assert.equal(charsetSize(["abc", "cde"]), 5);
});

test("generatePassword covers every selected set", () => {
  const random = seeded(7);
  const sets = buildCharsets(ALL_ON);
  const allowed = new Set(sets.join(""));
  for (let i = 0; i < 300; i += 1) {
    const length = 4 + (i % 61);
    const password = generatePassword(length, sets, random);
    assert.equal(Array.from(password).length, length);
    for (const set of sets)
      assert.ok(
        Array.from(set).some((char) => password.includes(char)),
        password,
      );
    for (const char of password) assert.ok(allowed.has(char), char);
  }
  assert.equal(generatePassword(10, [], random), "");
  assert.equal(generatePassword(2, sets, random).length, 2);
});

test("generatePassword is deterministic for a given source", () => {
  const sets = buildCharsets(ALL_ON);
  assert.equal(generatePassword(16, sets, seeded(1)), generatePassword(16, sets, seeded(1)));
  assert.notEqual(generatePassword(16, sets, seeded(1)), generatePassword(16, sets, seeded(2)));
});

test("shuffle returns a permutation", () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  const shuffled = shuffle([...items], seeded(3));
  assert.deepEqual(
    [...shuffled].sort((a, b) => a - b),
    items,
  );
  assert.notDeepEqual(shuffled, items);
});

test("entropy and strength thresholds", () => {
  assert.equal(entropyBits(16, 1), 0);
  assert.equal(entropyBits(8, 2), 8);
  assert.ok(Math.abs(entropyBits(16, 62) - 95.27) < 0.01);
  assert.equal(strength(39.9).label, "弱");
  assert.equal(strength(40).label, "一般");
  assert.equal(strength(60).label, "强");
  assert.equal(strength(80).label, "很强");
});

test("uuidFromBytes sets the version and variant bits", () => {
  const random = seeded(9);
  for (let i = 0; i < 50; i += 1) {
    const bytes = Uint8Array.from({ length: 16 }, () => random() & 0xff);
    const uuid = uuidFromBytes(bytes);
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
  assert.equal(uuidFromBytes(new Uint8Array(16)), "00000000-0000-4000-8000-000000000000");
});

test("formatUuid applies case, hyphens and braces", () => {
  const uuid = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  assert.equal(formatUuid(uuid, { upper: false, noHyphens: false, braces: false }), uuid);
  assert.equal(
    formatUuid(uuid, { upper: true, noHyphens: true, braces: true }),
    "{3F2504E04F8941D39A0C0305E82C3301}",
  );
  assert.equal(
    formatUuid(uuid.toUpperCase(), { upper: false, noHyphens: false, braces: true }),
    `{${uuid}}`,
  );
});

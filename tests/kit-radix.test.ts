import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowedDigits,
  bitLength,
  groupDigits,
  parseInteger,
  rangeHints,
  toBase,
} from "../src/lib/kit/radix.ts";

function parsedValue(input: string, base: number): bigint {
  const parsed = parseInteger(input, base);
  assert.ok(parsed?.ok, `${input} (base ${base}) should parse`);
  return parsed.value;
}

function errorOf(input: string, base: number): string {
  const parsed = parseInteger(input, base);
  assert.ok(parsed && !parsed.ok, `${input} (base ${base}) should fail`);
  return parsed.error;
}

test("parses the usual bases", () => {
  assert.equal(parsedValue("255", 10), BigInt(255));
  assert.equal(parsedValue("ff", 16), BigInt(255));
  assert.equal(parsedValue("FF", 16), BigInt(255));
  assert.equal(parsedValue("11111111", 2), BigInt(255));
  assert.equal(parsedValue("377", 8), BigInt(255));
  assert.equal(parsedValue("7v", 32), BigInt(255));
  assert.equal(parsedValue("73", 36), BigInt(255));
  assert.equal(parsedValue("513", 7), BigInt(255));
  assert.equal(parsedValue("0", 10), BigInt(0));
});

test("round-trips through every base", () => {
  const samples = [
    "0",
    "1",
    "35",
    "36",
    "255",
    "65535",
    "123456789012345678901234567890",
    "-987654321",
  ];
  for (const sample of samples) {
    const value = BigInt(sample);
    for (let base = 2; base <= 36; base += 1) {
      assert.equal(parsedValue(toBase(value, base), base), value, `${sample} in base ${base}`);
      assert.equal(
        parsedValue(toBase(value, base, true), base),
        value,
        `${sample} upper in base ${base}`,
      );
    }
  }
});

test("ignores separators and accepts signs", () => {
  assert.equal(parsedValue("1,000,000", 10), BigInt(1000000));
  assert.equal(parsedValue("1_000 000", 10), BigInt(1000000));
  assert.equal(parsedValue("1111 0000", 2), BigInt(240));
  assert.equal(parsedValue("-ff", 16), BigInt(-255));
  assert.equal(parsedValue("+42", 10), BigInt(42));
  assert.equal(parsedValue("-0", 10), BigInt(0));
});

test("handles 0b / 0o / 0x prefixes", () => {
  assert.equal(parsedValue("0x1F", 16), BigInt(31));
  assert.equal(parsedValue("0b1010", 2), BigInt(10));
  assert.equal(parsedValue("0o17", 8), BigInt(15));
  assert.equal(parsedValue("-0xff", 16), BigInt(-255));

  const switched = parseInteger("0xff", 10);
  assert.ok(switched?.ok);
  assert.equal(switched.value, BigInt(255));
  assert.equal(switched.base, 16);
  assert.equal(switched.prefixBase, 16);
  assert.equal(parsedValue("0b101", 10), BigInt(5));
  assert.equal(parsedValue("0x10", 8), BigInt(16));

  // "b" is a valid hex digit and "x" a valid base-36 digit, so these are plain digits.
  assert.equal(parsedValue("0b1", 16), BigInt(0xb1));
  assert.equal(parsedValue("0x1", 36), BigInt(33 * 36 + 1));
});

test("reports bad characters with their position", () => {
  assert.match(errorOf("12a4", 10), /第 3 个字符“a”不是合法的十进制数字/);
  assert.match(errorOf("102", 2), /第 3 个字符“2”.*二进制只能用 0-1/);
  assert.match(errorOf("ffg", 16), /“g”.*0-9、a-f/);
  assert.match(errorOf("1 2 x", 10), /第 5 个字符“x”/);
  assert.match(errorOf("3.14", 10), /小数点/);
  assert.match(errorOf("12-3", 10), /正负号只能写在最前面/);
  assert.match(errorOf("0x", 10), /后面还要跟数字/);
  assert.match(errorOf("-", 10), /后面还要跟数字/);
  assert.match(errorOf("12", 1), /2 到 36/);
  assert.match(errorOf("12", 37), /2 到 36/);
  assert.match(errorOf("12", 2.5), /2 到 36/);
  assert.equal(parseInteger("", 10), null);
  assert.equal(parseInteger(" _, ", 10), null);
});

test("works far beyond 2^64", () => {
  const big = BigInt(2) ** BigInt(200) + BigInt(12345);
  assert.equal(parsedValue(big.toString(), 10), big);
  assert.equal(parsedValue(big.toString(36), 36), big);
  assert.equal(parsedValue(big.toString(7), 7), big);
  assert.equal(parsedValue("18446744073709551616", 10), BigInt(2) ** BigInt(64));
  assert.equal(toBase(BigInt(2) ** BigInt(64), 16), "10000000000000000");
  assert.equal(parsedValue("9".repeat(5000), 10), BigInt(10) ** BigInt(5000) - BigInt(1));
  assert.match(errorOf("1".repeat(20001), 10), /最多支持/);
});

test("formats groups, bit lengths and range hints", () => {
  assert.equal(groupDigits("1234567", 3, ","), "1,234,567");
  assert.equal(groupDigits("-1234567", 3, ","), "-1,234,567");
  assert.equal(groupDigits("123", 3, ","), "123");
  assert.equal(groupDigits("101101", 4, " ", true), "0010 1101");
  assert.equal(groupDigits("11110000", 4, " ", true), "1111 0000");
  assert.equal(bitLength(BigInt(0)), 0);
  assert.equal(bitLength(BigInt(255)), 8);
  assert.equal(bitLength(BigInt(256)), 9);
  assert.equal(bitLength(BigInt(-255)), 8);
  assert.match(rangeHints(BigInt(4294967295))[0], /uint32/);
  assert.match(rangeHints(BigInt(4294967296))[0], /uint64/);
  assert.match(rangeHints(BigInt(2) ** BigInt(64))[0], /超出 64 位/);
  assert.match(rangeHints(BigInt(-1))[0], /int32/);
  assert.match(rangeHints(-(BigInt(2) ** BigInt(40)))[0], /int64/);
  assert.equal(rangeHints(BigInt(2) ** BigInt(53)).length, 2);
  assert.equal(rangeHints(BigInt(2) ** BigInt(53) - BigInt(1)).length, 1);
  assert.equal(allowedDigits(16), "0-9、a-f");
  assert.equal(allowedDigits(36), "0-9、a-z");
  assert.equal(allowedDigits(11), "0-9 和 a");
  assert.equal(allowedDigits(8), "0-7");
});

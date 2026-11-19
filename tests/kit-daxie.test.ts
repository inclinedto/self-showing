import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Amount,
  daxie,
  parseAmount,
  toChineseLower,
  toPlain,
  toRmbUpper,
  toThousands,
} from "../src/lib/kit/daxie.ts";

function amount(input: string): Amount {
  const result = parseAmount(input);
  assert.equal(result.kind, "ok", input);
  if (result.kind !== "ok") throw new Error("unreachable");
  return result.amount;
}

test("RMB uppercase: examples from the spec", () => {
  const cases: [string, string][] = [
    ["1005", "壹仟零伍元整"],
    ["10005", "壹万零伍元整"],
    ["100000", "壹拾万元整"],
    ["1000000.05", "壹佰万元零伍分"],
    ["0.5", "伍角"],
    ["0.05", "伍分"],
    ["0", "零元整"],
    ["10", "壹拾元整"],
    ["110", "壹佰壹拾元整"],
    ["1010.1", "壹仟零壹拾元壹角"],
    ["100000000", "壹亿元整"],
    ["100010000", "壹亿零壹万元整"],
    ["1.01", "壹元零壹分"],
    ["-12.3", "负壹拾贰元叁角"],
  ];
  for (const [input, expected] of cases) assert.equal(daxie(input), expected, input);
});

test("RMB uppercase: more zero handling and units", () => {
  const cases: [string, string][] = [
    ["1409.50", "壹仟肆佰零玖元伍角"],
    ["16409.02", "壹万陆仟肆佰零玖元零贰分"],
    ["325.04", "叁佰贰拾伍元零肆分"],
    ["6007.14", "陆仟零柒元壹角肆分"],
    ["1680.32", "壹仟陆佰捌拾元叁角贰分"],
    ["107000.53", "壹拾万零柒仟元伍角叁分"],
    ["100700", "壹拾万零柒佰元整"],
    ["120000000", "壹亿贰仟万元整"],
    ["500001234", "伍亿零壹仟贰佰叁拾肆元整"],
    ["0.55", "伍角伍分"],
    ["1", "壹元整"],
    ["20", "贰拾元整"],
    ["10000000000000", "壹拾万亿元整"],
    ["1000000000000000", "壹仟万亿元整"],
    ["1000000000000001", "壹仟万亿零壹元整"],
    ["1000100000000000", "壹仟万零壹仟亿元整"],
    ["100010000000000", "壹佰万零壹佰亿元整"],
    ["1000100000000", "壹万零壹亿元整"],
    [
      "9999999999999999.99",
      "玖仟玖佰玖拾玖万玖仟玖佰玖拾玖亿玖仟玖佰玖拾玖万玖仟玖佰玖拾玖元玖角玖分",
    ],
  ];
  for (const [input, expected] of cases) assert.equal(daxie(input), expected, input);
});

test("parseAmount accepts commas, spaces, currency marks and full-width digits", () => {
  assert.equal(daxie("¥1,234.5"), "壹仟贰佰叁拾肆元伍角");
  assert.equal(daxie(" 1 234 "), "壹仟贰佰叁拾肆元整");
  assert.equal(daxie("-¥12.30"), "负壹拾贰元叁角");
  assert.equal(daxie("￥-12.30"), "负壹拾贰元叁角");
  assert.equal(daxie("１２３．４５"), "壹佰贰拾叁元肆角伍分");
  assert.equal(daxie("人民币 100元"), "壹佰元整");
  assert.equal(daxie(".5"), "伍角");
  assert.equal(daxie("12."), "壹拾贰元整");
  assert.equal(daxie("000123"), "壹佰贰拾叁元整");
  assert.equal(daxie("-0"), "零元整");
  assert.equal(parseAmount("-0.00").kind === "ok" && amount("-0.00").negative, false);
});

test("parseAmount rounds half-up to 2 decimals without float errors", () => {
  const a = amount("1.005");
  assert.equal(toPlain(a), "1.01");
  assert.equal(a.rounded, true);
  assert.equal(toPlain(amount("0.125")), "0.13");
  assert.equal(toPlain(amount("0.124")), "0.12");
  assert.equal(toPlain(amount("9.995")), "10.00");
  assert.equal(toPlain(amount("99.999")), "100.00");
  assert.equal(toPlain(amount("0.005")), "0.01");
  assert.equal(amount("1.2300").rounded, false);
  assert.equal(amount("1.23").rounded, false);
  assert.equal(toPlain(amount("12345678901234.565")), "12345678901234.57");
});

test("parseAmount rejects invalid and oversized input", () => {
  assert.equal(parseAmount("").kind, "empty");
  assert.equal(parseAmount("   ").kind, "empty");
  for (const input of ["abc", "1.2.3", "--1", "-+1", "1e5", ".", "¥", "12元5", "+-3"]) {
    assert.equal(parseAmount(input).kind, "error", input);
  }
  assert.equal(parseAmount("9999999999999999.99").kind, "ok");
  const tooLong = parseAmount("12345678901234567");
  assert.equal(tooLong.kind, "error");
  assert.match(tooLong.kind === "error" ? tooLong.message : "", /最多支持 16 位/);
  assert.equal(parseAmount("9999999999999999.995").kind, "error");
});

test("Chinese lowercase numbers", () => {
  const cases: [string, string][] = [
    ["12345.67", "一万二千三百四十五点六七"],
    ["10", "十"],
    ["12", "十二"],
    ["110", "一百一十"],
    ["100000", "十万"],
    ["1005", "一千零五"],
    ["0", "零"],
    ["0.5", "零点五"],
    ["12.50", "十二点五"],
    ["-3.05", "负三点零五"],
    ["100010000", "一亿零一万"],
  ];
  for (const [input, expected] of cases)
    assert.equal(toChineseLower(amount(input)), expected, input);
});

test("thousands separators and normalized amount", () => {
  assert.equal(toThousands(amount("12345.67")), "12,345.67");
  assert.equal(toThousands(amount("1234567")), "1,234,567.00");
  assert.equal(toThousands(amount("123")), "123.00");
  assert.equal(toThousands(amount("-1000.5")), "-1,000.50");
  assert.equal(toPlain(amount("¥1,000.5")), "1000.50");
  assert.equal(toRmbUpper(amount("0.00")), "零元整");
});

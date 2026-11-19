import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATEGORIES,
  convert,
  formatNumber,
  getUnits,
  isBelowAbsoluteZero,
  parseNumber,
} from "../src/lib/kit/unit.ts";

const close = (actual: number, expected: number, message?: string) =>
  assert.ok(
    Math.abs(actual - expected) <= Math.abs(expected) * 1e-9 + 1e-12,
    `${message ?? ""} ${actual} ≈ ${expected}`,
  );

test("every category has its base unit and unique ids", () => {
  for (const category of CATEGORIES) {
    const units = getUnits(category.id);
    assert.ok(
      units.some((unit) => unit.id === category.base),
      category.id,
    );
    assert.equal(new Set(units.map((unit) => unit.id)).size, units.length, category.id);
  }
});

test("length includes 市制 units", () => {
  close(convert(1, "m", "chi", "length"), 3);
  close(convert(1, "zhang", "chi", "length"), 10);
  close(convert(1, "chi", "cun", "length"), 10);
  close(convert(1, "li", "m", "length"), 500);
  close(convert(1, "mi", "km", "length"), 1.609344);
  close(convert(12, "in", "ft", "length"), 1);
  close(convert(1, "nmi", "m", "length"), 1852);
});

test("mass converts 斤两钱 and imperial units", () => {
  close(convert(1, "kg", "jin", "mass"), 2);
  close(convert(1, "jin", "liang", "mass"), 10);
  close(convert(1, "liang", "qian", "mass"), 10);
  close(convert(1, "lb", "g", "mass"), 453.59237);
  close(convert(16, "oz", "lb", "mass"), 1);
  close(convert(5, "ct", "g", "mass"), 1);
});

test("area and volume", () => {
  close(convert(1, "mu", "m2", "area"), 666.6666666666666);
  close(convert(15, "mu", "ha", "area"), 1);
  close(convert(1, "acre", "ft2", "area"), 43560);
  close(convert(1, "m3", "l", "volume"), 1000);
  close(convert(1, "usgal", "usfloz", "volume"), 128);
  close(convert(1, "cup", "ml", "volume"), 250);
  close(convert(1, "cm3", "ml", "volume"), 1);
});

test("temperature is affine", () => {
  close(convert(100, "c", "f", "temperature"), 212);
  close(convert(32, "f", "c", "temperature"), 0);
  close(convert(-40, "c", "f", "temperature"), -40);
  close(convert(0, "k", "c", "temperature"), -273.15);
  close(convert(98.6, "f", "c", "temperature"), 37);
  assert.equal(isBelowAbsoluteZero(-300, "c"), true);
  assert.equal(isBelowAbsoluteZero(-273.15, "c"), false);
  assert.equal(isBelowAbsoluteZero(-1, "k"), true);
});

test("storage switches between 1024 and 1000", () => {
  close(convert(1, "gb", "mb", "data", true), 1024);
  close(convert(1, "gb", "mb", "data", false), 1000);
  close(convert(1, "tb", "gb", "data", false), 1000);
  close(convert(1, "b", "bit", "data"), 8);
  // A "1 TB" drive shows up as about 931 GB in the OS.
  close(convert(convert(1, "tb", "b", "data", false), "b", "gb", "data", true), 931.3225746154785);
});

test("speed", () => {
  close(convert(36, "kmh", "ms", "speed"), 10);
  close(convert(1, "kn", "kmh", "speed"), 1.852);
  close(convert(1, "mach", "ms", "speed"), 340.3);
  close(convert(60, "mph", "kmh", "speed"), 96.56064);
});

test("parseNumber is forgiving but strict", () => {
  assert.equal(parseNumber("1,234.5"), 1234.5);
  assert.equal(parseNumber(" 12 "), 12);
  assert.equal(parseNumber("-3"), -3);
  assert.equal(parseNumber("1e3"), 1000);
  assert.equal(parseNumber("１２．５"), 12.5);
  assert.equal(parseNumber(".5"), 0.5);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("abc"), null);
  assert.equal(parseNumber("1.2.3"), null);
  assert.equal(parseNumber("1e999"), null);
});

test("formatNumber keeps 10 significant digits without exponents for normal values", () => {
  assert.equal(formatNumber(0.1 + 0.2), "0.3");
  assert.equal(formatNumber(666.6666666666666), "666.6666667");
  assert.equal(formatNumber(1234567.891), "1234567.891");
  assert.equal(formatNumber(1234567.891, true), "1,234,567.891");
  assert.equal(formatNumber(1e15), "1000000000000000");
  assert.equal(formatNumber(0.000001), "0.000001");
  assert.equal(formatNumber(-40), "-40");
  assert.equal(formatNumber(0), "0");
  assert.equal(formatNumber(1.5e-12), "1.5e-12");
  assert.equal(formatNumber(2e21), "2e+21");
  assert.equal(formatNumber(Number.NaN), "—");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  beijingDateTime,
  beijingWithWeekday,
  dayOfYear,
  detectUnit,
  isoBeijing,
  isoWeek,
  parseDateTime,
  parseTimestamp,
  relativeTime,
  toDatetimeLocal,
  utcDateTime,
} from "../src/lib/kit/timestamp.ts";

/** 2026-11-19 15:30:00 Beijing = 07:30:00 UTC. */
const SAMPLE_MS = Date.UTC(2026, 10, 19, 7, 30, 0);

/** Epoch ms of a Beijing wall-clock time, computed without the machine timezone. */
const beijing = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) =>
  Date.UTC(y, m - 1, d, h - 8, mi, s);

test("detectUnit guesses by digit count", () => {
  assert.equal(detectUnit(10), "s");
  assert.equal(detectUnit(1), "s");
  assert.equal(detectUnit(11), "s");
  assert.equal(detectUnit(13), "ms");
  assert.equal(detectUnit(16), "us");
  assert.equal(detectUnit(19), "ns");
  assert.equal(detectUnit(20), null);
});

test("parseTimestamp handles every unit", () => {
  assert.deepEqual(parseTimestamp("1795073400"), {
    ok: true,
    ms: SAMPLE_MS,
    unit: "s",
    digits: 10,
  });
  const ms = parseTimestamp("1795073400123");
  assert.ok(ms?.ok);
  assert.equal(ms.ms, SAMPLE_MS + 123);
  assert.equal(ms.unit, "ms");
  const us = parseTimestamp("1795073400123456");
  assert.ok(us?.ok);
  assert.equal(us.ms, SAMPLE_MS + 123);
  assert.equal(us.unit, "us");
  const ns = parseTimestamp("1795073400123456789");
  assert.ok(ns?.ok);
  assert.equal(ns.ms, SAMPLE_MS + 123);
  assert.equal(ns.unit, "ns");
});

test("parseTimestamp accepts fractions, signs, separators and forced units", () => {
  const fraction = parseTimestamp("1795073400.5");
  assert.ok(fraction?.ok);
  assert.equal(fraction.ms, SAMPLE_MS + 500);
  const spaced = parseTimestamp(" 1,795,073,400 ");
  assert.ok(spaced?.ok);
  assert.equal(spaced.ms, SAMPLE_MS);
  const negative = parseTimestamp("-86400");
  assert.ok(negative?.ok);
  assert.equal(negative.ms, -86400000);
  const forced = parseTimestamp("1795073400", "ms");
  assert.ok(forced?.ok);
  assert.equal(forced.ms, 1795073400);
  const zero = parseTimestamp("0");
  assert.ok(zero?.ok);
  assert.equal(zero.ms, 0);
});

test("parseTimestamp rejects junk and out-of-range values", () => {
  assert.equal(parseTimestamp(""), null);
  assert.equal(parseTimestamp("   "), null);
  assert.equal(parseTimestamp("12ab")?.ok, false);
  assert.equal(parseTimestamp("1.2.3")?.ok, false);
  assert.equal(parseTimestamp("123456789012345678901")?.ok, false);
  assert.equal(parseTimestamp("99999999999999", "s")?.ok, false);
});

test("formatting uses Beijing time regardless of the machine timezone", () => {
  assert.equal(beijingDateTime(0), "1970-01-01 08:00:00");
  assert.equal(beijingWithWeekday(0), "1970-01-01 08:00:00 星期四");
  assert.equal(utcDateTime(0), "1970-01-01 00:00:00");
  assert.equal(beijingWithWeekday(SAMPLE_MS), "2026-11-19 15:30:00 星期四");
  assert.equal(utcDateTime(SAMPLE_MS), "2026-11-19 07:30:00");
  assert.equal(isoBeijing(SAMPLE_MS), "2026-11-19T15:30:00+08:00");
  assert.equal(isoBeijing(SAMPLE_MS + 45), "2026-11-19T15:30:00.045+08:00");
  assert.equal(toDatetimeLocal(SAMPLE_MS), "2026-11-19T15:30:00");
  assert.equal(beijingWithWeekday(beijing(2026, 11, 22, 23, 59, 59)), "2026-11-22 23:59:59 星期日");
});

test("relativeTime describes past and future", () => {
  const now = SAMPLE_MS;
  assert.equal(relativeTime(now, now), "就是现在");
  assert.equal(relativeTime(now - 30_000, now), "30 秒前");
  assert.equal(relativeTime(now + 5 * 60_000, now), "5 分钟后");
  assert.equal(relativeTime(now + 2 * 3_600_000, now), "2 小时后");
  assert.equal(relativeTime(now - 3 * 86_400_000, now), "3 天前");
  assert.equal(relativeTime(now - 65 * 86_400_000, now), "2 个月前");
  assert.equal(relativeTime(now + 800 * 86_400_000, now), "2 年后");
});

test("dayOfYear and isoWeek follow the Beijing calendar", () => {
  assert.equal(dayOfYear(beijing(2026, 1, 1)), 1);
  assert.equal(dayOfYear(beijing(2026, 12, 31, 23, 59)), 365);
  assert.equal(dayOfYear(beijing(2020, 12, 31)), 366);
  assert.deepEqual(isoWeek(beijing(2026, 1, 1)), { year: 2026, week: 1 });
  assert.deepEqual(isoWeek(beijing(2026, 12, 31)), { year: 2026, week: 53 });
  assert.deepEqual(isoWeek(beijing(2027, 1, 1)), { year: 2026, week: 53 });
  assert.deepEqual(isoWeek(beijing(2024, 12, 30)), { year: 2025, week: 1 });
  assert.deepEqual(isoWeek(beijing(2021, 1, 3)), { year: 2020, week: 53 });
  // 2026-12-31 20:00 UTC is already 2027-01-01 in Beijing.
  const lateUtc = Date.UTC(2026, 11, 31, 20, 0, 0);
  assert.equal(dayOfYear(lateUtc), 1);
  assert.equal(beijingDateTime(lateUtc), "2027-01-01 04:00:00");
});

test("parseDateTime accepts common spellings as Beijing time", () => {
  for (const text of [
    "2026-11-19 15:30:00",
    "2026-11-19 15:30",
    "2026/11/19 15:30",
    "2026.11.19 15:30:00",
    "2026-11-19T15:30:00",
    "2026年11月19日 15时30分",
    "2026年11月19日15点30分00秒",
    " 2026-11-19 15:30:00.000 ",
  ]) {
    const parsed = parseDateTime(text);
    assert.ok(parsed?.ok, text);
    assert.equal(parsed.ms, SAMPLE_MS, text);
    assert.equal(parsed.explicitOffset, false, text);
  }
  const dateOnly = parseDateTime("2026年11月19日");
  assert.ok(dateOnly?.ok);
  assert.equal(dateOnly.ms, beijing(2026, 11, 19));
});

test("parseDateTime honours explicit offsets", () => {
  for (const text of [
    "2026-11-19T07:30:00Z",
    "2026-11-19T07:30:00.000Z",
    "2026-11-19T15:30:00+08:00",
    "2026-11-19T16:30:00+0900",
    "2026-11-19 02:30:00 -05:00",
    "2026-11-19 07:30:00 UTC",
    "2026-11-19 15:30:00 GMT+8",
  ]) {
    const parsed = parseDateTime(text);
    assert.ok(parsed?.ok, text);
    assert.equal(parsed.ms, SAMPLE_MS, text);
    assert.equal(parsed.explicitOffset, true, text);
  }
  const fraction = parseDateTime("2026-11-19T07:30:00.1234Z");
  assert.ok(fraction?.ok);
  assert.equal(fraction.ms, SAMPLE_MS + 123);
});

test("parseDateTime rejects impossible dates", () => {
  assert.equal(parseDateTime(""), null);
  assert.equal(parseDateTime("明天")?.ok, false);
  assert.equal(parseDateTime("2026-02-29")?.ok, false);
  assert.equal(parseDateTime("2024-02-29")?.ok, true);
  assert.equal(parseDateTime("2026-13-01")?.ok, false);
  assert.equal(parseDateTime("2026-11-19 24:00:00")?.ok, false);
  assert.equal(parseDateTime("2026-11-19 12:60")?.ok, false);
  assert.equal(parseDateTime("2026-11-19T12:00:00+15:00")?.ok, false);
});

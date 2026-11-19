import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  addMonths,
  addYears,
  beijingToday,
  countWorkdays,
  dayOfYear,
  daysBetween,
  diffDates,
  formatYmd,
  fromDayNumber,
  isLeapYear,
  nextOccurrence,
  parseYmd,
  shiftDate,
  toDayNumber,
  upcomingFestivals,
  weekday,
} from "../src/lib/kit/datecalc.ts";

const ymd = (text: string) => {
  const value = parseYmd(text);
  assert.ok(value, text);
  return value;
};

test("day numbers round-trip and match the Unix epoch", () => {
  assert.equal(toDayNumber({ y: 1970, m: 1, d: 1 }), 0);
  assert.equal(toDayNumber({ y: 2000, m: 3, d: 1 }), Date.UTC(2000, 2, 1) / 86400000);
  for (let day = -800000; day < 800000; day += 997) {
    assert.equal(toDayNumber(fromDayNumber(day)), day);
  }
});

test("leap years follow the Gregorian rules", () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(daysBetween(ymd("2024-02-28"), ymd("2024-03-01")), 2);
  assert.equal(daysBetween(ymd("2023-02-28"), ymd("2023-03-01")), 1);
  assert.equal(dayOfYear(ymd("2024-12-31")), 366);
  assert.equal(dayOfYear(ymd("2026-12-31")), 365);
});

test("parseYmd rejects impossible dates", () => {
  assert.equal(parseYmd("2023-02-29"), null);
  assert.equal(parseYmd("2026-13-01"), null);
  assert.equal(parseYmd("abc"), null);
  assert.deepEqual(parseYmd("2024-02-29"), { y: 2024, m: 2, d: 29 });
  assert.equal(formatYmd({ y: 2026, m: 7, d: 4 }), "2026-07-04");
});

test("weekday is correct", () => {
  assert.equal(weekday(ymd("1970-01-01")), 4);
  assert.equal(weekday(ymd("2026-11-19")), 4);
  assert.equal(weekday(ymd("2024-02-29")), 4);
  assert.equal(weekday(ymd("2000-01-01")), 6);
});

test("adding months clamps to the end of the month", () => {
  assert.equal(formatYmd(addMonths(ymd("2026-01-31"), 1)), "2026-02-28");
  assert.equal(formatYmd(addMonths(ymd("2024-01-31"), 1)), "2024-02-29");
  assert.equal(formatYmd(addMonths(ymd("2026-03-31"), -1)), "2026-02-28");
  assert.equal(formatYmd(addMonths(ymd("2026-11-30"), 3)), "2027-02-28");
  assert.equal(formatYmd(addMonths(ymd("2026-01-15"), -13)), "2024-12-15");
  assert.equal(formatYmd(addYears(ymd("2024-02-29"), 1)), "2025-02-28");
  assert.equal(formatYmd(addYears(ymd("2024-02-29"), 4)), "2028-02-29");
  assert.equal(formatYmd(addDays(ymd("2026-12-31"), 1)), "2027-01-01");
  assert.equal(formatYmd(shiftDate(ymd("2026-11-19"), -2, "week")), "2026-11-05");
});

test("workdays count Monday to Friday only", () => {
  // 2026-11-16 is a Monday.
  assert.equal(countWorkdays(ymd("2026-11-16"), ymd("2026-11-23")), 5);
  assert.equal(countWorkdays(ymd("2026-11-16"), ymd("2026-11-21")), 5);
  assert.equal(countWorkdays(ymd("2026-11-21"), ymd("2026-11-23")), 0);
  assert.equal(countWorkdays(ymd("2026-11-20"), ymd("2026-11-24")), 2);
  assert.equal(countWorkdays(ymd("2026-01-01"), ymd("2027-01-01")), 261);
  assert.equal(countWorkdays(ymd("2026-11-20"), ymd("2026-11-20")), 0);
});

test("diffDates handles inclusive ends, months and negative spans", () => {
  const forward = diffDates(ymd("2026-01-31"), ymd("2026-03-01"), false);
  assert.equal(forward.days, 29);
  assert.equal(forward.months, 1);
  assert.equal(forward.monthDays, 1);
  assert.equal(forward.weeks, 4);
  assert.equal(forward.weekDays, 1);

  const inclusive = diffDates(ymd("2026-01-01"), ymd("2026-01-31"), true);
  assert.equal(inclusive.days, 31);
  assert.equal(inclusive.months, 1);
  assert.equal(inclusive.monthDays, 0);

  const backward = diffDates(ymd("2026-03-01"), ymd("2026-01-31"), false);
  assert.equal(backward.days, -29);
  assert.equal(backward.months, 1);
  assert.equal(backward.monthDays, 1);

  const backwardInclusive = diffDates(ymd("2026-11-20"), ymd("2026-11-16"), true);
  assert.equal(backwardInclusive.days, -5);
  assert.equal(backwardInclusive.workdays, 5);

  const same = diffDates(ymd("2026-11-19"), ymd("2026-11-19"), true);
  assert.equal(same.days, 1);
  assert.equal(diffDates(ymd("2026-11-19"), ymd("2026-11-19"), false).days, 0);

  const year = diffDates(ymd("2024-02-29"), ymd("2025-02-28"), false);
  assert.equal(year.days, 365);
  assert.equal(year.months, 12);
  assert.equal(year.monthDays, 0);
});

test("beijingToday uses UTC+8 regardless of the host time zone", () => {
  assert.deepEqual(beijingToday(new Date("2026-11-18T16:30:00Z")), { y: 2026, m: 11, d: 19 });
  assert.deepEqual(beijingToday(new Date("2026-11-18T15:59:00Z")), { y: 2026, m: 11, d: 18 });
});

test("festival chips pick the next occurrence", () => {
  const today = ymd("2026-11-19");
  assert.equal(formatYmd(nextOccurrence(1, 1, today)), "2027-01-01");
  assert.equal(formatYmd(nextOccurrence(11, 19, today)), "2026-11-19");
  const list = upcomingFestivals(today);
  assert.equal(list[0].name, "圣诞节");
  assert.equal(list[0].daysLeft, 36);
  assert.equal(list.at(-1)?.name, "国庆节");
});

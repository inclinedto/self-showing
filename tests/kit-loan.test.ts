import assert from "node:assert/strict";
import { test } from "node:test";
import {
  annuityPayment,
  buildSchedule,
  calculate,
  formatMoney,
  groupByYear,
  summarize,
} from "../src/lib/kit/loan.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

test("100万 30年 4.9% 等额本息 ≈ 5307.27 per month", () => {
  assert.equal(round2(annuityPayment(1_000_000, 4.9, 360)), 5307.27);
  const rows = buildSchedule({
    principal: 1_000_000,
    annualRate: 4.9,
    months: 360,
    method: "annuity",
  });
  assert.equal(rows.length, 360);
  assert.equal(round2(rows[0].interest), 4083.33);
  assert.equal(round2(rows[0].principal), 1223.93);
  assert.equal(rows.at(-1)?.remaining, 0);
  const summary = summarize(rows);
  assert.equal(round2(summary.firstPayment), 5307.27);
  assert.equal(summary.monthlyDecrease < 1e-6, true);
  assert.ok(Math.abs(summary.totalInterest - 910616.19) < 1, String(summary.totalInterest));
  assert.ok(Math.abs(summary.principal - 1_000_000) < 1e-6);
});

test("100万 30年 4.9% 等额本金 first month ≈ 6861.11", () => {
  const rows = buildSchedule({
    principal: 1_000_000,
    annualRate: 4.9,
    months: 360,
    method: "linear",
  });
  const summary = summarize(rows);
  assert.equal(round2(summary.firstPayment), 6861.11);
  assert.equal(round2(summary.lastPayment), 2789.12);
  assert.equal(round2(summary.monthlyDecrease), 11.34);
  assert.equal(round2(summary.totalInterest), 737041.67);
  assert.equal(rows.at(-1)?.remaining, 0);
});

test("zero interest splits the principal evenly", () => {
  assert.equal(annuityPayment(120_000, 0, 12), 10_000);
  const rows = buildSchedule({ principal: 120_000, annualRate: 0, months: 12, method: "annuity" });
  assert.ok(rows.every((row) => Math.abs(row.payment - 10_000) < 1e-9 && row.interest === 0));
  assert.equal(summarize(rows).totalInterest, 0);
});

test("combined loans add up month by month", () => {
  const commercial = { principal: 700_000, annualRate: 3.1 };
  const fund = { principal: 300_000, annualRate: 2.85 };
  const combined = calculate([commercial, fund], 360, "annuity");
  const a = buildSchedule({ ...commercial, months: 360, method: "annuity" });
  const b = buildSchedule({ ...fund, months: 360, method: "annuity" });
  assert.equal(combined.length, 360);
  assert.ok(Math.abs(combined[0].payment - (a[0].payment + b[0].payment)) < 1e-9);
  assert.ok(Math.abs(combined[100].remaining - (a[100].remaining + b[100].remaining)) < 1e-6);
  const summary = summarize(combined);
  assert.ok(Math.abs(summary.principal - 1_000_000) < 1e-6);
});

test("groupByYear makes yearly subtotals", () => {
  const rows = buildSchedule({ principal: 100_000, annualRate: 3, months: 30, method: "linear" });
  const groups = groupByYear(rows);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].rows.length, 12);
  assert.equal(groups[2].rows.length, 6);
  const principal = groups.reduce((sum, group) => sum + group.principal, 0);
  assert.ok(Math.abs(principal - 100_000) < 1e-6);
});

test("formatMoney uses ¥, separators and 2 decimals", () => {
  assert.equal(formatMoney(5307.2733), "¥5,307.27");
  assert.equal(formatMoney(1_000_000), "¥1,000,000.00");
  assert.equal(formatMoney(-0.001), "¥0.00");
  assert.equal(formatMoney(0.5), "¥0.50");
  assert.equal(formatMoney(1234.5, false), "1,234.50");
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { amountToCents, checkoutUrl, signRequest } from "../src/lib/server/afdian.ts";
import {
  hashPassword,
  normalizeCode,
  randomCode,
  temporaryPassword,
  verifyPassword,
} from "../src/lib/server/password.ts";
import {
  FEATURE_KEYS,
  FREE_QUOTAS,
  MEMBER_QUOTAS,
  PLANS,
  findPlanByAfdianId,
  getPlan,
  isPurchasable,
  quotasFor,
} from "../src/resources/plans.ts";

test("signRequest follows the Afdian signing scheme", () => {
  const params = JSON.stringify({ out_trade_no: "202601010000" });
  const expected = createHash("md5")
    .update(`tokenXparams${params}ts1700000000user_iduser1`)
    .digest("hex");
  assert.equal(signRequest("tokenX", "user1", params, 1700000000), expected);
});

test("checkoutUrl carries the plan and our order id", () => {
  const url = new URL(
    checkoutUrl({ baseURL: "https://afdian.com" }, { planId: "p1", orderId: "ZJS1", remark: "季度会员" }),
  );
  assert.equal(url.origin + url.pathname, "https://afdian.com/order/create");
  assert.equal(url.searchParams.get("plan_id"), "p1");
  assert.equal(url.searchParams.get("custom_order_id"), "ZJS1");
  assert.equal(url.searchParams.get("month"), "1");
  assert.equal(url.searchParams.get("remark"), "季度会员");
});

test("amountToCents parses yuan strings without float drift", () => {
  assert.equal(amountToCents("19.90"), 1990);
  assert.equal(amountToCents("0.1"), 10);
  assert.equal(amountToCents("5"), 500);
  assert.equal(amountToCents(undefined), 0);
  assert.equal(amountToCents("abc"), 0);
});

test("password hashes verify and reject wrong passwords", async () => {
  const stored = await hashPassword("correct horse");
  assert.match(stored, /^scrypt\$/);
  assert.notEqual(stored, await hashPassword("correct horse"));
  assert.ok(await verifyPassword("correct horse", stored));
  assert.ok(!(await verifyPassword("wrong horse", stored)));
  assert.ok(!(await verifyPassword("anything", "not-a-hash")));
});

test("redeem codes are readable and normalize from sloppy input", () => {
  const code = randomCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(normalizeCode(" k7qf 3mzp-wx9c "), "K7QF-3MZP-WX9C");
  assert.equal(temporaryPassword().length, 14);
});

test("plans start unpriced and members always get more", () => {
  assert.ok(PLANS.length > 0);
  for (const plan of PLANS) {
    assert.equal(getPlan(plan.id), plan);
    assert.ok(plan.days > 0);
    if (!plan.price || !plan.afdianPlanId) assert.equal(isPurchasable(plan), false);
  }
  assert.equal(findPlanByAfdianId(""), undefined);
  for (const key of FEATURE_KEYS) {
    assert.ok(MEMBER_QUOTAS[key] > FREE_QUOTAS[key], key);
  }
  assert.equal(quotasFor(true), MEMBER_QUOTAS);
  assert.equal(quotasFor(false), FREE_QUOTAS);
});

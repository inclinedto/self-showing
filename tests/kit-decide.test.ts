import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkDraw,
  cryptoSource,
  drawNumbers,
  flipCoin,
  parseOptions,
  pickOption,
  type RandomSource,
  randomBelow,
  randomBetween,
  rollDice,
} from "../src/lib/kit/decide.ts";

/** Replays a fixed list of uint32 values, looping. */
const sequence =
  (...values: number[]): RandomSource =>
  () => {
    const value = values.shift();
    assert.ok(value !== undefined, "source exhausted");
    return value;
  };

test("randomBelow rejects values from the biased tail", () => {
  // For n = 3, 2^32 % 3 = 1, so 4294967295 is rejected and the next value is used.
  assert.equal(randomBelow(3, sequence(4294967295, 7)), 1);
  assert.equal(randomBelow(6, sequence(0)), 0);
  assert.equal(randomBelow(1, sequence()), 0);
  assert.throws(() => randomBelow(0, sequence()));
});

test("randomBelow is roughly uniform with crypto", () => {
  const source = cryptoSource();
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60000; i++) counts[randomBelow(6, source)]++;
  for (const count of counts) assert.ok(count > 9000 && count < 11000, String(counts));
});

test("randomBelow supports ranges above 2^32", () => {
  const source = cryptoSource();
  for (let i = 0; i < 1000; i++) {
    const value = randomBelow(2 ** 40, source);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 2 ** 40);
  }
});

test("randomBetween, coin and dice stay in range", () => {
  const source = cryptoSource();
  for (let i = 0; i < 1000; i++) {
    const value = randomBetween(-5, 5, source);
    assert.ok(value >= -5 && value <= 5);
  }
  assert.equal(typeof flipCoin(source), "boolean");
  const dice = rollDice(6, source);
  assert.equal(dice.length, 6);
  assert.ok(dice.every((face) => face >= 1 && face <= 6));
  assert.deepEqual(rollDice(2, sequence(0, 5)), [1, 6]);
});

test("pickOption avoids recent results unless nothing else is left", () => {
  const options = ["面", "饭", "粥"];
  assert.equal(pickOption(options, ["面", "饭"], sequence(123)), "粥");
  assert.equal(pickOption(options, options, sequence(1)), "饭");
  assert.equal(pickOption([], [], sequence()), undefined);
});

test("parseOptions trims, drops blanks and duplicates", () => {
  assert.deepEqual(parseOptions(" 麻辣烫 \n\n螺蛳粉\r\n麻辣烫\n  "), ["麻辣烫", "螺蛳粉"]);
  assert.equal(parseOptions("x".repeat(100))[0].length, 40);
});

test("checkDraw validates the request", () => {
  assert.deepEqual(checkDraw({ min: "1", max: "10", count: "3", unique: true }), {
    ok: true,
    min: 1,
    max: 10,
    count: 3,
  });
  assert.equal(checkDraw({ min: "10", max: "1", count: "1", unique: false }).ok, false);
  assert.equal(checkDraw({ min: "1.5", max: "3", count: "1", unique: false }).ok, false);
  assert.equal(checkDraw({ min: "", max: "3", count: "1", unique: false }).ok, false);
  assert.equal(checkDraw({ min: "1", max: "3", count: "4", unique: true }).ok, false);
  assert.equal(checkDraw({ min: "1", max: "3", count: "4", unique: false }).ok, true);
  assert.equal(checkDraw({ min: "1", max: "3", count: "0", unique: false }).ok, false);
  assert.equal(checkDraw({ min: "1", max: "99999", count: "1001", unique: false }).ok, false);
});

test("drawNumbers returns unique values when asked", () => {
  const source = cryptoSource();
  const sparse = drawNumbers(1, 1000, 50, true, source);
  assert.equal(new Set(sparse).size, 50);
  const dense = drawNumbers(1, 10, 10, true, source);
  assert.deepEqual(
    [...dense].sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  const repeated = drawNumbers(1, 2, 20, false, source);
  assert.equal(repeated.length, 20);
  assert.ok(repeated.every((value) => value === 1 || value === 2));
});

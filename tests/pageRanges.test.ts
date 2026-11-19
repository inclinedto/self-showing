import assert from "node:assert/strict";
import { test } from "node:test";
import { PageRangeError, parsePageRanges } from "../src/lib/pageRanges.ts";

test("parsePageRanges handles lists, ranges and open ends", () => {
  assert.deepEqual(parsePageRanges("1,3,5-7", 10), [1, 3, 5, 6, 7]);
  assert.deepEqual(parsePageRanges("8-", 10), [8, 9, 10]);
  assert.deepEqual(parsePageRanges(" 2 ， 4～5、9 ", 10), [2, 4, 5, 9]);
});

test("parsePageRanges keeps the given order, including reversed ranges, without duplicates", () => {
  assert.deepEqual(parsePageRanges("3-1,2", 5), [3, 2, 1]);
  assert.deepEqual(parsePageRanges("5,1-2,1", 5), [5, 1, 2]);
});

test("parsePageRanges rejects bad input", () => {
  assert.throws(() => parsePageRanges("", 5), PageRangeError);
  assert.throws(() => parsePageRanges("0", 5), PageRangeError);
  assert.throws(() => parsePageRanges("6", 5), PageRangeError);
  assert.throws(() => parsePageRanges("a-b", 5), PageRangeError);
});

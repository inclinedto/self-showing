import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLineRows,
  type Change,
  describeSummary,
  makeLineComparator,
  splitLines,
  summarize,
} from "../src/lib/kit/diff.ts";

const same = (lines: string[]): Change<string[]> => ({
  value: lines,
  added: false,
  removed: false,
});
const add = (lines: string[]): Change<string[]> => ({ value: lines, added: true, removed: false });
const del = (lines: string[]): Change<string[]> => ({ value: lines, added: false, removed: true });
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `L${from + i}`);

test("splitLines handles line endings and a trailing newline", () => {
  assert.deepEqual(splitLines(""), []);
  assert.deepEqual(splitLines("a\r\nb\rc\n"), ["a", "b", "c"]);
  assert.deepEqual(splitLines("a\n\n"), ["a", ""]);
});

test("makeLineComparator honours ignore options", () => {
  assert.equal(makeLineComparator(false, false)("A", "a"), false);
  assert.equal(makeLineComparator(true, false)("A", "a"), true);
  assert.equal(makeLineComparator(false, true)("  a ", "a"), true);
  assert.equal(makeLineComparator(false, true)("a b", "ab"), false);
});

test("buildLineRows numbers lines on both sides", () => {
  const rows = buildLineRows([same(["a"]), del(["b"]), add(["B", "C"]), same(["d"])]);
  assert.deepEqual(rows, [
    { kind: "same", text: "a", oldNo: 1, newNo: 1 },
    { kind: "del", text: "b", oldNo: 2 },
    { kind: "add", text: "B", newNo: 2 },
    { kind: "add", text: "C", newNo: 3 },
    { kind: "same", text: "d", oldNo: 3, newNo: 4 },
  ]);
});

test("buildLineRows collapses long unchanged runs keeping 3 context lines", () => {
  const rows = buildLineRows([same(range(1, 10)), del(["x"]), same(range(11, 30)), add(["y"])]);
  const kinds = rows.map((row) => (row.kind === "skip" ? `skip${row.hidden}` : row.kind));
  assert.deepEqual(kinds, [
    "skip7",
    "same",
    "same",
    "same",
    "del",
    "same",
    "same",
    "same",
    "skip14",
    "same",
    "same",
    "same",
    "add",
  ]);
  const firstShown = rows[1];
  assert.equal(firstShown.kind === "same" && firstShown.oldNo, 8);
  const afterSkip = rows[9];
  assert.equal(afterSkip.kind === "same" && afterSkip.oldNo, 29);
  assert.equal(afterSkip.kind === "same" && afterSkip.newNo, 28);
});

test("buildLineRows does not fold a single hidden line or when collapse is off", () => {
  const rows = buildLineRows([del(["x"]), same(range(1, 7)), add(["y"])]);
  assert.equal(rows.length, 9);
  assert.ok(rows.every((row) => row.kind !== "skip"));
  const unfolded = buildLineRows([del(["x"]), same(range(1, 50))], 3, false);
  assert.equal(unfolded.length, 51);
});

test("summarize counts blocks and units", () => {
  const summary = summarize([same(["a"]), del(["b", "c"]), add(["d"]), same(["e"]), add(["f"])]);
  assert.deepEqual(summary, { added: 2, removed: 1, addedUnits: 2, removedUnits: 2 });
  assert.equal(describeSummary(summary), "新增 2 处，删除 1 处");
  assert.equal(describeSummary(summarize([same(["a"])])), "两段文本完全相同");
  const words = summarize([{ value: "hello", added: true, removed: false, count: 1 }]);
  assert.equal(words.addedUnits, 1);
});

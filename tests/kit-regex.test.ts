import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSegments,
  describeRegexError,
  PRESETS,
  parseSlashPattern,
  WORKER_SOURCE,
  type WorkerRequest,
  type WorkerResponse,
} from "../src/lib/kit/regex.ts";

type FakeSelf = {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage: (data: WorkerResponse) => void;
};

/** Runs the real worker source against a fake `self`, synchronously. */
function runWorker(request: Partial<WorkerRequest> & { pattern: string; text: string }) {
  let response: WorkerResponse | undefined;
  const fake: FakeSelf = {
    onmessage: null,
    postMessage: (data) => {
      response = data;
    },
  };
  new Function("self", WORKER_SOURCE)(fake);
  fake.onmessage?.({
    data: { id: 1, flags: "g", replacement: "", limit: 5000, countLimit: 1_000_000, ...request },
  });
  if (!response) throw new Error("worker did not respond");
  return response;
}

test("worker finds all matches with groups and named groups", () => {
  const response = runWorker({
    pattern: "(?<year>\\d{4})-(\\d{2})",
    text: "2024-01 和 2025-12",
    replacement: "$<year>年$2月",
  });
  assert.equal(response.ok, true);
  if (!response.ok) return;
  assert.equal(response.total, 2);
  assert.deepEqual(response.matches[0], {
    index: 0,
    end: 7,
    text: "2024-01",
    groups: ["2024", "01"],
    named: { year: "2024" },
  });
  assert.equal(response.matches[1].index, 10);
  assert.equal(response.replaced, "2024年01月 和 2025年12月");
});

test("worker without g returns the first match and replaces once", () => {
  const response = runWorker({ pattern: "a", flags: "", text: "banana", replacement: "o" });
  assert.ok(response.ok);
  if (!response.ok) return;
  assert.equal(response.total, 1);
  assert.equal(response.matches[0].index, 1);
  assert.equal(response.replaced, "bonana");
});

test("worker does not loop forever on empty matches", () => {
  const response = runWorker({ pattern: "x*", text: "axxb" });
  assert.ok(response.ok);
  if (!response.ok) return;
  assert.deepEqual(
    response.matches.map((m) => [m.index, m.text]),
    [
      [0, ""],
      [1, "xx"],
      [3, ""],
      [4, ""],
    ],
  );
  const emoji = runWorker({ pattern: "", flags: "gu", text: "😀a" });
  assert.ok(emoji.ok);
  if (emoji.ok)
    assert.deepEqual(
      emoji.matches.map((m) => m.index),
      [0, 2, 3],
    );
});

test("worker caps details and counting", () => {
  const response = runWorker({ pattern: "a", text: "a".repeat(100), limit: 10, countLimit: 50 });
  assert.ok(response.ok);
  if (!response.ok) return;
  assert.equal(response.matches.length, 10);
  assert.equal(response.total, 50);
  assert.equal(response.capped, true);
});

test("worker reports invalid patterns and unmatched groups", () => {
  const bad = runWorker({ pattern: "(", text: "x" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(describeRegexError(bad.error), /^正则表达式有误：缺少右括号/);
  const optional = runWorker({ pattern: "a(b)?", text: "a" });
  assert.ok(optional.ok);
  if (optional.ok) assert.deepEqual(optional.matches[0].groups, [null]);
});

test("buildSegments splits text around matches", () => {
  assert.deepEqual(
    buildSegments("hello world", [
      { index: 0, end: 5 },
      { index: 6, end: 11 },
    ]),
    [
      { text: "hello", start: 0, match: 0 },
      { text: " ", start: 5, match: -1 },
      { text: "world", start: 6, match: 1 },
    ],
  );
  assert.deepEqual(
    buildSegments("abcabc", [
      { index: 1, end: 1 },
      { index: 1, end: 3 },
      { index: 2, end: 4 },
    ]),
    [
      { text: "a", start: 0, match: -1 },
      { text: "bc", start: 1, match: 1 },
      { text: "abc", start: 3, match: -1 },
    ],
  );
  assert.deepEqual(buildSegments("", []), []);
  assert.deepEqual(buildSegments("abc", []), [{ text: "abc", start: 0, match: -1 }]);
});

test("parseSlashPattern", () => {
  assert.deepEqual(parseSlashPattern("/a+b/gi"), { pattern: "a+b", flags: "gi" });
  assert.deepEqual(parseSlashPattern("/https?:\\/\\//"), { pattern: "https?:\\/\\/", flags: "" });
  assert.equal(parseSlashPattern("a+b"), null);
  assert.equal(parseSlashPattern("//"), null);
  assert.equal(parseSlashPattern("/a/x"), null);
});

test("describeRegexError strips the engine prefix and adds a Chinese hint", () => {
  assert.equal(
    describeRegexError(
      "Invalid regular expression: /a{2,1}/g: numbers out of order in {} quantifier",
    ),
    "正则表达式有误：量词 {m,n} 里的 m 不能大于 n（numbers out of order in {} quantifier）",
  );
  assert.equal(describeRegexError("something odd"), "正则表达式有误：something odd");
});

test("presets compile and match their samples", () => {
  for (const preset of PRESETS) {
    const re = new RegExp(preset.pattern, "u");
    assert.ok(re.test(`前缀 ${preset.sample} 后缀`), preset.label);
  }
  const phone = new RegExp(PRESETS[0].pattern, "g");
  assert.deepEqual("电话 13812345678、12345678901".match(phone), ["13812345678"]);
});

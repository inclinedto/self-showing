import assert from "node:assert/strict";
import { test } from "node:test";
import { findJsonProblem } from "../src/lib/kit/json.ts";

test("findJsonProblem accepts everything JSON.parse accepts", () => {
  for (const text of ['{"a":[1,-2.5e3,true,null,"x\\n\\u4e2d"]}', "[]", "{}", ' "s" ', "0", '{"a":{"b":[{}]}}']) {
    JSON.parse(text);
    assert.equal(findJsonProblem(text), null, text);
  }
});

test("findJsonProblem points at the first error with a readable reason", () => {
  const cases: [string, number, number, RegExp][] = [
    ['{"a":}', 1, 6, /少了一个值/],
    ['{"a":1,}', 1, 8, /最后一项后面不能有逗号/],
    ["[1,2,]", 1, 6, /最后一项后面不能有逗号/],
    ["{'a':1}", 1, 2, /双引号/],
    ['{\n  "a": 1\n  "b": 2\n}', 3, 3, /少了逗号/],
    ['{"a" 1}', 1, 6, /冒号/],
    ['{"a":1', 1, 7, /内容不完整/],
    ['{"a":01}', 1, 7, /数字格式不对/],
    ['{"a":undefined}', 1, 6, /undefined/],
    ['{"a":"line\nbreak"}', 1, 11, /不能直接换行/],
    ['{"a":"\\x"}', 1, 7, /转义/],
    ["[1] 2", 1, 5, /多余的内容/],
    ["{a:1}", 1, 2, /键名要用双引号/],
  ];
  for (const [text, line, column, reason] of cases) {
    assert.throws(() => JSON.parse(text), SyntaxError, text);
    const problem = findJsonProblem(text);
    assert.ok(problem, text);
    assert.deepEqual([problem.line, problem.column], [line, column], text);
    assert.match(problem.message, reason, text);
  }
});

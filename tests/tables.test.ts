import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mergeSameHeaderTables,
  normalizeTable,
  sheetNames,
  tableToCsv,
} from "../src/lib/tables.ts";

test("normalizeTable pads ragged rows, stringifies cells and names empty headers", () => {
  const table = normalizeTable({
    title: "",
    headers: ["名称", ""],
    rows: [["A", 1, true], ["B"], [], [null, ""]],
  });
  assert.ok(table);
  assert.equal(table.title, "未命名表格");
  assert.deepEqual(table.headers, ["名称", "列2", "列3"]);
  assert.deepEqual(table.rows, [
    ["A", "1", "true"],
    ["B", "", ""],
  ]);
});

test("normalizeTable returns null for empty output", () => {
  assert.equal(normalizeTable({}), null);
  assert.equal(normalizeTable({ headers: [], rows: [] }), null);
});

test("mergeSameHeaderTables joins consecutive tables split across pages", () => {
  const base = { headers: ["季度", "金额"], title: "销售" };
  const merged = mergeSameHeaderTables([
    { ...base, id: "a", source: "第 1 页", rows: [["Q1", "10"]] },
    { ...base, id: "b", source: "第 2 页", rows: [["Q2", "20"]] },
    { id: "c", title: "其他", source: "第 3 页", headers: ["x"], rows: [["1"]] },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].source, "第 1-2 页");
  assert.deepEqual(merged[0].rows, [
    ["Q1", "10"],
    ["Q2", "20"],
  ]);
});

test("tableToCsv quotes special characters and neutralizes formulas but keeps negatives", () => {
  const csv = tableToCsv({
    headers: ["说明", "金额"],
    rows: [
      ['含有,逗号和"引号"', "-12.5"],
      ["=HYPERLINK(\"http://x\")", "@SUM(A1)"],
      ["-非数字", "+1"],
    ],
  });
  const lines = csv.split("\r\n");
  assert.equal(lines[1], '"含有,逗号和""引号""",-12.5');
  assert.equal(lines[2], `"'=HYPERLINK(""http://x"")",'@SUM(A1)`);
  assert.equal(lines[3], "'-非数字,'+1");
});

test("sheetNames strips forbidden characters, truncates and de-duplicates", () => {
  const names = sheetNames(["表/1", "表/1", "", "a".repeat(40)]);
  assert.equal(names[0], "表 1");
  assert.equal(names[1], "表 1-2");
  assert.equal(names[2], "表格3");
  assert.ok(names[3].length <= 31);
});

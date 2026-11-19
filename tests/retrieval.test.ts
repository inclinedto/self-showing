import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Bm25Index,
  chunkSections,
  citedIds,
  sectionsFromPlainText,
  selectChunks,
  tokenize,
} from "../src/lib/retrieval.ts";

test("tokenize splits Chinese into unigrams and bigrams and keeps Latin words", () => {
  const tokens = tokenize("地基承载力 SPT-N 值");
  assert.ok(tokens.includes("地基"));
  assert.ok(tokens.includes("承载"));
  assert.ok(tokens.includes("载力"));
  assert.ok(tokens.includes("spt-n"));
  assert.ok(!tokens.includes("的"));
});

test("chunkSections keeps page labels and respects the size limit", () => {
  const long = "这是一个用于测试的句子。".repeat(120);
  const chunks = chunkSections([
    { label: "第 1 页", text: long },
    { label: "第 2 页", text: "第二页只有一句话。" },
  ]);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 600));
  assert.equal(chunks[chunks.length - 1].label, "第 2 页");
  assert.deepEqual(
    chunks.map((chunk) => chunk.index),
    chunks.map((_, index) => index),
  );
});

test("BM25 ranks the chunk that contains the query terms first", () => {
  const chunks = chunkSections([
    { label: "第 1 页", text: "本项目位于深圳市南山区，总建筑面积约 12 万平方米。" },
    { label: "第 2 页", text: "地基采用钻孔灌注桩，单桩竖向承载力特征值为 3500 kN。" },
    { label: "第 3 页", text: "施工期间应做好基坑降水和周边建筑沉降监测。" },
  ]);
  const index = new Bm25Index(chunks);
  const [top] = index.search("单桩承载力是多少");
  assert.equal(top.chunk.label, "第 2 页");
});

test("overview questions pull chunks from across the whole document", () => {
  const sections = Array.from({ length: 30 }, (_, page) => ({
    label: `第 ${page + 1} 页`,
    text: `第${page + 1}页的内容讲述了不同的主题，编号${page + 1}。`.repeat(10),
  }));
  const index = new Bm25Index(chunkSections(sections));
  const picked = selectChunks(index, "这份文档主要讲了什么？", 6000);
  const pages = new Set(picked.map((chunk) => chunk.label));
  assert.ok(pages.size >= 8, `expected wide coverage, got ${pages.size} pages`);
  assert.ok(picked.reduce((sum, chunk) => sum + chunk.text.length, 0) <= 6000);
});

test("sectionsFromPlainText groups paragraphs into labelled parts", () => {
  const text = Array.from({ length: 10 }, (_, i) => `第${i}段：${"内容".repeat(200)}`).join("\n\n");
  const sections = sectionsFromPlainText(text, 1500);
  assert.ok(sections.length >= 4);
  assert.equal(sections[0].label, "第 1 部分");
});

test("citedIds reads single, adjacent and comma-separated markers", () => {
  assert.deepEqual(citedIds("结论 A [2]。结论 B [1][3]，以及 [4, 5]、[6，7]"), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(citedIds("没有引用"), []);
});

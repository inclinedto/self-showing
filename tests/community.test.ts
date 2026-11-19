import assert from "node:assert/strict";
import { test } from "node:test";
import { ALIAS_COUNT, aliasFromHex } from "../src/lib/alias.ts";
import { checkContent, findBlockedWord, mentionsCrisis } from "../src/lib/moderation.ts";

test("checkContent lets ordinary venting through", () => {
  for (const text of [
    "今天加班到十点，好累啊，但是看到月亮很圆。",
    "考试没考好，有点难过，明天继续努力吧",
    "Vue.js 和 React 到底该学哪个？",
    "我的分数是 13800 分",
  ]) {
    assert.deepEqual(checkContent(text), { ok: true, crisis: false }, text);
  }
});

test("checkContent rejects contact details and links", () => {
  for (const text of [
    "有需要的加我 13812345678",
    "我的 qq：12345678 欢迎来聊",
    "微信 abc_12345 私聊",
    "看这里 https://example.com",
    "去 something.top 看看",
    "www.example.org",
  ]) {
    const result = checkContent(text);
    assert.equal(result.ok, false, text);
  }
});

test("checkContent catches blocked words even with spacing and punctuation", () => {
  assert.equal(checkContent("网 赌 带 你 回 本").ok, false);
  assert.equal(checkContent("加.我.微.信").ok, false);
  assert.equal(findBlockedWord("ＫＦ和K粉"), "k粉");
  assert.equal(findBlockedWord("自定义词", ["自定义"]), "自定义");
  assert.equal(findBlockedWord("一切正常"), null);
});

test("checkContent rejects character spam", () => {
  assert.equal(checkContent("啊".repeat(20)).ok, false);
  assert.equal(checkContent("哈哈哈哈哈哈哈").ok, true);
});

test("crisis mentions are flagged but not blocked", () => {
  assert.ok(mentionsCrisis("有时候真的不想活了"));
  assert.ok(!mentionsCrisis("今天天气不错"));
  assert.deepEqual(checkContent("活不下去了，好累"), { ok: true, crisis: true });
});

test("aliasFromHex is stable and spreads over many nicknames", () => {
  assert.equal(aliasFromHex("deadbeef00"), aliasFromHex("deadbeef00"));
  assert.ok(ALIAS_COUNT >= 1000);
  const seen = new Set<string>();
  for (let index = 0; index < 400; index++) {
    seen.add(aliasFromHex((index * 2654435761 >>> 0).toString(16).padStart(8, "0")));
  }
  assert.ok(seen.size > 300, `only ${seen.size} distinct aliases`);
  assert.ok(aliasFromHex("zz").length >= 2);
});

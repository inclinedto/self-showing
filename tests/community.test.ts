import assert from "node:assert/strict";
import { test } from "node:test";
import { ALIAS_COUNT, aliasFromHex } from "../src/lib/alias.ts";
import { extractTags, isValidTag, MAX_TAGS, splitTags } from "../src/lib/community.ts";
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

test("extractTags finds distinct lower-cased #tags", () => {
  assert.deepEqual(extractTags("今天 #夏天 好热，#小确幸 吃到西瓜 #夏天 #Summer"), ["夏天", "小确幸", "summer"]);
  assert.deepEqual(extractTags("#加班，好累"), ["加班"]);
  assert.deepEqual(extractTags("第 #1 名, a#b, &#123;, # 空格"), []);
  assert.deepEqual(extractTags("#一个超级超级超级超级超级超级长的标签啊"), []);
  assert.equal(extractTags("#a #b #c #d #e #f #g").length, MAX_TAGS);
});

test("splitTags keeps the text intact and marks tag runs", () => {
  const segments = splitTags("早安 #晚安 ，#2024 也行");
  assert.equal(segments.map((segment) => segment.text).join(""), "早安 #晚安 ，#2024 也行");
  assert.deepEqual(
    segments.filter((segment) => segment.tag).map((segment) => segment.tag),
    ["晚安"],
  );
  assert.deepEqual(splitTags("没有标签"), [{ text: "没有标签" }]);
});

test("isValidTag accepts words and rejects punctuation or bare numbers", () => {
  assert.ok(isValidTag("考研"));
  assert.ok(isValidTag("vue_3"));
  assert.ok(!isValidTag("123"));
  assert.ok(!isValidTag("a b"));
  assert.ok(!isValidTag(""));
});

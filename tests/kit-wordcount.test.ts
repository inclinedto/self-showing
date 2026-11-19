import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collapseBlankLines,
  countText,
  formatReadingTime,
  toChinesePunctuation,
  toEnglishPunctuation,
  toHalfwidthAlnum,
  trimLines,
} from "../src/lib/kit/wordcount.ts";

test("countText counts each category", () => {
  const stats = countText(
    "今天天气不错，我们去 the beach 玩吧！\n\n气温 32.5 度，人数 1,200 人。😀",
  );
  assert.equal(stats.hanzi, 17);
  assert.equal(stats.englishWords, 2);
  assert.equal(stats.numbers, 2);
  assert.equal(stats.punctuation, 4);
  assert.equal(stats.lines, 3);
  assert.equal(stats.paragraphs, 2);
  assert.equal(stats.total, 46);
  assert.equal(stats.noSpaces, 39);
});

test("countText handles empty and whitespace-only text", () => {
  const empty = countText("");
  assert.equal(empty.total, 0);
  assert.equal(empty.lines, 0);
  assert.equal(empty.paragraphs, 0);
  assert.equal(empty.readingMinutes, 0);
  const blank = countText("  \n \n");
  assert.equal(blank.paragraphs, 0);
  assert.equal(blank.noSpaces, 0);
  assert.equal(blank.lines, 3);
});

test("countText treats contractions and hyphenated words as one word", () => {
  assert.equal(countText("Don't over-think it, OK?").englishWords, 4);
  assert.equal(countText("2024年12月31日 3 4 5").numbers, 6);
});

test("formatReadingTime", () => {
  assert.equal(formatReadingTime(0), "0 分钟");
  assert.equal(formatReadingTime(0.4), "不到 1 分钟");
  assert.equal(formatReadingTime(2.3), "约 2 分钟");
  assert.equal(formatReadingTime(75), "约 1 小时 15 分钟");
  assert.equal(formatReadingTime(120), "约 2 小时");
  assert.equal(countText("字".repeat(800)).readingMinutes, 2);
});

test("toChinesePunctuation converts common marks", () => {
  assert.equal(toChinesePunctuation("你好, 世界!"), "你好，世界！");
  assert.equal(
    toChinesePunctuation('他说:"走吧". 我问(为什么)?'),
    "他说：“走吧”。我问（为什么）？",
  );
  assert.equal(toChinesePunctuation("等等..."), "等等……");
  assert.equal(toChinesePunctuation("他说'好'"), "他说‘好’");
});

test("toChinesePunctuation keeps decimals, times, thousands and URLs", () => {
  assert.equal(toChinesePunctuation("圆周率约 3.14, 现在 12:30"), "圆周率约 3.14，现在 12:30");
  assert.equal(toChinesePunctuation("共 1,000 元."), "共 1,000 元。");
  assert.equal(
    toChinesePunctuation("看 https://example.com/a?b=1,2 吧!"),
    "看 https://example.com/a?b=1,2 吧！",
  );
  assert.equal(toChinesePunctuation("写信到 me@example.com."), "写信到 me@example.com.");
  assert.equal(toChinesePunctuation("Don't stop. 版本 v1.2"), "Don't stop. 版本 v1.2");
  assert.equal(toChinesePunctuation("结束了.\n下一行"), "结束了。\n下一行");
});

test("toEnglishPunctuation converts and spaces", () => {
  assert.equal(toEnglishPunctuation("你好，世界！"), "你好, 世界!");
  assert.equal(toEnglishPunctuation("他说：“走吧。”"), '他说:"走吧."');
  assert.equal(toEnglishPunctuation("等等……（真的）"), "等等...(真的)");
  assert.equal(toEnglishPunctuation("一、二。\n三"), "一, 二.\n三");
});

test("collapseBlankLines merges runs of blank lines", () => {
  assert.equal(collapseBlankLines("\n\na\n\n\n  \nb\n\n"), "a\n\nb");
  assert.equal(collapseBlankLines("a\r\nb"), "a\nb");
});

test("trimLines strips both ends of each line, including full-width spaces", () => {
  assert.equal(trimLines("  a  \n\u3000\u3000b\t\n c"), "a\nb\nc");
});

test("toHalfwidthAlnum converts letters and digits only", () => {
  assert.equal(toHalfwidthAlnum("ＡＢＣ１２３ａｂｃ，！"), "ABC123abc，！");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  base64Decode,
  base64Encode,
  DEFAULT_OPTIONS,
  hexDecode,
  hexEncode,
  htmlDecode,
  htmlEncode,
  morseDecode,
  morseEncode,
  runCodec,
  unicodeEscape,
  unicodeUnescape,
  unsupportedMorseChars,
  urlDecode,
  urlEncode,
} from "../src/lib/kit/encode.ts";

const SAMPLES = ["", "a", "ab", "abc", "Hello, World!", "你好，世界", "夏天🌊🏖️来了", "a\nb\tc 😀"];

test("base64 matches Buffer and round-trips UTF-8", () => {
  for (const text of SAMPLES) {
    assert.equal(base64Encode(text), Buffer.from(text).toString("base64"), text);
    assert.equal(base64Decode(base64Encode(text)), text, text);
    assert.equal(base64Decode(base64Encode(text, true)), text, text);
  }
  assert.equal(base64Encode("你好"), "5L2g5aW9");
});

test("base64 URL-safe variant and tolerant decoding", () => {
  const text = "??>>~~ 测试";
  const safe = base64Encode(text, true);
  assert.equal(safe, Buffer.from(text).toString("base64url"));
  assert.doesNotMatch(safe, /[+/=]/);
  assert.equal(base64Decode("5L2g\n5aW9"), "你好");
  assert.equal(base64Decode("  SGVsbG8  "), "Hello");
  assert.equal(base64Decode("SGVsbG8="), "Hello");
  assert.equal(base64Decode("data:text/plain;base64,SGk="), "Hi");
  assert.throws(() => base64Decode("SGVsb*8="), /不允许的字符“\*”/);
  assert.throws(() => base64Decode("SGVsb"), /长度不对/);
  assert.throws(() => base64Decode("/w=="), /UTF-8/);
});

test("url encode / decode", () => {
  assert.equal(urlEncode("a b&c=你"), "a%20b%26c%3D%E4%BD%A0");
  assert.equal(urlEncode("https://x.cn/a b?q=你", true), "https://x.cn/a%20b?q=%E4%BD%A0");
  assert.equal(urlDecode("a%20b%26c%3D%E4%BD%A0"), "a b&c=你");
  for (const text of SAMPLES) assert.equal(urlDecode(urlEncode(text)), text);
  assert.throws(() => urlDecode("100%"), /第 4 个字符处的“%”不是合法的百分号编码/);
  assert.throws(() => urlDecode("%zz"), /“%zz”/);
  assert.throws(() => urlDecode("%E4%BD"), /UTF-8/);
  assert.throws(() => urlEncode("\ud800"), /代理项/);
});

test("unicode escape round-trips including emoji", () => {
  assert.equal(unicodeEscape("a你😀"), "a\\u4f60\\ud83d\\ude00");
  assert.equal(unicodeEscape("ab", true), "\\u0061\\u0062");
  for (const text of SAMPLES) {
    assert.equal(unicodeUnescape(unicodeEscape(text)), text, text);
    assert.equal(unicodeUnescape(unicodeEscape(text, true)), text, text);
  }
  assert.equal(unicodeUnescape("\\u{1F600} \\U0001F30A \\u4F60"), "😀 🌊 你");
  assert.equal(unicodeUnescape("没有转义"), "没有转义");
  assert.throws(() => unicodeUnescape("\\u{110000}"), /超出了 Unicode 的范围/);
});

test("html entities encode and decode without the DOM", () => {
  assert.equal(
    htmlEncode(`<a href="x">Tom & 'Jerry'</a>`),
    "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
  );
  assert.equal(htmlEncode("你😀<", true), "&#x4F60;&#x1F600;&lt;");
  assert.equal(
    htmlDecode(
      "&lt;b&gt; &amp;amp; &quot;&apos; &nbsp;&copy;&reg;&yen;&hellip;&mdash;&ndash;&laquo;&raquo;",
    ),
    "<b> &amp; \"' \u00a0©®¥…—–«»",
  );
  assert.equal(htmlDecode("&#20320;&#x597D;&#X1F600;"), "你好😀");
  assert.equal(htmlDecode("&unknown; & &amp &#0; &#x110000;"), "&unknown; & &amp \ufffd \ufffd");
  assert.equal(htmlDecode("&constructor;"), "&constructor;");
  for (const text of SAMPLES) {
    assert.equal(htmlDecode(htmlEncode(text)), text);
    assert.equal(htmlDecode(htmlEncode(text, true)), text);
  }
});

test("hex encode / decode", () => {
  assert.equal(hexEncode("你好"), "e4 bd a0 e5 a5 bd");
  assert.equal(hexEncode("Hi", false, true), "4869");
  for (const text of SAMPLES) {
    assert.equal(hexDecode(hexEncode(text)), text, text);
    assert.equal(hexDecode(hexEncode(text, false, true)), text, text);
  }
  assert.equal(hexDecode("0x48, 0x69"), "Hi");
  assert.equal(hexDecode("\\x48\\x69"), "Hi");
  assert.equal(hexDecode("48:69\n"), "Hi");
  assert.equal(hexDecode("0x9 0x41"), "\tA");
  assert.equal(hexDecode("F0 9F 98 80"), "😀");
  assert.throws(() => hexDecode("4g"), /“g”不是十六进制字符/);
  assert.throws(() => hexDecode("486"), /奇数/);
  assert.throws(() => hexDecode("ff"), /UTF-8/);
});

test("morse code", () => {
  assert.equal(morseEncode("SOS"), "... --- ...");
  assert.equal(morseEncode("Hello World"), ".... . .-.. .-.. --- / .-- --- .-. .-.. -..");
  assert.equal(morseDecode(".... . .-.. .-.. --- / .-- --- .-. .-.. -.."), "HELLO WORLD");
  const text = `HI, 2026! A_B "Q" $5 @ME (OK) 1+1=2; X/Y & Z: 'A' -.?`;
  assert.equal(morseDecode(morseEncode(text)), text);
  assert.equal(morseDecode("··· ——— ···"), "SOS");
  assert.equal(morseDecode("... ---|..."), "SO S");
  assert.equal(morseDecode("...... .-"), "?A");
  assert.equal(morseEncode("你好 ab"), ".- -...");
  assert.deepEqual(unsupportedMorseChars("你好 ab 你"), ["你", "好"]);
  assert.equal(morseDecode(morseEncode("line one\nline two")), "LINE ONE\nLINE TWO");
  assert.throws(() => morseDecode(".- x"), /发现了“x”/);
});

test("runCodec dispatches by kind and direction", () => {
  assert.equal(runCodec("base64", "encode", "hi"), "aGk=");
  assert.equal(runCodec("url", "decode", " %20 "), " ");
  assert.equal(
    runCodec("hex", "encode", "A", { ...DEFAULT_OPTIONS, hexUpper: true, hexNoSpace: true }),
    "41",
  );
});

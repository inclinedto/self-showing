/** 正则测试的纯逻辑：Worker 源码、高亮分段、错误信息翻译、常用预设。 */

export type MatchInfo = {
  index: number;
  end: number;
  text: string;
  groups: (string | null)[];
  named: Record<string, string | null> | null;
};

export type WorkerRequest = {
  id: number;
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  /** Maximum number of matches returned in detail. */
  limit: number;
  /** Stop counting after this many matches. */
  countLimit: number;
};

export type WorkerResponse =
  | {
      id: number;
      ok: true;
      total: number;
      capped: boolean;
      matches: MatchInfo[];
      replaced: string;
    }
  | { id: number; ok: false; error: string };

/**
 * Plain-JS source for the matching worker (loaded from a Blob URL so a runaway pattern
 * can be terminated). Empty matches advance lastIndex, by a whole code point with the u flag.
 */
export const WORKER_SOURCE = `"use strict";
function pack(m) {
  var groups = [];
  for (var i = 1; i < m.length; i++) groups.push(m[i] === undefined ? null : m[i]);
  var named = null;
  if (m.groups) {
    named = {};
    for (var key in m.groups) named[key] = m.groups[key] === undefined ? null : m.groups[key];
  }
  return { index: m.index, end: m.index + m[0].length, text: m[0], groups: groups, named: named };
}
self.onmessage = function (event) {
  var req = event.data;
  var re;
  try {
    re = new RegExp(req.pattern, req.flags);
  } catch (error) {
    self.postMessage({ id: req.id, ok: false, error: String(error && error.message ? error.message : error) });
    return;
  }
  var text = req.text;
  var matches = [];
  var total = 0;
  var capped = false;
  if (re.global) {
    var m;
    while ((m = re.exec(text)) !== null) {
      total++;
      if (matches.length < req.limit) matches.push(pack(m));
      if (m[0] === "") {
        var at = re.lastIndex;
        var hi = text.charCodeAt(at);
        var lo = text.charCodeAt(at + 1);
        var pair = hi >= 0xd800 && hi <= 0xdbff && lo >= 0xdc00 && lo <= 0xdfff;
        re.lastIndex = re.unicode && pair ? at + 2 : at + 1;
      }
      if (total >= req.countLimit) {
        capped = true;
        break;
      }
    }
  } else {
    var one = re.exec(text);
    if (one) {
      total = 1;
      matches.push(pack(one));
    }
  }
  re.lastIndex = 0;
  var replaced = text.replace(re, req.replacement);
  self.postMessage({ id: req.id, ok: true, total: total, capped: capped, matches: matches, replaced: replaced });
};
`;

export type Segment = { text: string; start: number; match: number };

/**
 * Splits text into plain segments (match = -1) and highlighted ones (match = ordinal).
 * Empty, out-of-order or overlapping ranges are skipped.
 */
export function buildSegments(
  text: string,
  ranges: readonly { index: number; end: number }[],
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  ranges.forEach((range, ordinal) => {
    const start = Math.max(range.index, 0);
    const end = Math.min(range.end, text.length);
    if (end <= start || start < cursor) return;
    if (start > cursor)
      segments.push({ text: text.slice(cursor, start), start: cursor, match: -1 });
    segments.push({ text: text.slice(start, end), start, match: ordinal });
    cursor = end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), start: cursor, match: -1 });
  return segments;
}

/** Splits a pasted "/pattern/flags" literal; returns null for anything else. */
export function parseSlashPattern(input: string): { pattern: string; flags: string } | null {
  const match = /^\/([\s\S]+)\/([dgimsuvy]*)$/.exec(input.trim());
  if (!match) return null;
  return { pattern: match[1], flags: match[2] };
}

const ERROR_HINTS: [RegExp, string][] = [
  [/unterminated group|missing \)/i, "缺少右括号 )"],
  [/unmatched '\)'|unmatched parentheses|unbalanced parenthes/i, "多了一个右括号 )"],
  [/unterminated character class|missing terminating \]/i, "缺少右方括号 ]"],
  [
    /nothing to repeat|quantifier without|invalid quantifier/i,
    "量词（* + ? {n}）前面没有可以重复的内容",
  ],
  [/\\ at end of pattern/i, "末尾多了一个反斜杠 \\"],
  [/numbers out of order/i, "量词 {m,n} 里的 m 不能大于 n"],
  [/range out of order/i, "字符范围顺序反了，比如 [z-a]"],
  [/duplicate capture group name/i, "命名分组的名称重复了"],
  [/invalid capture group name/i, "命名分组的名称不合法"],
  [/invalid named (capture )?reference/i, "引用了不存在的命名分组"],
  [/lone quantifier brackets/i, "花括号 { } 用法不对，开启 u 标志时需要写成 \\{ \\}"],
  [/invalid (unicode )?escape|invalid escape/i, "转义写法不对，开启 u 标志时检查更严格"],
  [/invalid group/i, "分组写法不对，比如 (? 后面缺少 : = ! 或 <名称>"],
];

export function describeRegexError(message: string): string {
  const detail = message.replace(
    /^(?:SyntaxError: )?Invalid regular expression: \/[\s\S]*\/[a-z]*: /,
    "",
  );
  const hint = ERROR_HINTS.find(([pattern]) => pattern.test(detail))?.[1];
  return `正则表达式有误：${hint ? `${hint}（${detail}）` : detail}`;
}

export type Preset = { label: string; pattern: string; sample: string };

export const PRESETS: Preset[] = [
  { label: "手机号", pattern: "1[3-9]\\d{9}", sample: "13812345678" },
  {
    label: "邮箱",
    pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
    sample: "hello@example.com",
  },
  {
    label: "网址",
    pattern: "https?://[^\\s\"'<>，。；！？）]+",
    sample: "https://example.com/a?b=1",
  },
  {
    label: "身份证号",
    pattern: "[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]",
    sample: "11010519491231002X",
  },
  { label: "中文字符", pattern: "[\\u4e00-\\u9fa5]+", sample: "中文" },
  {
    label: "IPv4",
    pattern:
      "\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\b",
    sample: "192.168.1.1",
  },
  {
    label: "日期",
    pattern: "(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])",
    sample: "2026-07-15",
  },
  { label: "邮政编码", pattern: "(?<!\\d)[1-9]\\d{5}(?!\\d)", sample: "266000" },
];

export const MOODS = ["开心", "难过", "焦虑", "迷茫", "生气", "想念", "感恩", "碎碎念"] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_COLORS: Record<Mood, "success" | "info" | "warning" | "danger" | "neutral" | "brand" | "accent"> = {
  开心: "success",
  难过: "info",
  焦虑: "warning",
  迷茫: "neutral",
  生气: "danger",
  想念: "accent",
  感恩: "brand",
  碎碎念: "neutral",
};

// `#标签`: letters, digits or underscores right after a "#" that doesn't sit inside a word (so "C#" isn't one).
const TAG_SOURCE = String.raw`(?<![\p{L}\p{N}_&])#([\p{L}\p{N}_]+)`;
const TAG_MAX_LENGTH = 16;
export const MAX_TAGS = 5;

function isTagWord(word: string): boolean {
  return word.length <= TAG_MAX_LENGTH && !/^\d+$/.test(word);
}

export function isValidTag(tag: string): boolean {
  return /^[\p{L}\p{N}_]+$/u.test(tag) && isTagWord(tag);
}

/** Distinct lower-cased tags in the order they appear, at most MAX_TAGS. */
export function extractTags(text: string): string[] {
  const tags: string[] = [];
  for (const match of text.matchAll(new RegExp(TAG_SOURCE, "gu"))) {
    const tag = match[1].toLowerCase();
    if (!isTagWord(tag) || tags.includes(tag)) continue;
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

export type TextSegment = { text: string; tag?: string };

/** Splits post text into plain runs and `#tag` runs for rendering. */
export function splitTags(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(TAG_SOURCE, "gu"))) {
    if (!isTagWord(match[1])) continue;
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: match[0], tag: match[1].toLowerCase() });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

export const REPORT_REASONS = ["广告引流", "色情低俗", "人身攻击", "泄露隐私", "违法违规", "其他"] as const;

export const LIMITS = {
  post: { min: 2, max: 1000 },
  comment: { min: 1, max: 500 },
  question: { min: 2, max: 500 },
  answer: { min: 1, max: 3000 },
};

/** Reports from this many different users hide the content until an admin reviews it. */
export const REPORT_HIDE_THRESHOLD = 3;

export const CRISIS_LINES = [
  { name: "全国心理援助热线", phone: "12356" },
  { name: "希望 24 热线", phone: "400-161-9995" },
  { name: "北京心理危机研究与干预中心", phone: "010-82951332" },
];

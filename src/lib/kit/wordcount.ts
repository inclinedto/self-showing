/** 字数统计和文本清理，纯函数，供 /tools/wordcount 使用。 */

export type TextStats = {
  /** 总字符数（含空格，不含换行），按 Unicode 码点计。 */
  total: number;
  /** 不含任何空白的字符数。 */
  noSpaces: number;
  hanzi: number;
  englishWords: number;
  /** 连续数字（含小数、千分位）算一个。 */
  numbers: number;
  punctuation: number;
  lines: number;
  paragraphs: number;
  /** 预计阅读分钟数（未取整）。 */
  readingMinutes: number;
};

const HAN = /\p{Script=Han}/gu;
const WORD = /\p{Script=Latin}+(?:['’-]\p{Script=Latin}+)*/gu;
const NUMBER =
  /[0-9０-９]{1,3}(?:,[0-9０-９]{3})+(?:\.[0-9０-９]+)?|[0-9０-９]+(?:\.[0-9０-９]+)?/g;
const PUNCT = /\p{P}/gu;
const NEWLINE = /\r\n|\r|\n/;
const NEWLINE_KEEP = /(\r\n|\r|\n)/;

function countMatches(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  let count = 0;
  while (pattern.exec(text)) count++;
  return count;
}

function countCodePoints(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) i++;
    }
    count++;
  }
  return count;
}

export function countText(text: string): TextStats {
  const hanzi = countMatches(text, HAN);
  const englishWords = countMatches(text, WORD);
  const lineList = text ? text.split(NEWLINE) : [];
  return {
    total: countCodePoints(text.replace(/[\r\n]/g, "")),
    noSpaces: countCodePoints(text.replace(/\s/g, "")),
    hanzi,
    englishWords,
    numbers: countMatches(text, NUMBER),
    punctuation: countMatches(text.replace(NUMBER, "0"), PUNCT),
    lines: lineList.length,
    paragraphs: lineList.filter((line) => line.trim()).length,
    readingMinutes: hanzi / 400 + englishWords / 200,
  };
}

export function formatReadingTime(minutes: number): string {
  if (minutes <= 0) return "0 分钟";
  if (minutes < 1) return "不到 1 分钟";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `约 ${rounded} 分钟`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `约 ${hours} 小时 ${rest} 分钟` : `约 ${hours} 小时`;
}

const URL_LIKE =
  /(?:https?|ftp):\/\/[^\s<>"'，。；！？、）】》]+|www\.[^\s<>"'，。；！？、）】》]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** Applies `transform` to the text between URLs / e-mail addresses, leaving those untouched. */
function outsideUrls(text: string, transform: (part: string) => string): string {
  let result = "";
  let last = 0;
  URL_LIKE.lastIndex = 0;
  for (let match = URL_LIKE.exec(text); match; match = URL_LIKE.exec(text)) {
    result += transform(text.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return result + transform(text.slice(last));
}

const AFTER_CJK = "(?<=[\\p{Script=Han}”’）》」』】])";
const ELLIPSIS = new RegExp(`${AFTER_CJK}(?:\\.{3,}|…+)`, "gu");
const PERIOD = new RegExp(`${AFTER_CJK}\\.(?=\\s|$)`, "gu");
const QUOTE = /"|'(?=\p{Script=Han})|(?<=[\p{Script=Han}，。；：？！…])'/gu;

/** Opening/closing quotes alternate within each line. */
function curlQuotes(line: string): string {
  let doubleOpen = true;
  let singleOpen = true;
  return line.replace(QUOTE, (quote) => {
    if (quote === '"') {
      doubleOpen = !doubleOpen;
      return doubleOpen ? "”" : "“";
    }
    singleOpen = !singleOpen;
    return singleOpen ? "’" : "‘";
  });
}

function toChinesePunct(part: string): string {
  const converted = part
    .split(NEWLINE_KEEP)
    .map(curlQuotes)
    .join("")
    .replace(ELLIPSIS, "……")
    .replace(PERIOD, "。")
    .replace(/(?<!\d),|,(?!\d)/g, "，")
    .replace(/;/g, "；")
    .replace(/(?<!\d):|:(?!\d)/g, "：")
    .replace(/\?/g, "？")
    .replace(/!/g, "！")
    .replace(/\(/g, "（")
    .replace(/\)/g, "）");
  return converted
    .replace(/([，。；：？！）])[ \t]+/g, "$1")
    .replace(/[ \t]+([，。；：？！）])/g, "$1");
}

/** 英文标点 → 中文标点。句点只在汉字后、空白或结尾前才转换，网址和邮箱保持原样。 */
export function toChinesePunctuation(text: string): string {
  return outsideUrls(text, toChinesePunct);
}

const ZH_TO_EN: Record<string, string> = {
  "，": ",",
  "、": ",",
  "。": ".",
  "；": ";",
  "：": ":",
  "？": "?",
  "！": "!",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "（": "(",
  "）": ")",
  "【": "[",
  "】": "]",
  "《": '"',
  "》": '"',
  "「": '"',
  "」": '"',
  "『": "'",
  "』": "'",
  "——": "--",
  "……": "...",
  "…": "...",
  "～": "~",
};

const SPACE_AFTER = new Set(["，", "、", "。", "；", "：", "？", "！"]);
const ZH_PUNCT = /——|……|[，、。；：？！“”‘’（）【】《》「」『』…～]/g;

/** 中文标点 → 英文标点，逗号句号等后面补一个空格（行尾和连续标点除外）。 */
export function toEnglishPunctuation(text: string): string {
  return text.replace(ZH_PUNCT, (mark: string, offset: number, whole: string) => {
    const replacement = ZH_TO_EN[mark] ?? mark;
    if (!SPACE_AFTER.has(mark)) return replacement;
    const next = whole.charAt(offset + mark.length);
    if (!next || /\s/.test(next) || /\p{P}/u.test(next)) return replacement;
    return `${replacement} `;
  });
}

/** 连续多个空行合并成一个，并去掉开头和结尾的空行。 */
export function collapseBlankLines(text: string): string {
  const kept: string[] = [];
  for (const line of text.split(NEWLINE)) {
    const blank = !line.trim();
    if (blank && (kept.length === 0 || kept[kept.length - 1] === "")) continue;
    kept.push(blank ? "" : line);
  }
  if (kept[kept.length - 1] === "") kept.pop();
  return kept.join("\n");
}

/** 去掉每行开头和结尾的空白（含全角空格）。 */
export function trimLines(text: string): string {
  return text
    .split(NEWLINE)
    .map((line) => line.trim())
    .join("\n");
}

/** 全角字母和数字 → 半角；全角标点保持不变。 */
export function toHalfwidthAlnum(text: string): string {
  return text.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

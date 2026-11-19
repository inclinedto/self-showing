/** 编码转换的纯函数：Base64、URL、Unicode、HTML 实体、十六进制、摩斯电码。出错时抛出带中文说明的 Error。 */

export type CodecKind = "base64" | "url" | "unicode" | "html" | "hex" | "morse";

export type CodecOptions = {
  urlSafe: boolean;
  keepStructure: boolean;
  escapeAll: boolean;
  htmlNonAscii: boolean;
  hexNoSpace: boolean;
  hexUpper: boolean;
};

export const DEFAULT_OPTIONS: CodecOptions = {
  urlSafe: false,
  keepStructure: false,
  escapeAll: false,
  htmlNonAscii: false,
  hexNoSpace: false,
  hexUpper: false,
};

const utf8 = new TextEncoder();

function decodeUtf8(bytes: Uint8Array, source: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${source}解出的字节不是有效的 UTF-8 文本，可能是图片等二进制数据或其他编码`);
  }
}

/* ---------------- Base64 ---------------- */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_INDEX = new Map(Array.from(B64, (char, index) => [char, index]));

export function base64Encode(text: string, urlSafe = false): string {
  const bytes = utf8.encode(text);
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const rest = bytes.length - i;
    const n =
      (bytes[i] << 16) | ((rest > 1 ? bytes[i + 1] : 0) << 8) | (rest > 2 ? bytes[i + 2] : 0);
    parts.push(
      B64[(n >> 18) & 63] +
        B64[(n >> 12) & 63] +
        (rest > 1 ? B64[(n >> 6) & 63] : "=") +
        (rest > 2 ? B64[n & 63] : "="),
    );
  }
  const out = parts.join("");
  return urlSafe ? out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : out;
}

/** Accepts the standard and URL-safe alphabets, whitespace, a data: URL prefix and missing padding. */
export function base64Decode(input: string): string {
  const clean = input
    .replace(/^\s*data:[^,]*;base64,/i, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");
  const bad = /[^A-Za-z0-9+/]/.exec(clean);
  if (bad) throw new Error(`包含 Base64 不允许的字符“${bad[0]}”`);
  if (clean.length % 4 === 1) throw new Error("Base64 长度不对，可能复制时少了字符");
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let byte = 0;
  for (let i = 0; i < clean.length; i += 4) {
    let n = 0;
    for (let j = 0; j < 4; j++) n = (n << 6) | (B64_INDEX.get(clean[i + j]) ?? 0);
    bytes[byte++] = n >> 16;
    if (byte < bytes.length) bytes[byte++] = (n >> 8) & 255;
    if (byte < bytes.length) bytes[byte++] = n & 255;
  }
  return decodeUtf8(bytes, "Base64 ");
}

/* ---------------- URL ---------------- */

export function urlEncode(text: string, keepStructure = false): string {
  try {
    return keepStructure ? encodeURI(text) : encodeURIComponent(text);
  } catch {
    throw new Error("文本里有无法编码的字符（不成对的 UTF-16 代理项）");
  }
}

export function urlDecode(text: string): string {
  const bad = /%(?![0-9a-fA-F]{2})/.exec(text);
  if (bad) {
    const snippet = text.slice(bad.index, bad.index + 3);
    throw new Error(
      `第 ${bad.index + 1} 个字符处的“${snippet}”不是合法的百分号编码，% 后面应该跟两位十六进制数`,
    );
  }
  try {
    return decodeURIComponent(text);
  } catch {
    throw new Error("百分号编码解出的字节不是有效的 UTF-8，原文可能是 GBK 等其他编码");
  }
}

/* ---------------- Unicode ---------------- */

/** Escapes non-ASCII UTF-16 code units (or all of them) as \uXXXX; astral characters become two escapes. */
export function unicodeEscape(text: string, all = false): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += all || code > 0x7f ? `\\u${code.toString(16).padStart(4, "0")}` : text[i];
  }
  return out;
}

export function unicodeUnescape(text: string): string {
  return text.replace(
    /\\u\{([0-9a-fA-F]{1,8})\}|\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{8})/g,
    (match: string, braced?: string, four?: string, eight?: string) => {
      const code = Number.parseInt(braced ?? four ?? eight ?? "", 16);
      if (four) return String.fromCharCode(code);
      if (code > 0x10ffff) throw new Error(`“${match}”超出了 Unicode 的范围（最大 10FFFF）`);
      return String.fromCodePoint(code);
    },
  );
}

/* ---------------- HTML entities ---------------- */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function htmlEncode(text: string, nonAscii = false): string {
  const out = text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
  if (!nonAscii) return out;
  return out.replace(
    /[\u0080-\u{10ffff}]/gu,
    (char) => `&#x${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()};`,
  );
}

const NAMED_ENTITIES = new Map<string, string>([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", "\u00a0"],
  ["copy", "©"],
  ["reg", "®"],
  ["trade", "™"],
  ["yen", "¥"],
  ["euro", "€"],
  ["pound", "£"],
  ["cent", "¢"],
  ["hellip", "…"],
  ["mdash", "—"],
  ["ndash", "–"],
  ["laquo", "«"],
  ["raquo", "»"],
  ["ldquo", "“"],
  ["rdquo", "”"],
  ["lsquo", "‘"],
  ["rsquo", "’"],
  ["middot", "·"],
  ["bull", "•"],
  ["times", "×"],
  ["divide", "÷"],
  ["plusmn", "±"],
  ["deg", "°"],
  ["sect", "§"],
  ["para", "¶"],
  ["micro", "µ"],
  ["sup2", "²"],
  ["sup3", "³"],
  ["frac12", "½"],
  ["frac14", "¼"],
  ["frac34", "¾"],
  ["larr", "←"],
  ["rarr", "→"],
  ["uarr", "↑"],
  ["darr", "↓"],
  ["hearts", "♥"],
  ["ensp", "\u2002"],
  ["emsp", "\u2003"],
  ["thinsp", "\u2009"],
  ["shy", "\u00ad"],
]);

/** Decodes named, decimal and hex entities without touching the DOM; unknown names are left as-is. */
export function htmlDecode(text: string): string {
  return text.replace(
    /&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|([a-zA-Z][a-zA-Z0-9]*));/g,
    (match: string, hex?: string, dec?: string, name?: string) => {
      if (name) return NAMED_ENTITIES.get(name) ?? match;
      const code = hex ? Number.parseInt(hex, 16) : Number.parseInt(dec ?? "", 10);
      if (!(code > 0) || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "\ufffd";
      return String.fromCodePoint(code);
    },
  );
}

/* ---------------- Hex ---------------- */

export function hexEncode(text: string, spaced = true, upper = false): string {
  const out = Array.from(utf8.encode(text), (byte) => byte.toString(16).padStart(2, "0")).join(
    spaced ? " " : "",
  );
  return upper ? out.toUpperCase() : out;
}

/** Tolerates spaces, commas, newlines and 0x / \x prefixes. */
export function hexDecode(input: string): string {
  const tokens = input
    .replace(/0x|\\x/gi, " ")
    .split(/[\s,;:]+/)
    .filter(Boolean);
  let digits = "";
  for (const token of tokens) {
    const bad = /[^0-9a-fA-F]/.exec(token);
    if (bad) throw new Error(`“${bad[0]}”不是十六进制字符，只能包含 0-9 和 A-F`);
    if (token.length % 2 === 0) digits += token;
    else if (token.length === 1 && tokens.length > 1) digits += `0${token}`;
    else throw new Error(`“${token}”的位数是奇数，少了半个字节`);
  }
  const bytes = new Uint8Array(digits.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(digits.slice(i * 2, i * 2 + 2), 16);
  }
  return decodeUtf8(bytes, "十六进制");
}

/* ---------------- Morse ---------------- */

const MORSE = new Map<string, string>([
  ["A", ".-"],
  ["B", "-..."],
  ["C", "-.-."],
  ["D", "-.."],
  ["E", "."],
  ["F", "..-."],
  ["G", "--."],
  ["H", "...."],
  ["I", ".."],
  ["J", ".---"],
  ["K", "-.-"],
  ["L", ".-.."],
  ["M", "--"],
  ["N", "-."],
  ["O", "---"],
  ["P", ".--."],
  ["Q", "--.-"],
  ["R", ".-."],
  ["S", "..."],
  ["T", "-"],
  ["U", "..-"],
  ["V", "...-"],
  ["W", ".--"],
  ["X", "-..-"],
  ["Y", "-.--"],
  ["Z", "--.."],
  ["0", "-----"],
  ["1", ".----"],
  ["2", "..---"],
  ["3", "...--"],
  ["4", "....-"],
  ["5", "....."],
  ["6", "-...."],
  ["7", "--..."],
  ["8", "---.."],
  ["9", "----."],
  [".", ".-.-.-"],
  [",", "--..--"],
  ["?", "..--.."],
  ["'", ".----."],
  ["!", "-.-.--"],
  ["/", "-..-."],
  ["(", "-.--."],
  [")", "-.--.-"],
  ["&", ".-..."],
  [":", "---..."],
  [";", "-.-.-."],
  ["=", "-...-"],
  ["+", ".-.-."],
  ["-", "-....-"],
  ["_", "..--.-"],
  ['"', ".-..-."],
  ["$", "...-..-"],
  ["@", ".--.-."],
]);
const MORSE_REVERSE = new Map(Array.from(MORSE, ([char, code]) => [code, char]));

/** Characters (deduplicated) that Morse code cannot represent, e.g. Chinese. */
export function unsupportedMorseChars(text: string): string[] {
  const found = new Set<string>();
  for (const char of text.toUpperCase()) {
    if (!/\s/.test(char) && !MORSE.has(char)) found.add(char);
  }
  return [...found];
}

/** Letters separated by spaces, words by " / ", lines kept; unsupported characters are skipped. */
export function morseEncode(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) =>
      line
        .split(/\s+/)
        .map((word) =>
          Array.from(word.toUpperCase(), (char) => MORSE.get(char))
            .filter(Boolean)
            .join(" "),
        )
        .filter(Boolean)
        .join(" / "),
    )
    .join("\n");
}

/** Accepts . - as well as · • — – _; words split by / or |; unknown codes become "?". */
export function morseDecode(input: string): string {
  const normalized = input.replace(/[·•∙⋅]/g, ".").replace(/[—–−－_]/g, "-");
  const bad = /[^.\-\s/|]/.exec(normalized);
  if (bad) throw new Error(`摩斯电码只能包含点（.）、划（-）、空格和 /，发现了“${bad[0]}”`);
  return normalized
    .split(/\r\n|\r|\n/)
    .map((line) =>
      line
        .split(/\s*[/|]\s*|\s{3,}/)
        .map((word) =>
          word
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((code) => MORSE_REVERSE.get(code) ?? "?")
            .join(""),
        )
        .filter(Boolean)
        .join(" "),
    )
    .join("\n");
}

/* ---------------- Dispatcher ---------------- */

export function runCodec(
  kind: CodecKind,
  direction: "encode" | "decode",
  input: string,
  options: CodecOptions = DEFAULT_OPTIONS,
): string {
  const encode = direction === "encode";
  switch (kind) {
    case "base64":
      return encode ? base64Encode(input, options.urlSafe) : base64Decode(input);
    case "url":
      return encode ? urlEncode(input, options.keepStructure) : urlDecode(input.trim());
    case "unicode":
      return encode ? unicodeEscape(input, options.escapeAll) : unicodeUnescape(input);
    case "html":
      return encode ? htmlEncode(input, options.htmlNonAscii) : htmlDecode(input);
    case "hex":
      return encode ? hexEncode(input, !options.hexNoSpace, options.hexUpper) : hexDecode(input);
    case "morse":
      return encode ? morseEncode(input) : morseDecode(input);
  }
}

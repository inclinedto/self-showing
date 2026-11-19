export type ContentCheck = { ok: true; crisis: boolean } | { ok: false; reason: string };

// Mostly spam and illegal-trade phrases; ordinary emotional venting must never be blocked.
const BLOCKED = [
  "博彩", "网赌", "赌场", "百家乐", "六合彩", "时时彩", "彩票导师", "带你回本",
  "刷单", "兼职日结", "日结工资", "高额返利", "贷款秒批", "无抵押贷款", "套现", "洗钱",
  "代孕", "卖卵", "办证", "代开发票", "发票代开", "假证",
  "裸聊", "约炮", "援交", "包夜", "色情网站", "成人视频", "黄色网站",
  "冰毒", "海洛因", "摇头丸", "k粉", "出售枪支", "买卖枪支",
  "加我微信", "加我vx", "加v了解", "私聊有惊喜",
];

const CRISIS = [
  "自杀", "轻生", "不想活", "活不下去", "结束生命", "割腕", "跳楼", "寻死", "想死",
  "了结自己", "离开这个世界", "安眠药",
];

const LINK = /(https?:\/\/|www\.)\S+|[a-z0-9-]{2,}\.(com|cn|net|org|top|xyz|vip|cc|io|me|app|site|shop)\b/i;
const PHONE = /(?<!\d)1[3-9]\d{9}(?!\d)/;
const QQ = /(qq|扣扣|企鹅号)[^0-9a-z]{0,3}\d{5,11}/i;
const WECHAT = /(微信|威信|薇信|vx|wx|weixin|v信)[^a-z0-9]{0,3}[a-z][a-z0-9_-]{5,}/i;

function compact(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function findBlockedWord(text: string, extra: string[] = []): string | null {
  const normalized = compact(text);
  for (const word of [...BLOCKED, ...extra]) {
    const needle = compact(word);
    if (needle && normalized.includes(needle)) return word;
  }
  return null;
}

export function mentionsCrisis(text: string): boolean {
  const normalized = compact(text);
  return CRISIS.some((word) => normalized.includes(word));
}

/** Server-side rules for anonymous posts, comments and questions. */
export function checkContent(text: string, extraBlocked: string[] = []): ContentCheck {
  const normalized = text.normalize("NFKC");
  if (LINK.test(normalized)) {
    return { ok: false, reason: "为了防止广告，这里不能发布链接或网址。" };
  }
  const digits = normalized.replace(/[\s-]/g, "");
  if (PHONE.test(digits) || QQ.test(digits) || WECHAT.test(digits)) {
    return { ok: false, reason: "为了保护隐私，请不要留下手机号、微信、QQ 等联系方式。" };
  }
  if (/(.)\1{14,}/u.test(normalized.replace(/\s/g, ""))) {
    return { ok: false, reason: "重复的字符太多了，换个说法吧。" };
  }
  if (findBlockedWord(normalized, extraBlocked)) {
    return { ok: false, reason: "内容包含不允许发布的词语，请修改后再发。" };
  }
  return { ok: true, crisis: mentionsCrisis(normalized) };
}

export function extraBlockedWords(): string[] {
  return (process.env.BLOCKED_WORDS ?? "")
    .split(/[,，\n]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

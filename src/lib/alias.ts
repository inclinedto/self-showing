const ADJECTIVES = [
  "安静的", "勇敢的", "迷路的", "认真的", "爱笑的", "失眠的", "温柔的", "倔强的",
  "慢吞吞的", "好奇的", "发呆的", "乐观的", "害羞的", "努力的", "路过的", "想家的",
  "清醒的", "自由的", "爱哭的", "淡定的", "热乎乎的", "孤独的", "闪闪发光的", "随风的",
  "嘴硬的", "心软的", "早起的", "熬夜的", "偷偷开心的", "在等雨的", "晒太阳的", "会飞的",
  "不想上班的", "刚下课的", "吃饱了的", "有点累的", "正在长大的", "很想你的", "无所谓的", "慢慢变好的",
];

const NOUNS = [
  "猫咪", "柴犬", "企鹅", "松鼠", "刺猬", "海豚", "兔子", "考拉",
  "水獭", "熊猫", "仓鼠", "小鹿", "鲸鱼", "麻雀", "萤火虫", "蜗牛",
  "向日葵", "蒲公英", "仙人掌", "月亮", "星星", "云朵", "橘子", "西瓜",
  "奶茶", "布丁", "饭团", "风筝", "纸飞机", "灯塔", "邮筒", "雨伞",
  "旅人", "树懒", "狐狸", "海獭", "火烈鸟", "章鱼", "海星", "小熊",
];

const NOUN_EMOJI: Record<string, string> = {
  猫咪: "🐱", 柴犬: "🐕", 企鹅: "🐧", 松鼠: "🐿️", 刺猬: "🦔", 海豚: "🐬", 兔子: "🐰", 考拉: "🐨",
  水獭: "🦦", 熊猫: "🐼", 仓鼠: "🐹", 小鹿: "🦌", 鲸鱼: "🐳", 麻雀: "🐦", 萤火虫: "✨", 蜗牛: "🐌",
  向日葵: "🌻", 蒲公英: "🌼", 仙人掌: "🌵", 月亮: "🌙", 星星: "⭐", 云朵: "☁️", 橘子: "🍊", 西瓜: "🍉",
  奶茶: "🧋", 布丁: "🍮", 饭团: "🍙", 风筝: "🪁", 纸飞机: "✈️", 灯塔: "🏝️", 邮筒: "📮", 雨伞: "☂️",
  旅人: "🎒", 树懒: "🦥", 狐狸: "🦊", 海獭: "🦦", 火烈鸟: "🦩", 章鱼: "🐙", 海星: "🌟", 小熊: "🐻",
};

/** The avatar for an anonymous nickname: the emoji of its noun, e.g. "失眠的企鹅" → 🐧. */
export function aliasEmoji(alias: string): string {
  const noun = NOUNS.find((item) => alias.endsWith(item));
  return (noun && NOUN_EMOJI[noun]) || "🐚";
}

/** Maps a hex digest to a stable, friendly nickname such as "失眠的企鹅". */
export function aliasFromHex(hex: string): string {
  const value = Number.parseInt(hex.slice(0, 8), 16) || 0;
  const adjective = ADJECTIVES[value % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(value / ADJECTIVES.length) % NOUNS.length];
  return `${adjective}${noun}`;
}

export const ALIAS_COUNT = ADJECTIVES.length * NOUNS.length;

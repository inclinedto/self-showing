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

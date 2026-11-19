/**
 * 会员与额度配置。价格和爱发电方案 ID 先留空，确定后填在这里：
 * - price：售价（元），null 表示价格待定，页面显示「价格待定」且不能下单
 * - afdianPlanId：爱发电后台「方案」的 plan_id，留空则不能在线支付（仍可用兑换码开通）
 */

export const FEATURES = {
  extract: { label: "表格提取", unit: "页" },
  ask: { label: "文档问答", unit: "次" },
  chat: { label: "AI 小助手", unit: "条" },
  post: { label: "发树洞", unit: "条" },
  comment: { label: "树洞评论", unit: "条" },
  question: { label: "提问箱提问", unit: "条" },
} as const;

export type Feature = keyof typeof FEATURES;
export type Quotas = Record<Feature, number>;

export const FEATURE_KEYS = Object.keys(FEATURES) as Feature[];

/** 每日额度，按北京时间零点重置。 */
export const FREE_QUOTAS: Quotas = {
  extract: 5,
  ask: 10,
  chat: 20,
  post: 3,
  comment: 30,
  question: 3,
};

export const MEMBER_QUOTAS: Quotas = {
  extract: 200,
  ask: 200,
  chat: 300,
  post: 20,
  comment: 200,
  question: 20,
};

export type Plan = {
  id: string;
  name: string;
  /** 售价（元）。null = 价格待定。 */
  price: number | null;
  /** 原价，用于划线展示，可不填。 */
  originalPrice?: number;
  /** 每购买一份增加的会员天数。 */
  days: number;
  /** 爱发电方案 plan_id。 */
  afdianPlanId: string;
  note: string;
  recommended?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "month",
    name: "月度会员",
    price: null,
    days: 31,
    afdianPlanId: "",
    note: "先试一个月",
  },
  {
    id: "quarter",
    name: "季度会员",
    price: null,
    days: 92,
    afdianPlanId: "",
    note: "常用推荐",
    recommended: true,
  },
  {
    id: "year",
    name: "年度会员",
    price: null,
    days: 366,
    afdianPlanId: "",
    note: "长期使用最划算",
  },
];

/** 会员页顶部的介绍，写成你自己想对访客说的话。 */
export const MEMBERSHIP_INTRO =
  "这是站长一个人在维护的小网站。树洞、提问箱和小工具都会一直免费；经常用 AI 工具的话，开通会员可以拿到更多额度，也算请站长喝杯椰子水。";

/** 价格旁边的一行说明，比如「早鸟价：前 100 位会员享受，之后恢复原价」。留空则不显示。 */
export const PRICE_NOTE = "";

/** 会员人数达到这个数才在会员页显示「已有 N 位会员」。 */
export const SHOW_MEMBER_COUNT_FROM = 10;

export const MEMBER_PERKS = [
  "🤖 AI 工具每日额度大幅提升",
  "🌊 树洞、提问箱发帖额度提升",
  "✨ 新功能优先体验",
  "🥥 支持站长持续更新和维护",
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export function findPlanByAfdianId(afdianPlanId: string): Plan | undefined {
  if (!afdianPlanId) return undefined;
  return PLANS.find((plan) => plan.afdianPlanId === afdianPlanId);
}

export function quotasFor(isMember: boolean): Quotas {
  return isMember ? MEMBER_QUOTAS : FREE_QUOTAS;
}

export function isPurchasable(plan: Plan): boolean {
  return plan.price !== null && plan.price > 0 && plan.afdianPlanId !== "";
}

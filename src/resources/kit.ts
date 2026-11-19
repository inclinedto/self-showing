import type { IconName } from "./icons";

/** 小工具：全部在浏览器里运行，免费不限次。组件在 src/components/kit/tools/<slug>.tsx。 */

export type KitCategory = "text" | "dev" | "image" | "life";

export const KIT_CATEGORIES: { id: KitCategory; label: string }[] = [
  { id: "text", label: "文本" },
  { id: "dev", label: "开发" },
  { id: "image", label: "图片" },
  { id: "life", label: "生活" },
];

export type KitTool = {
  slug: string;
  name: string;
  icon: IconName;
  category: KitCategory;
  summary: string;
  /** Extra search terms for the tools page filter. */
  keywords: string[];
};

export const kitTools: KitTool[] = [
  {
    slug: "wordcount",
    name: "字数统计",
    icon: "textAa",
    category: "text",
    summary: "统计汉字、英文单词、标点和段落，估算阅读时间",
    keywords: ["字数", "计数", "word count", "全角", "半角"],
  },
  {
    slug: "diff",
    name: "文本对比",
    icon: "diff",
    category: "text",
    summary: "逐行或逐字比较两段文本，差异高亮显示",
    keywords: ["diff", "比较", "差异", "对比"],
  },
  {
    slug: "encode",
    name: "编码转换",
    icon: "code",
    category: "text",
    summary: "Base64、URL、Unicode、HTML 实体、摩斯电码互转",
    keywords: ["base64", "url", "unicode", "html", "摩斯", "morse", "编码", "解码"],
  },
  {
    slug: "daxie",
    name: "金额大写",
    icon: "banknotes",
    category: "text",
    summary: "数字转人民币大写，开票、报销、写合同用",
    keywords: ["大写", "人民币", "金额", "数字"],
  },
  {
    slug: "json",
    name: "JSON 格式化",
    icon: "brackets",
    category: "dev",
    summary: "格式化、压缩、校验 JSON，错误定位到行列",
    keywords: ["json", "格式化", "压缩", "校验"],
  },
  {
    slug: "timestamp",
    name: "时间戳转换",
    icon: "clock",
    category: "dev",
    summary: "Unix 时间戳和北京时间互相转换，秒和毫秒自动识别",
    keywords: ["时间戳", "timestamp", "unix", "时间"],
  },
  {
    slug: "regex",
    name: "正则测试",
    icon: "regex",
    category: "dev",
    summary: "实时高亮匹配结果，查看分组，预览替换",
    keywords: ["正则", "regex", "regexp", "匹配", "替换"],
  },
  {
    slug: "hash",
    name: "哈希计算",
    icon: "fingerprint",
    category: "dev",
    summary: "计算文本或文件的 MD5、SHA-1、SHA-256、SHA-512",
    keywords: ["md5", "sha1", "sha256", "hash", "哈希", "校验"],
  },
  {
    slug: "radix",
    name: "进制转换",
    icon: "binary",
    category: "dev",
    summary: "二、八、十、十六进制及任意进制互转，支持大数",
    keywords: ["进制", "二进制", "十六进制", "hex", "binary"],
  },
  {
    slug: "password",
    name: "密码生成",
    icon: "key",
    category: "dev",
    summary: "生成高强度随机密码、随机字符串和 UUID",
    keywords: ["密码", "随机", "uuid", "password", "字符串"],
  },
  {
    slug: "qrcode",
    name: "二维码生成",
    icon: "qrcode",
    category: "image",
    summary: "文字、链接、Wi-Fi 生成二维码，可改颜色并下载",
    keywords: ["二维码", "qr", "qrcode", "wifi"],
  },
  {
    slug: "grid",
    name: "九宫格切图",
    icon: "gridNine",
    category: "image",
    summary: "一张图切成九宫格，发朋友圈、小红书刚刚好",
    keywords: ["九宫格", "切图", "朋友圈", "小红书", "拼图"],
  },
  {
    slug: "watermark",
    name: "图片加水印",
    icon: "stamp",
    category: "image",
    summary: "给照片、证件加平铺文字水印，防止被挪用",
    keywords: ["水印", "watermark", "证件", "防盗"],
  },
  {
    slug: "color",
    name: "颜色工具",
    icon: "palette",
    category: "image",
    summary: "HEX、RGB、HSL 互转，生成色阶，检查文字对比度",
    keywords: ["颜色", "color", "hex", "rgb", "hsl", "对比度", "配色"],
  },
  {
    slug: "datecalc",
    name: "日期计算",
    icon: "calendar",
    category: "life",
    summary: "两个日期相差几天，某天往后推多少天是哪天",
    keywords: ["日期", "天数", "倒数日", "间隔", "星期"],
  },
  {
    slug: "unit",
    name: "单位换算",
    icon: "ruler",
    category: "life",
    summary: "长度、重量、面积、体积、温度、存储，含斤两亩等市制",
    keywords: ["单位", "换算", "长度", "重量", "温度", "斤", "亩"],
  },
  {
    slug: "loan",
    name: "房贷计算器",
    icon: "house",
    category: "life",
    summary: "等额本息、等额本金月供和总利息，附还款计划表",
    keywords: ["房贷", "贷款", "月供", "等额本息", "等额本金", "利息"],
  },
  {
    slug: "decide",
    name: "今天吃什么",
    icon: "dice",
    category: "life",
    summary: "选择困难就交给它：随机吃什么、抛硬币、掷骰子、抽签",
    keywords: ["吃什么", "随机", "抛硬币", "骰子", "抽签", "选择困难"],
  },
];

export function getKitTool(slug: string): KitTool | undefined {
  return kitTools.find((tool) => tool.slug === slug);
}

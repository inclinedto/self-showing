import type { Feature } from "./plans";
import type { IconName } from "./icons";

export type Tool = {
  slug: string;
  path: `/${string}`;
  name: string;
  icon: IconName;
  summary: string;
  description: string;
  highlights: string[];
  /** Tools without a metered feature run entirely in the browser and are free. */
  feature?: Feature;
};

export type NavItem = { href: `/${string}`; label: string; icon: IconName };

export const site = {
  name: "角度偏爱",
  title: "角度偏爱 · 匿名树洞与夏日小工具",
  description:
    "一个可以匿名说心里话的树洞和提问箱，顺便放了二十多个顺手的小工具：AI 表格提取、文档问答、格式转换，还有二维码、九宫格切图、房贷计算……",
  tagline: "说给陌生人听的话，和几个顺手的小工具。",
  quote: {
    text: "Shall I compare thee to a summer’s day?",
    source: "William Shakespeare, Sonnet 18",
    translation: "我能否将你比作夏日？",
  },
  baseURL: "https://www.zhangjinshuai.buzz",
  /** Shown on the legal pages and the footer; leave empty to hide. */
  contactEmail: "",
  owner: "站长",
};

export const tools: Tool[] = [
  {
    slug: "extract",
    path: "/tools/extract",
    name: "表格提取",
    icon: "table",
    summary: "PDF、图片里的表格一键变成 Excel",
    description:
      "上传 PDF 或图片（扫描件、截图、手机拍照都可以），AI 自动识别其中的表格，或按你指定的字段提取信息，结果可在线修改并导出 Excel、CSV、JSON。",
    highlights: ["支持扫描件和手机拍照", "可按自定义字段提取", "结果可编辑，导出 Excel"],
    feature: "extract",
  },
  {
    slug: "ask",
    path: "/tools/ask",
    name: "文档问答",
    icon: "chat",
    summary: "对长文档提问，答案逐句标注出处",
    description:
      "上传 PDF、Word 或文本文档，直接用自然语言提问。每句回答都会标注来自第几页，并自动核查答案和原文是否一致，减少 AI 胡编。",
    highlights: ["回答逐句标注页码", "自动核查答案与原文", "文档在浏览器本地解析"],
    feature: "ask",
  },
  {
    slug: "chat",
    path: "/tools/chat",
    name: "AI 小助手",
    icon: "sparkles",
    summary: "写作、翻译、答疑，随时聊两句",
    description:
      "一个中文 AI 对话助手，可以帮你写文案、润色、翻译、解释概念、整理思路。对话记录只保存在你自己的浏览器里。",
    highlights: ["流式输出，回复快", "支持 Markdown 和代码", "记录只存在本机"],
    feature: "chat",
  },
  {
    slug: "convert",
    path: "/tools/convert",
    name: "格式转换",
    icon: "convert",
    summary: "图片转换压缩、PDF 合并拆分，免费",
    description:
      "图片格式转换与压缩、图片合成 PDF、PDF 转图片、PDF 合并与拆分。全部在浏览器本地完成，文件不会上传，不限次数。",
    highlights: ["文件不上传，更放心", "免费不限次数", "批量处理，一键打包"],
  },
];

export const community = [
  {
    path: "/treehole",
    name: "树洞",
    icon: "tree",
    summary: "匿名说说心里话",
    description:
      "每条树洞都用随机昵称发布，没人知道你是谁。开心、难过、焦虑都可以说，也可以给别人一个抱抱。",
  },
  {
    path: "/box",
    name: "提问箱",
    icon: "inbox",
    summary: "匿名向站长提问",
    description: "想问站长什么都可以，匿名投递。站长回答后，公开的问题会展示在提问箱里。",
  },
] as const satisfies { path: `/${string}`; name: string; icon: IconName; summary: string; description: string }[];

export const nav: NavItem[] = [
  { href: "/treehole", label: "树洞", icon: "tree" },
  { href: "/box", label: "提问箱", icon: "inbox" },
  { href: "/tools", label: "工具", icon: "grid" },
  { href: "/pricing", label: "会员", icon: "crown" },
];

export function getTool(slug: string): Tool {
  const tool = tools.find((item) => item.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

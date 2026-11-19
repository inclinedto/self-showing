import type { ChatTurn, Excerpt } from "@/lib/types";
import type { ChatMessage } from "./ai";

const TABLE_JSON_SHAPE = `{"tables":[{"title":"表格标题","headers":["列1","列2"],"rows":[["值","值"]]}]}`;

export function extractTablesPrompt(instructions: string): string {
  return [
    "你是一个精确的表格数据提取引擎。识别图片中的所有表格，逐格转写为 JSON。",
    "规则：",
    "1. 原样转写文字和数字，不要翻译、改写、换算或补全；看不清的格子填空字符串。",
    "2. 合并单元格：把值复制到它覆盖的每一格。多级表头用“上级-下级”合并成一行表头。",
    "3. 每一行的格子数必须和表头数一致。",
    "4. title 用表格上方的标题或说明；没有就根据内容起一个简短的中文名。",
    '5. 图片里没有表格时返回 {"tables":[]}。',
    instructions ? `用户的补充要求：${instructions}` : "",
    `只输出 JSON，不要任何解释，格式：${TABLE_JSON_SHAPE}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractFieldsPrompt(fields: string[], instructions: string): string {
  return [
    "你是一个精确的信息提取引擎。从图片中提取下列字段：",
    fields.map((field, index) => `${index + 1}. ${field}`).join("\n"),
    "规则：",
    "1. 原样转写，不要猜测；找不到的字段填空字符串。",
    "2. 如果图片里有多条记录（例如多张发票、多行明细），每条记录输出一行。",
    `3. headers 必须严格等于：${JSON.stringify(fields)}。`,
    instructions ? `用户的补充要求：${instructions}` : "",
    `只输出 JSON，不要任何解释，格式：${TABLE_JSON_SHAPE}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatExcerpts(excerpts: Excerpt[]): string {
  return excerpts
    .map((excerpt) => `[${excerpt.id}]（${excerpt.label}）\n${excerpt.text}`)
    .join("\n\n");
}

export function askMessages(
  documentName: string,
  question: string,
  excerpts: Excerpt[],
  history: ChatTurn[],
): ChatMessage[] {
  const system = [
    "你是严谨的文档问答助手，只能依据用户提供的文档片段回答问题。",
    "规则：",
    "1. 每个包含事实的句子末尾都要用方括号标注依据的片段编号，例如 [2] 或 [1][3]。只能引用给出的编号。",
    "2. 片段里没有的信息，不要用常识或猜测补充；如果片段不足以回答，就明确说“文档中没有找到相关内容”，并说明找到了哪些相关信息。",
    "3. 数字、日期、名称必须与片段原文一致。",
    "4. 回答简洁、有条理，可以用列表。默认使用简体中文，用户用其他语言提问时用该语言回答。",
  ].join("\n");

  const context = `文档：《${documentName}》\n以下是与问题相关的片段：\n\n${formatExcerpts(excerpts)}`;

  return [
    { role: "system", content: system },
    ...history.map((turn) => ({ role: turn.role, content: turn.content }) as ChatMessage),
    { role: "user", content: `${context}\n\n问题：${question}` },
  ];
}

export function verifyMessages(answer: string, excerpts: Excerpt[]): ChatMessage[] {
  const system = [
    "你是事实核查员。把“待核查回答”拆成若干条事实陈述，逐条对照它引用的文档片段判断是否有依据。",
    "verdict 取值：supported（片段明确支持）、partial（部分支持或有夸大/遗漏）、unsupported（片段中找不到依据或与片段矛盾）。",
    "reason 用一句中文说明理由，指出具体是哪部分对不上。",
    "“文档中没有找到相关内容”这类说明本身不需要核查，跳过。",
    '只输出 JSON，不要任何解释，格式：{"claims":[{"claim":"陈述","citations":[1],"verdict":"supported","reason":"理由"}]}',
  ].join("\n");

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `文档片段：\n\n${formatExcerpts(excerpts)}\n\n待核查回答：\n${answer}`,
    },
  ];
}

export function chatMessages(siteName: string, history: ChatTurn[]): ChatMessage[] {
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  return [
    {
      role: "system",
      content: [
        `你是「${siteName}」的 AI 小助手，今天是 ${today}（北京时间）。`,
        "默认用简体中文回答，语气友好、简洁、直接，先给结论再展开。",
        "需要时使用 Markdown（列表、表格、代码块）。不知道或不确定的内容要直说，不要编造事实、数据或链接。",
        "如果用户表达了伤害自己的想法，请温和回应，并建议拨打心理援助热线 12356 或希望 24 热线 400-161-9995。",
      ].join("\n"),
    },
    ...history,
  ];
}

import type { ExtractResponse, Excerpt, VerifyResponse } from "@/lib/types";

export function demoExtract(mode: "tables" | "fields", fields: string[]): ExtractResponse {
  if (mode === "fields") {
    const sample: Record<string, string> = {
      发票号码: "24442000000012345678",
      开票日期: "2026年10月08日",
      金额: "1,280.00",
      税额: "76.80",
      销售方: "示例科技有限公司",
    };
    return {
      demo: true,
      tables: [
        {
          title: "字段提取（示例）",
          headers: fields,
          rows: [fields.map((field) => sample[field] ?? `示例${field}`)],
        },
      ],
    };
  }

  return {
    demo: true,
    tables: [
      {
        title: "2026 年季度销售汇总（示例）",
        headers: ["季度", "华南", "华东", "华北", "合计"],
        rows: [
          ["Q1", "1,250", "980", "760", "2,990"],
          ["Q2", "1,430", "1,120", "810", "3,360"],
          ["Q3", "1,610", "1,240", "905", "3,755"],
        ],
      },
    ],
  };
}

export function demoAnswer(question: string, excerpts: Excerpt[]): string {
  if (excerpts.length === 0) return "文档中没有找到相关内容。";
  const quote = (excerpt: Excerpt) => excerpt.text.replace(/\s+/g, " ").slice(0, 60);
  const lines = [`（演示回答）关于“${question.slice(0, 40)}”，文档中相关的内容如下：`, ""];
  for (const excerpt of excerpts.slice(0, 3)) {
    lines.push(`- ${excerpt.label}提到：“${quote(excerpt)}…” [${excerpt.id}]`);
  }
  lines.push("", "配置 AI 模型密钥后，这里会显示基于以上片段生成的真实回答。");
  return lines.join("\n");
}

export function demoVerify(answer: string): VerifyResponse {
  const claims = answer
    .split("\n")
    .filter((line) => /\[\d+\]/.test(line))
    .map((line) => ({
      claim: line.replace(/^-\s*/, "").replace(/\s*\[\d+\]/g, ""),
      citations: [...line.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])),
      verdict: "supported" as const,
      reason: "演示模式：引用内容直接摘自原文片段。",
    }));
  return { demo: true, claims };
}

/** Streams canned text in small pieces so the demo looks like a real streamed answer. */
export function streamText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pieces = text.match(/[\s\S]{1,6}/g) ?? [];
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (index >= pieces.length) {
        controller.close();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 15));
      controller.enqueue(encoder.encode(pieces[index++]));
    },
  });
}

export function demoChat(message: string): string {
  return [
    `（演示回答）你说的是：“${message.replace(/\s+/g, " ").slice(0, 60)}”。`,
    "",
    "站长还没有配置 AI 模型密钥，所以现在只能返回这段示例文字。配置好之后，这里会是真正的 AI 回复，支持：",
    "",
    "- **写作润色**：文案、邮件、周报",
    "- **翻译**：中英互译，保留语气",
    "- **答疑**：解释概念、整理思路",
    "",
    "```js",
    'console.log("Markdown 和代码块都能正常显示");',
    "```",
  ].join("\n");
}

import type { ChatTurn, Excerpt } from "@/lib/types";

export class ValidationError extends Error {}

export function requireString(value: unknown, name: string, max: number, min = 1): string {
  if (typeof value !== "string") throw new ValidationError(`缺少${name}。`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new ValidationError(`缺少${name}。`);
  if (trimmed.length > max) throw new ValidationError(`${name}太长了（最多 ${max} 字）。`);
  return trimmed;
}

export function optionalString(value: unknown, name: string, max: number): string {
  if (value === undefined || value === null || value === "") return "";
  return requireString(value, name, max);
}

export function parseExcerpts(value: unknown, maxTotal = 20000): Excerpt[] {
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError("缺少文档片段。");
  if (value.length > 40) throw new ValidationError("文档片段太多。");
  const excerpts = value.map((item) => ({
    id: Number(item?.id),
    label: requireString(item?.label, "片段位置", 40),
    text: requireString(item?.text, "片段内容", 3000),
  }));
  if (excerpts.some((excerpt) => !Number.isInteger(excerpt.id) || excerpt.id < 1)) {
    throw new ValidationError("片段编号无效。");
  }
  const total = excerpts.reduce((sum, excerpt) => sum + excerpt.text.length, 0);
  if (total > maxTotal) throw new ValidationError("文档片段总长度超出限制。");
  return excerpts;
}

/** Keeps the most recent turns within a character budget; the last turn must be the user's. */
export function parseConversation(value: unknown, maxTotal = 16000): ChatTurn[] {
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError("缺少对话内容。");
  const turns: ChatTurn[] = value
    .filter((turn) => (turn?.role === "user" || turn?.role === "assistant") && turn?.content)
    .map((turn) => ({ role: turn.role, content: String(turn.content) }));
  const last = turns.at(-1);
  if (!last || last.role !== "user") throw new ValidationError("缺少你的问题。");
  if (last.content.trim().length > 4000) throw new ValidationError("单条消息最多 4000 字。");

  const kept: ChatTurn[] = [];
  let total = 0;
  for (const turn of turns.slice(-20).reverse()) {
    const content = turn.content.slice(0, 6000);
    if (kept.length > 0 && total + content.length > maxTotal) break;
    kept.unshift({ role: turn.role, content });
    total += content.length;
  }
  while (kept[0]?.role === "assistant") kept.shift();
  return kept;
}

export function parseHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-8)
    .filter((turn) => (turn?.role === "user" || turn?.role === "assistant") && turn?.content)
    .map((turn) => ({
      role: turn.role,
      content: String(turn.content).slice(0, 4000),
    }));
}

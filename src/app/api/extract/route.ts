import { aiConfig, chat, parseJsonObject } from "@/lib/server/ai";
import { demoExtract } from "@/lib/server/demo";
import { HttpError, json, limitByIp, readJson, route } from "@/lib/server/http";
import { meter } from "@/lib/server/quota";
import { extractFieldsPrompt, extractTablesPrompt } from "@/lib/server/prompts";
import { optionalString, ValidationError } from "@/lib/server/validate";
import { normalizeTable } from "@/lib/tables";
import type { ExtractMode, ExtractResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
// Hong Kong keeps latency low for mainland visitors and for mainland-hosted model APIs.
export const preferredRegion = ["hkg1"];

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_LENGTH = 4_000_000;

function parseFields(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ValidationError("请至少填写一个要提取的字段。");
  const fields = [...new Set(value.map((field) => String(field).trim()).filter(Boolean))];
  if (fields.length === 0) throw new ValidationError("请至少填写一个要提取的字段。");
  if (fields.length > 30) throw new ValidationError("字段最多 30 个。");
  if (fields.some((field) => field.length > 40)) throw new ValidationError("字段名最多 40 个字。");
  return fields;
}

/** Re-orders columns to exactly the requested fields, whatever order the model used. */
function alignToFields(headers: string[], rows: string[][], fields: string[]) {
  const positions = fields.map((field) => headers.indexOf(field));
  if (
    positions.every((position, index) => position === index) &&
    headers.length === fields.length
  ) {
    return rows;
  }
  if (positions.every((position) => position === -1)) {
    return rows.map((row) => fields.map((_, index) => row[index] ?? ""));
  }
  return rows.map((row) =>
    positions.map((position) => (position === -1 ? "" : (row[position] ?? ""))),
  );
}

export const POST = route(async (request) => {
  limitByIp(request, "extract", 40, 10 * 60 * 1000);
  const body = await readJson(request);
  const image = typeof body.image === "string" ? body.image : "";
  if (!IMAGE_DATA_URL.test(image.slice(0, 64)) || image.length > MAX_IMAGE_LENGTH) {
    throw new ValidationError("图片格式不支持或文件过大。");
  }
  const mode: ExtractMode = body.mode === "fields" ? "fields" : "tables";
  const fields = mode === "fields" ? parseFields(body.fields) : [];
  const instructions = optionalString(body.instructions, "补充说明", 500);

  const usage = await meter(request, "extract");
  try {
    const config = aiConfig();
    if (config.demo) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return json(demoExtract(mode, fields));
    }

    const prompt =
      mode === "fields"
        ? extractFieldsPrompt(fields, instructions)
        : extractTablesPrompt(instructions);
    const content = await chat({
      model: config.visionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: prompt },
          ],
        },
      ],
      temperature: 0,
      maxTokens: 8000,
      signal: request.signal,
    });

    let parsed: { tables?: unknown };
    try {
      parsed = parseJsonObject(content);
    } catch {
      console.error("Unparseable extraction output", content.slice(0, 500));
      throw new HttpError(502, "AI 返回的结果格式有误，请重试这一页。", "ai_error");
    }

    const rawTables = Array.isArray(parsed.tables) ? parsed.tables : [];
    const tables = rawTables
      .map((raw) => normalizeTable(raw ?? {}))
      .filter((table): table is NonNullable<typeof table> => table !== null)
      .map((table) =>
        mode === "fields"
          ? { ...table, headers: fields, rows: alignToFields(table.headers, table.rows, fields) }
          : table,
      );

    return json({ tables } satisfies ExtractResponse);
  } catch (error) {
    await usage.refund();
    throw error;
  }
});

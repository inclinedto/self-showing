import { aiConfig, chatStream } from "@/lib/server/ai";
import { demoAnswer, streamText } from "@/lib/server/demo";
import { limitByIp, readJson, route } from "@/lib/server/http";
import { askMessages } from "@/lib/server/prompts";
import { meter } from "@/lib/server/quota";
import { optionalString, parseExcerpts, parseHistory, requireString } from "@/lib/server/validate";

export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = ["hkg1"];

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

export const POST = route(async (request) => {
  limitByIp(request, "ask", 60, 10 * 60 * 1000);
  const body = await readJson(request);
  const question = requireString(body.question, "问题", 1000);
  const documentName = optionalString(body.documentName, "文档名", 200) || "未命名文档";
  const excerpts = parseExcerpts(body.excerpts);
  const history = parseHistory(body.history);

  const usage = await meter(request, "ask");
  try {
    const config = aiConfig();
    if (config.demo) {
      return new Response(streamText(demoAnswer(question, excerpts)), { headers: STREAM_HEADERS });
    }
    const stream = await chatStream({
      model: config.textModel,
      messages: askMessages(documentName, question, excerpts, history),
      maxTokens: 2000,
      signal: request.signal,
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    await usage.refund();
    throw error;
  }
});

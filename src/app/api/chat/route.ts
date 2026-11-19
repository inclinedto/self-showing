import { site } from "@/resources/site";
import { aiConfig, chatStream } from "@/lib/server/ai";
import { demoChat, streamText } from "@/lib/server/demo";
import { limitByIp, readJson, route } from "@/lib/server/http";
import { chatMessages } from "@/lib/server/prompts";
import { meter } from "@/lib/server/quota";
import { parseConversation } from "@/lib/server/validate";

export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = ["hkg1"];

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

export const POST = route(async (request) => {
  limitByIp(request, "chat", 60, 10 * 60 * 1000);
  const body = await readJson(request);
  const conversation = parseConversation(body.messages);

  const usage = await meter(request, "chat");
  try {
    const config = aiConfig();
    if (config.demo) {
      const last = conversation.at(-1)?.content ?? "";
      return new Response(streamText(demoChat(last)), { headers: STREAM_HEADERS });
    }
    const stream = await chatStream({
      model: config.textModel,
      messages: chatMessages(site.name, conversation),
      temperature: 0.7,
      maxTokens: 3000,
      signal: request.signal,
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    await usage.refund();
    throw error;
  }
});

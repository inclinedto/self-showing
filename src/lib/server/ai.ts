const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export function aiConfig() {
  const apiKey = process.env.AI_API_KEY?.trim() ?? "";
  return {
    baseURL: (process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey,
    textModel: process.env.AI_TEXT_MODEL?.trim() || "qwen-plus",
    visionModel: process.env.AI_VISION_MODEL?.trim() || "qwen-vl-max",
    /** Without a key the tools return canned sample data so the UI can still be tried out. */
    demo: apiKey === "",
  };
}

export class AIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function userFacingMessage(status: number, body: string): string {
  if (body.includes("data_inspection_failed") || body.includes("inappropriate")) {
    return "内容未通过 AI 服务的安全审核，换一份文档或换个问法试试。";
  }
  if (status === 401 || status === 403) return "AI 服务密钥无效或已过期，请联系站长。";
  if (status === 429) return "AI 服务繁忙，请稍后再试。";
  if (status === 400 || status === 413)
    return "请求被 AI 服务拒绝，可能是图片过大或内容格式不支持。";
  return "AI 服务暂时不可用，请稍后再试。";
}

async function post(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const config = aiConfig();
  // Stays under the routes' 60s maxDuration so users get a readable error instead of a platform 504.
  const timeout = AbortSignal.timeout(55_000);
  let response: Response;
  try {
    response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw new AIError("请求已取消。", 499);
    console.error("AI request failed", error);
    throw new AIError("连接 AI 服务超时，请稍后再试。", 504);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`AI request failed with ${response.status}: ${text.slice(0, 500)}`);
    throw new AIError(userFacingMessage(response.status, text), 502);
  }
  return response;
}

export async function chat({
  model,
  messages,
  temperature = 0.1,
  maxTokens,
  signal,
}: ChatOptions): Promise<string> {
  const response = await post(
    { model, messages, temperature, max_tokens: maxTokens, stream: false },
    signal,
  );
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Streams only the assistant's text deltas, decoded from the provider's SSE frames. */
export async function chatStream({
  model,
  messages,
  temperature = 0.2,
  maxTokens,
  signal,
}: ChatOptions): Promise<ReadableStream<Uint8Array>> {
  const response = await post(
    { model, messages, temperature, max_tokens: maxTokens, stream: true },
    signal,
  );
  const body = response.body;
  if (!body) throw new AIError("AI 服务没有返回内容。", 502);

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const newline = buffer.indexOf("\n");
        if (newline !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
              return;
            }
          } catch {
            // Ignore keep-alive or partial frames that are not JSON.
          }
          continue;
        }

        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });
}

/** Models sometimes wrap JSON in prose or code fences; pull out the outermost object. */
export function parseJsonObject<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

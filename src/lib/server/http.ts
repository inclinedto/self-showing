import { type NextRequest, NextResponse } from "next/server";
import { AIError } from "./ai";
import { DbUnavailableError } from "./db";
import { ValidationError } from "./validate";

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

export function errorJson(status: number, message: string, code?: string, headers?: HeadersInit) {
  return json({ error: message, ...(code ? { code } : {}) }, { status, headers });
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) return errorJson(error.status, error.message, error.code);
  if (error instanceof ValidationError) return errorJson(400, error.message, "invalid");
  if (error instanceof AIError) return errorJson(error.status, error.message, "ai_error");
  if (error instanceof DbUnavailableError) {
    return errorJson(503, "账号和社区功能还没有开放，敬请期待。", "db_unavailable");
  }
  console.error("Unhandled API error", error);
  return errorJson(500, "服务器出了点问题，请稍后再试。", "server_error");
}

function requestHost(request: NextRequest): string {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

/** Rejects cross-site form posts and fetches; SameSite=Lax cookies already cover most cases. */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === requestHost(request);
    } catch {
      return false;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

// biome-ignore lint/suspicious/noExplicitAny: route context shapes differ per route.
type Handler<C = any> = (request: NextRequest, context: C) => Promise<Response>;

/** Wraps a route handler with the same-origin check and uniform error responses. */
// biome-ignore lint/suspicious/noExplicitAny: route context shapes differ per route.
export function route<C = any>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request)) {
        throw new HttpError(403, "请求来源无效，请刷新页面后重试。", "bad_origin");
      }
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("请求内容格式有误。");
  }
  return body as Record<string, unknown>;
}

export async function routeId(context: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await context.params;
  const value = Number(id);
  if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw new HttpError(404, "内容不存在。", "not_found");
  }
  return value;
}

// In-memory and per server instance: good enough to slow down bursts and brute force.
// Daily quotas live in the database and are exact.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [entry, times] of hits) {
      if (times.every((time) => now - time > windowMs)) hits.delete(entry);
    }
  }
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
    throw new HttpError(429, `操作太频繁，请 ${retryAfter} 秒后再试。`, "rate_limited");
  }
  recent.push(now);
  hits.set(key, recent);
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function limitByIp(request: NextRequest, bucket: string, limit: number, windowMs: number) {
  rateLimit(`${bucket}:${clientIp(request)}`, limit, windowMs);
}

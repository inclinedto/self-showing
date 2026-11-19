import { aiConfig, chat, parseJsonObject } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { dbConfigured } from "@/lib/server/db";
import { demoVerify } from "@/lib/server/demo";
import { HttpError, json, limitByIp, rateLimit, readJson, route } from "@/lib/server/http";
import { verifyMessages } from "@/lib/server/prompts";
import { parseExcerpts, requireString } from "@/lib/server/validate";
import type { ClaimVerdict, VerifiedClaim, VerifyResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = ["hkg1"];

const VERDICTS: ClaimVerdict[] = ["supported", "partial", "unsupported"];

// Verification belongs to an answer that was already charged, so it only gets a sanity cap.
export const POST = route(async (request) => {
  limitByIp(request, "verify", 60, 10 * 60 * 1000);
  const config = aiConfig();
  if (dbConfigured()) {
    const user = await requireUser(request);
    rateLimit(`verify-user:${user.id}`, 300, 24 * 60 * 60 * 1000);
  } else if (!config.demo) {
    throw new HttpError(503, "账号系统还没有配置好，AI 工具暂不可用。", "db_unavailable");
  }

  const body = await readJson(request);
  const answer = requireString(body.answer, "回答", 6000);
  const excerpts = parseExcerpts(body.excerpts);
  if (config.demo) return json(demoVerify(answer));

  const content = await chat({
    model: config.textModel,
    messages: verifyMessages(answer, excerpts),
    temperature: 0,
    maxTokens: 3000,
    signal: request.signal,
  });

  let parsed: { claims?: unknown };
  try {
    parsed = parseJsonObject(content);
  } catch {
    console.error("Unparseable verification output", content.slice(0, 500));
    throw new HttpError(502, "核查结果格式有误，可以点击重新核查。", "ai_error");
  }

  const knownIds = new Set(excerpts.map((excerpt) => excerpt.id));
  const rawClaims = Array.isArray(parsed.claims) ? parsed.claims : [];
  const claims: VerifiedClaim[] = rawClaims
    .filter((raw) => typeof raw?.claim === "string" && raw.claim.trim())
    .map((raw) => {
      const citations: number[] = Array.isArray(raw.citations)
        ? raw.citations.map(Number).filter(Number.isInteger)
        : [];
      const verdict = VERDICTS.includes(raw.verdict) ? raw.verdict : "partial";
      const unknown = citations.filter((id) => !knownIds.has(id));
      return {
        claim: raw.claim.trim(),
        citations,
        verdict: unknown.length > 0 ? "unsupported" : verdict,
        reason:
          unknown.length > 0
            ? `引用了不存在的片段 [${unknown.join("][")}]。`
            : String(raw.reason ?? "").trim(),
      };
    });

  return json({ claims } satisfies VerifyResponse);
});

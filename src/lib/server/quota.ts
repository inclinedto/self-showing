import type { NextRequest } from "next/server";
import { type Feature, FEATURES, quotasFor } from "@/resources/plans";
import { aiConfig } from "./ai";
import { type User, requireUser } from "./auth";
import { dbConfigured, query } from "./db";
import { HttpError } from "./http";

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Quotas reset at midnight Beijing time (no DST, so a fixed offset is exact). */
export function quotaDay(now = Date.now()): string {
  return new Date(now + CHINA_OFFSET_MS).toISOString().slice(0, 10);
}

export async function usageToday(userId: number): Promise<Partial<Record<Feature, number>>> {
  const rows = await query<{ feature: Feature; count: number }>(
    "SELECT feature, count FROM usage WHERE user_id = $1 AND day = $2",
    [userId, quotaDay()],
  );
  return Object.fromEntries(rows.map((row) => [row.feature, row.count]));
}

/** Atomically adds units unless that would exceed the limit. */
export async function consume(user: User, feature: Feature, units = 1): Promise<void> {
  const limit = quotasFor(user.isMember)[feature];
  const { label, unit } = FEATURES[feature];
  const exceeded = new HttpError(
    402,
    user.isMember
      ? `今天的${label}额度（${limit} ${unit}）已用完，明天再来吧。`
      : `今天的免费${label}额度（${limit} ${unit}）已用完，开通会员可获得更多额度。`,
    "quota_exceeded",
  );
  if (units > limit) throw exceeded;
  const rows = await query(
    `INSERT INTO usage (user_id, feature, day, count) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, feature, day) DO UPDATE SET count = usage.count + EXCLUDED.count
     WHERE usage.count + EXCLUDED.count <= $5
     RETURNING count`,
    [user.id, feature, quotaDay(), units, limit],
  );
  if (rows.length === 0) throw exceeded;
}

export async function refund(user: User, feature: Feature, units = 1): Promise<void> {
  await query(
    "UPDATE usage SET count = GREATEST(count - $4, 0) WHERE user_id = $1 AND feature = $2 AND day = $3",
    [user.id, feature, quotaDay(), units],
  ).catch((error) => console.error("Quota refund failed", error));
}

export type Meter = { user: User | null; refund: () => Promise<void> };

/**
 * Charges an AI tool call to the signed-in user's daily quota.
 * Without a database the tools only run in demo mode, open to guests.
 */
export async function meter(request: NextRequest, feature: Feature, units = 1): Promise<Meter> {
  if (!dbConfigured()) {
    if (aiConfig().demo) return { user: null, refund: async () => {} };
    throw new HttpError(503, "账号系统还没有配置好，AI 工具暂不可用。", "db_unavailable");
  }
  const user = await requireUser(request);
  await consume(user, feature, units);
  return { user, refund: () => refund(user, feature, units) };
}

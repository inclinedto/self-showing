import { isPurchasable, PLANS, quotasFor } from "@/resources/plans";
import type { SessionUser, SiteStatus } from "@/lib/types";
import { afdianConfig } from "./afdian";
import { aiConfig } from "./ai";
import type { User } from "./auth";
import { dbConfigured } from "./db";
import { usageToday } from "./quota";

export function inviteCode(): string {
  return process.env.INVITE_CODE?.trim() ?? "";
}

export function siteStatus(): SiteStatus {
  return {
    db: dbConfigured(),
    ai: !aiConfig().demo,
    payments: afdianConfig() !== null && PLANS.some(isPurchasable),
    inviteRequired: inviteCode() !== "",
  };
}

export async function sessionUser(user: User): Promise<SessionUser> {
  return {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    isMember: user.isMember,
    memberUntil: user.memberUntil?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    quotas: quotasFor(user.isMember),
    usage: await usageToday(user.id),
  };
}

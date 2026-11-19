import { currentUser } from "@/lib/server/auth";
import { json, route } from "@/lib/server/http";
import { sessionUser, siteStatus } from "@/lib/server/session";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const status = siteStatus();
  if (!status.db) return json({ user: null, status } satisfies MeResponse);
  const user = await currentUser(request);
  return json({ user: user ? await sessionUser(user) : null, status } satisfies MeResponse);
});

import { clearSessionCookie, destroySession } from "@/lib/server/auth";
import { dbConfigured } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";

export const POST = route(async (request) => {
  if (dbConfigured()) await destroySession(request);
  const response = json({ ok: true });
  clearSessionCookie(response);
  return response;
});

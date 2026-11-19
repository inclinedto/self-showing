import { requireUser, SESSION_COOKIE, validatePassword } from "@/lib/server/auth";
import { query, queryOne } from "@/lib/server/db";
import { HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { hashPassword, sha256, verifyPassword } from "@/lib/server/password";

export const POST = route(async (request) => {
  const user = await requireUser(request);
  rateLimit(`password:${user.id}`, 5, 10 * 60 * 1000);
  const body = await readJson(request);
  const next = validatePassword(body.newPassword, user.username);

  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [
    user.id,
  ]);
  if (!row || !(await verifyPassword(String(body.currentPassword ?? ""), row.password_hash))) {
    throw new HttpError(400, "当前密码不正确。", "bad_credentials");
  }

  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await hashPassword(next)]);
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  await query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [user.id, sha256(token)]);
  return json({ ok: true });
});

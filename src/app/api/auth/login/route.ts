import { createSession, setSessionCookie, toUser, USER_COLUMNS } from "@/lib/server/auth";
import { query, queryOne } from "@/lib/server/db";
import { HttpError, json, limitByIp, rateLimit, readJson, route } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/password";
import { sessionUser } from "@/lib/server/session";

type LoginRow = Parameters<typeof toUser>[0] & { password_hash: string };

// Spend the same scrypt time for unknown usernames so response timing does not reveal them.
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export const POST = route(async (request) => {
  limitByIp(request, "login", 20, 10 * 60 * 1000);
  const body = await readJson(request);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) throw new HttpError(400, "请输入用户名和密码。", "invalid");
  rateLimit(`login-user:${username.toLowerCase()}`, 10, 10 * 60 * 1000);

  const row = await queryOne<LoginRow>(
    `SELECT ${USER_COLUMNS}, users.password_hash FROM users WHERE lower(username) = lower($1)`,
    [username],
  );
  const valid = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !valid) throw new HttpError(401, "用户名或密码错误。", "bad_credentials");
  if (row.banned) throw new HttpError(403, "这个账号已被停用，如有疑问请联系站长。", "banned");

  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [row.id]);
  const user = toUser(row);
  const token = await createSession(user.id);
  const response = json({ user: await sessionUser(user) });
  setSessionCookie(response, token);
  return response;
});

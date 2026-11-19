import { timingSafeEqual } from "node:crypto";
import {
  createSession,
  setSessionCookie,
  toUser,
  USER_COLUMNS,
  validatePassword,
  validateUsername,
} from "@/lib/server/auth";
import { query, queryOne } from "@/lib/server/db";
import { HttpError, json, limitByIp, readJson, route } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/password";
import { inviteCode, sessionUser } from "@/lib/server/session";

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const POST = route(async (request) => {
  limitByIp(request, "register", 5, 60 * 60 * 1000);
  const body = await readJson(request);
  const username = validateUsername(body.username);
  const password = validatePassword(body.password, username);
  if (body.agree !== true) throw new HttpError(400, "请先阅读并同意用户协议和隐私政策。", "invalid");

  const requiredCode = inviteCode();
  if (requiredCode && !sameText(String(body.inviteCode ?? "").trim(), requiredCode)) {
    throw new HttpError(400, "邀请码不正确。", "invalid_invite");
  }

  const taken = await queryOne("SELECT 1 FROM users WHERE lower(username) = lower($1)", [username]);
  if (taken) throw new HttpError(409, "这个用户名已经被注册了。", "username_taken");

  const passwordHash = await hashPassword(password);
  const rows = await query<Parameters<typeof toUser>[0]>(
    `INSERT INTO users (username, password_hash, last_login_at) VALUES ($1, $2, now())
     ON CONFLICT DO NOTHING RETURNING ${USER_COLUMNS.replaceAll("users.", "")}`,
    [username, passwordHash],
  );
  if (rows.length === 0) throw new HttpError(409, "这个用户名已经被注册了。", "username_taken");

  const user = toUser(rows[0]);
  const token = await createSession(user.id);
  const response = json({ user: await sessionUser(user) }, { status: 201 });
  setSessionCookie(response, token);
  return response;
});

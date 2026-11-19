import type { NextRequest, NextResponse } from "next/server";
import { dbConfigured, query, queryOne } from "./db";
import { HttpError } from "./http";
import { newToken, sha256 } from "./password";

export const SESSION_COOKIE = "zjs_session";
const SESSION_DAYS = 30;

export type User = {
  id: number;
  username: string;
  memberUntil: Date | null;
  banned: boolean;
  createdAt: Date;
  isAdmin: boolean;
  isMember: boolean;
};

type UserRow = {
  id: number;
  username: string;
  member_until: Date | null;
  banned: boolean;
  created_at: Date;
};

export const USER_COLUMNS = "users.id, users.username, users.member_until, users.banned, users.created_at";

function adminNames(): Set<string> {
  return new Set(
    (process.env.ADMIN_USERNAMES ?? "")
      .split(/[,，\s]+/)
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminName(username: string): boolean {
  return adminNames().has(username.toLowerCase());
}

export function toUser(row: UserRow): User {
  const memberUntil = row.member_until ? new Date(row.member_until) : null;
  return {
    id: row.id,
    username: row.username,
    memberUntil,
    banned: row.banned,
    createdAt: new Date(row.created_at),
    isAdmin: isAdminName(row.username),
    isMember: memberUntil !== null && memberUntil.getTime() > Date.now(),
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = newToken();
  await query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))",
    [sha256(token), userId, SESSION_DAYS],
  );
  if (Math.random() < 0.05) {
    await query("DELETE FROM sessions WHERE expires_at < now()");
  }
  return token;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function destroySession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
}

export async function currentUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !dbConfigured()) return null;
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
    [sha256(token)],
  );
  if (!row || row.banned) return null;
  return toUser(row);
}

export async function requireUser(request: NextRequest): Promise<User> {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "请先登录。", "login_required");
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<User> {
  const user = await requireUser(request);
  if (!user.isAdmin) throw new HttpError(403, "没有管理权限。", "forbidden");
  return user;
}

const USERNAME = /^[A-Za-z0-9_\u4e00-\u9fa5]{2,20}$/;

export function validateUsername(value: unknown): string {
  const username = typeof value === "string" ? value.trim() : "";
  if (!USERNAME.test(username)) {
    throw new HttpError(400, "用户名需为 2–20 位中文、字母、数字或下划线。", "invalid");
  }
  return username;
}

export function validatePassword(value: unknown, username?: string): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < 8 || password.length > 72) {
    throw new HttpError(400, "密码长度需为 8–72 位。", "invalid");
  }
  if (username && password.toLowerCase() === username.toLowerCase()) {
    throw new HttpError(400, "密码不能和用户名相同。", "invalid");
  }
  return password;
}

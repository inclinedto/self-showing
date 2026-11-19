import { isAdminName, requireAdmin } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";

type Row = {
  id: number;
  username: string;
  member_until: Date | null;
  banned: boolean;
  created_at: Date;
  last_login_at: Date | null;
};

export const GET = route(async (request) => {
  await requireAdmin(request);
  const search = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  const rows = await query<Row>(
    `SELECT id, username, member_until, banned, created_at, last_login_at FROM users
     WHERE $1 = '' OR strpos(lower(username), lower($1)) > 0
     ORDER BY id DESC LIMIT 50`,
    [search],
  );
  return json({
    users: rows.map((row) => ({
      id: row.id,
      username: row.username,
      memberUntil: row.member_until ? new Date(row.member_until).toISOString() : null,
      banned: row.banned,
      isAdmin: isAdminName(row.username),
      createdAt: new Date(row.created_at).toISOString(),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    })),
  });
});

import { requireUser } from "@/lib/server/auth";
import { POST_COLUMNS, type PostRow, toPostItem } from "@/lib/server/community";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const rows = await query<PostRow>(
    `SELECT ${POST_COLUMNS}, false AS liked FROM posts
     WHERE user_id = $1 AND status <> 'deleted' ORDER BY id DESC LIMIT 100`,
    [user.id],
  );
  return json({ posts: rows.map((row) => toPostItem(row, user.id)) });
});

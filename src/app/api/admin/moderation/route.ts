import { requireAdmin } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { HttpError, json, readJson, route } from "@/lib/server/http";

type Item = {
  id: number;
  post_id: number | null;
  alias: string;
  content: string;
  status: string;
  report_count: number;
  reasons: string | null;
  created_at: Date;
};

const REASONS = (type: string, table: string) =>
  `(SELECT string_agg(DISTINCT reason, '、') FROM reports
    WHERE target_type = '${type}' AND target_id = ${table}.id AND NOT resolved) AS reasons`;

function toItem(row: Item) {
  return {
    id: row.id,
    postId: row.post_id,
    alias: row.alias,
    content: row.content,
    status: row.status,
    reportCount: row.report_count,
    reasons: row.reasons,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export const GET = route(async (request) => {
  await requireAdmin(request);
  const posts = await query<Item>(
    `SELECT id, NULL::int AS post_id, alias, content, status, report_count, created_at, ${REASONS("post", "posts")}
     FROM posts WHERE status = 'hidden' OR (status = 'visible' AND report_count > 0)
     ORDER BY report_count DESC, id DESC LIMIT 100`,
  );
  const comments = await query<Item>(
    `SELECT id, post_id, alias, content, status, report_count, created_at, ${REASONS("comment", "comments")}
     FROM comments WHERE status = 'hidden' OR (status = 'visible' AND report_count > 0)
     ORDER BY report_count DESC, id DESC LIMIT 100`,
  );
  return json({ posts: posts.map(toItem), comments: comments.map(toItem) });
});

export const PATCH = route(async (request) => {
  await requireAdmin(request);
  const body = await readJson(request);
  const type = body.type === "comment" ? "comment" : body.type === "post" ? "post" : null;
  const id = Number(body.id);
  if (!type || !Number.isInteger(id) || (body.action !== "restore" && body.action !== "delete")) {
    throw new HttpError(400, "参数无效。", "invalid");
  }
  const table = type === "post" ? "posts" : "comments";

  await transaction(async (tx) => {
    const [row] = await tx.query<{ status: string; post_id?: number }>(
      `SELECT status${type === "comment" ? ", post_id" : ""} FROM ${table} WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!row || row.status === "deleted") throw new HttpError(404, "内容不存在或已删除。", "not_found");
    if (body.action === "restore") {
      await tx.query(`UPDATE ${table} SET status = 'visible', report_count = 0 WHERE id = $1`, [id]);
    } else {
      await tx.query(`UPDATE ${table} SET status = 'deleted' WHERE id = $1`, [id]);
      if (type === "comment" && row.post_id) {
        await tx.query("UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1", [
          row.post_id,
        ]);
      }
    }
    await tx.query("UPDATE reports SET resolved = TRUE WHERE target_type = $1 AND target_id = $2", [type, id]);
  });
  return json({ ok: true });
});

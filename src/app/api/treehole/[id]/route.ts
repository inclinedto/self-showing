import { currentUser, requireUser } from "@/lib/server/auth";
import {
  type CommentRow,
  POST_COLUMNS,
  type PostRow,
  toCommentItem,
  toPostItem,
} from "@/lib/server/community";
import { query, queryOne } from "@/lib/server/db";
import { HttpError, json, route, routeId } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request, context: Context) => {
  const id = await routeId(context);
  const viewer = await currentUser(request);
  const viewerId = viewer?.id ?? 0;
  const post = await queryOne<PostRow>(
    `SELECT ${POST_COLUMNS},
       EXISTS (SELECT 1 FROM post_likes WHERE post_likes.post_id = posts.id AND post_likes.user_id = $2) AS liked
     FROM posts WHERE posts.id = $1`,
    [id, viewerId],
  );
  const canSeeHidden = viewer !== null && (viewer.isAdmin || post?.user_id === viewer.id);
  if (!post || post.status === "deleted" || (post.status === "hidden" && !canSeeHidden)) {
    throw new HttpError(404, "这条树洞不存在，或已被隐藏。", "not_found");
  }
  const comments = await query<CommentRow>(
    `SELECT id, post_id, user_id, alias, is_author, content, status, report_count, created_at
     FROM comments WHERE post_id = $1 AND status = 'visible' ORDER BY id ASC LIMIT 500`,
    [id],
  );
  return json({
    post: toPostItem(post, viewer?.id ?? null),
    comments: comments.map((row) => toCommentItem(row, viewer?.id ?? null)),
  });
});

export const DELETE = route(async (request, context: Context) => {
  const id = await routeId(context);
  const user = await requireUser(request);
  const rows = await query(
    `UPDATE posts SET status = 'deleted'
     WHERE id = $1 AND status <> 'deleted' AND (user_id = $2 OR $3) RETURNING id`,
    [id, user.id, user.isAdmin],
  );
  if (rows.length === 0) throw new HttpError(404, "这条树洞不存在，或你没有权限删除。", "not_found");
  return json({ ok: true });
});

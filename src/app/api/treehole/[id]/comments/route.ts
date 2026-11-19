import { aliasFromHex } from "@/lib/alias";
import { requireUser } from "@/lib/server/auth";
import { acceptText, type CommentRow, toCommentItem } from "@/lib/server/community";
import { queryOne, transaction } from "@/lib/server/db";
import { HttpError, json, rateLimit, readJson, route, routeId } from "@/lib/server/http";
import { consume, refund } from "@/lib/server/quota";
import { keyedHash } from "@/lib/server/settings";

type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request, context: Context) => {
  const postId = await routeId(context);
  const user = await requireUser(request);
  const body = await readJson(request);
  const { text, crisis } = acceptText(body.content, "comment", "评论");

  const post = await queryOne<{ user_id: number; alias: string }>(
    "SELECT user_id, alias FROM posts WHERE id = $1 AND status = 'visible'",
    [postId],
  );
  if (!post) throw new HttpError(404, "这条树洞不存在，或已被隐藏。", "not_found");

  // Each commenter keeps one stable alias within a thread, unlinkable across threads.
  const isAuthor = post.user_id === user.id;
  let alias = post.alias;
  if (!isAuthor) {
    const digest = await keyedHash(`comment:${postId}:${user.id}`);
    alias = aliasFromHex(digest);
    if (alias === post.alias) alias = aliasFromHex(digest.slice(8));
  }

  rateLimit(`comment:${user.id}`, 6, 60 * 1000);
  await consume(user, "comment");
  try {
    const row = await transaction(async (tx) => {
      const [inserted] = await tx.query<CommentRow>(
        `INSERT INTO comments (post_id, user_id, alias, is_author, content) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, post_id, user_id, alias, is_author, content, status, report_count, created_at`,
        [postId, user.id, alias, isAuthor, text],
      );
      await tx.query("UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1", [postId]);
      return inserted;
    });
    return json({ comment: toCommentItem(row, user.id), crisis }, { status: 201 });
  } catch (error) {
    await refund(user, "comment");
    throw error;
  }
});

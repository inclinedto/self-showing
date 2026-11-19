import { requireUser } from "@/lib/server/auth";
import { transaction } from "@/lib/server/db";
import { HttpError, json, rateLimit, route, routeId } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

/** Toggles the viewer's 抱抱 on a post. */
export const POST = route(async (request, context: Context) => {
  const postId = await routeId(context);
  const user = await requireUser(request);
  rateLimit(`like:${user.id}`, 60, 60 * 1000);

  const result = await transaction(async (tx) => {
    const [post] = await tx.query<{ id: number }>(
      "SELECT id FROM posts WHERE id = $1 AND status = 'visible' FOR UPDATE",
      [postId],
    );
    if (!post) return null;
    const added = await tx.query(
      "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING post_id",
      [postId, user.id],
    );
    const liked = added.length > 0;
    if (!liked) {
      await tx.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [postId, user.id]);
    }
    const [updated] = await tx.query<{ like_count: number }>(
      "UPDATE posts SET like_count = GREATEST(like_count + $2, 0) WHERE id = $1 RETURNING like_count",
      [postId, liked ? 1 : -1],
    );
    return { liked, likeCount: updated.like_count };
  });
  if (!result) throw new HttpError(404, "这条树洞不存在，或已被隐藏。", "not_found");
  return json(result);
});

import { requireUser } from "@/lib/server/auth";
import { transaction } from "@/lib/server/db";
import { HttpError, json, route, routeId } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export const DELETE = route(async (request, context: Context) => {
  const id = await routeId(context);
  const user = await requireUser(request);
  const deleted = await transaction(async (tx) => {
    const [row] = await tx.query<{ post_id: number; user_id: number; status: string }>(
      "SELECT post_id, user_id, status FROM comments WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!row || row.status === "deleted" || (row.user_id !== user.id && !user.isAdmin)) return false;
    await tx.query("UPDATE comments SET status = 'deleted' WHERE id = $1", [id]);
    // comment_count tracks every comment that is not deleted, including ones hidden by reports.
    await tx.query("UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1", [
      row.post_id,
    ]);
    return true;
  });
  if (!deleted) throw new HttpError(404, "评论不存在，或你没有权限删除。", "not_found");
  return json({ ok: true });
});

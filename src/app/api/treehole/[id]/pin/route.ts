import { requireAdmin } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { HttpError, json, readJson, route, routeId } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

/** Admin only: pins a post above the timeline (`{ pinned: true }`) or unpins it. */
export const POST = route(async (request, context: Context) => {
  const id = await routeId(context);
  await requireAdmin(request);
  const body = await readJson(request);
  const pinned = body.pinned === true;
  const rows = await query<{ id: number }>(
    `UPDATE posts SET pinned_at = CASE WHEN $2 THEN now() ELSE NULL END
     WHERE id = $1 AND status = 'visible' RETURNING id`,
    [id, pinned],
  );
  if (rows.length === 0) throw new HttpError(404, "这条树洞不存在，或已被隐藏。", "not_found");
  return json({ pinned });
});

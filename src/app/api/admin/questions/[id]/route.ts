import { LIMITS } from "@/lib/community";
import { requireAdmin } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { HttpError, json, readJson, route, routeId } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request, context: Context) => {
  await requireAdmin(request);
  const id = await routeId(context);
  const body = await readJson(request);

  let rows: unknown[];
  switch (body.action) {
    case "answer": {
      const answer = typeof body.answer === "string" ? body.answer.trim() : "";
      if (answer.length < LIMITS.answer.min || answer.length > LIMITS.answer.max) {
        throw new HttpError(400, `回答需为 ${LIMITS.answer.min}–${LIMITS.answer.max} 个字。`, "invalid");
      }
      rows = await query(
        `UPDATE questions SET status = 'answered', answer = $2, answered_at = COALESCE(answered_at, now())
         WHERE id = $1 RETURNING id`,
        [id, answer],
      );
      break;
    }
    case "hide":
      rows = await query("UPDATE questions SET status = 'hidden' WHERE id = $1 RETURNING id", [id]);
      break;
    case "restore":
      rows = await transaction(async (tx) => {
        const restored = await tx.query(
          `UPDATE questions SET report_count = 0,
             status = CASE WHEN answer IS NULL THEN 'pending' ELSE 'answered' END
           WHERE id = $1 RETURNING id`,
          [id],
        );
        await tx.query("UPDATE reports SET resolved = TRUE WHERE target_type = 'question' AND target_id = $1", [id]);
        return restored;
      });
      break;
    case "delete":
      rows = await query("DELETE FROM questions WHERE id = $1 RETURNING id", [id]);
      break;
    default:
      throw new HttpError(400, "未知操作。", "invalid");
  }
  if (rows.length === 0) throw new HttpError(404, "问题不存在。", "not_found");
  return json({ ok: true });
});

import { REPORT_HIDE_THRESHOLD, REPORT_REASONS } from "@/lib/community";
import { requireUser } from "@/lib/server/auth";
import { transaction } from "@/lib/server/db";
import { HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";

// Questions are only public once answered, so that is their reportable state.
const TARGETS = {
  post: { table: "posts", visibleStatus: "visible" },
  comment: { table: "comments", visibleStatus: "visible" },
  question: { table: "questions", visibleStatus: "answered" },
} as const;

type TargetType = keyof typeof TARGETS;

export const POST = route(async (request) => {
  const user = await requireUser(request);
  rateLimit(`report:${user.id}`, 20, 60 * 60 * 1000);
  const body = await readJson(request);
  const type = String(body.type ?? "") as TargetType;
  const target = TARGETS[type];
  const id = Number(body.id);
  const reason = REPORT_REASONS.find((item) => item === body.reason);
  if (!target || !Number.isInteger(id) || id < 1 || !reason) {
    throw new HttpError(400, "举报信息不完整。", "invalid");
  }

  const found = await transaction(async (tx) => {
    const [row] = await tx.query<{ user_id: number | null }>(
      `SELECT user_id FROM ${target.table} WHERE id = $1 AND status = $2 FOR UPDATE`,
      [id, target.visibleStatus],
    );
    if (!row) return false;
    if (row.user_id === user.id) throw new HttpError(400, "不能举报自己发布的内容。", "invalid");
    const inserted = await tx.query(
      `INSERT INTO reports (target_type, target_id, user_id, reason) VALUES ($1, $2, $3, $4)
       ON CONFLICT (target_type, target_id, user_id) DO NOTHING RETURNING id`,
      [type, id, user.id, reason],
    );
    if (inserted.length > 0) {
      await tx.query(
        `UPDATE ${target.table} SET report_count = report_count + 1,
           status = CASE WHEN report_count + 1 >= $2 THEN 'hidden' ELSE status END
         WHERE id = $1`,
        [id, REPORT_HIDE_THRESHOLD],
      );
    }
    return true;
  });
  if (!found) throw new HttpError(404, "内容不存在或已被处理。", "not_found");
  return json({ ok: true });
});

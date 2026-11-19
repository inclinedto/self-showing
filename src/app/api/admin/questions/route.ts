import { requireAdmin } from "@/lib/server/auth";
import { QUESTION_COLUMNS, type QuestionRow, toQuestionItem } from "@/lib/server/community";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";

const STATUSES = ["pending", "answered", "hidden"];

export const GET = route(async (request) => {
  await requireAdmin(request);
  const requested = request.nextUrl.searchParams.get("status") ?? "pending";
  const status = STATUSES.includes(requested) ? requested : "pending";
  const rows = await query<QuestionRow & { report_count: number }>(
    `SELECT ${QUESTION_COLUMNS}, report_count FROM questions WHERE status = $1
     ORDER BY ${status === "pending" ? "id ASC" : "id DESC"} LIMIT 100`,
    [status],
  );
  return json({
    questions: rows.map((row) => ({ ...toQuestionItem(row), reportCount: row.report_count })),
  });
});

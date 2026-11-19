import { requireUser } from "@/lib/server/auth";
import { QUESTION_COLUMNS, type QuestionRow, toQuestionItem } from "@/lib/server/community";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const rows = await query<QuestionRow>(
    `SELECT ${QUESTION_COLUMNS} FROM questions WHERE user_id = $1 ORDER BY id DESC LIMIT 100`,
    [user.id],
  );
  return json({ questions: rows.map(toQuestionItem) });
});

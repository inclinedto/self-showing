import { requireUser } from "@/lib/server/auth";
import { acceptText, QUESTION_COLUMNS, type QuestionRow, toQuestionItem } from "@/lib/server/community";
import { query } from "@/lib/server/db";
import { json, rateLimit, readJson, route } from "@/lib/server/http";
import { consume, refund } from "@/lib/server/quota";

const PAGE_SIZE = 20;

export const GET = route(async (request) => {
  const page = Math.min(Math.max(Number(request.nextUrl.searchParams.get("cursor")) || 0, 0), 200);
  const rows = await query<QuestionRow>(
    `SELECT ${QUESTION_COLUMNS} FROM questions
     WHERE status = 'answered' AND is_public
     ORDER BY answered_at DESC, id DESC LIMIT $1 OFFSET $2`,
    [PAGE_SIZE + 1, page * PAGE_SIZE],
  );
  const [{ count }] = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM questions WHERE status = 'answered' AND is_public",
  );
  return json({
    questions: rows.slice(0, PAGE_SIZE).map(toQuestionItem),
    next: rows.length > PAGE_SIZE ? String(page + 1) : null,
    total: count,
  });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const { text, crisis } = acceptText(body.content, "question", "问题");
  const isPublic = body.isPublic !== false;

  rateLimit(`question:${user.id}`, 1, 30 * 1000);
  await consume(user, "question");
  try {
    const [row] = await query<QuestionRow>(
      `INSERT INTO questions (user_id, content, is_public) VALUES ($1, $2, $3) RETURNING ${QUESTION_COLUMNS}`,
      [user.id, text, isPublic],
    );
    return json({ question: toQuestionItem(row), crisis }, { status: 201 });
  } catch (error) {
    await refund(user, "question");
    throw error;
  }
});

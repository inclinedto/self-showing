import { requireAdmin } from "@/lib/server/auth";
import { query, queryOne } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";
import { quotaDay } from "@/lib/server/quota";

export const GET = route(async (request) => {
  await requireAdmin(request);
  const totals = await queryOne<Record<string, number>>(
    `SELECT
       (SELECT count(*)::int FROM users) AS users,
       (SELECT count(*)::int FROM users WHERE created_at > now() - interval '1 day') AS new_users,
       (SELECT count(*)::int FROM users WHERE member_until > now()) AS members,
       (SELECT COALESCE(sum(amount_cents), 0)::int FROM orders WHERE status = 'paid' AND provider = 'afdian') AS revenue_cents,
       (SELECT count(*)::int FROM orders WHERE status = 'paid' AND provider = 'afdian') AS paid_orders,
       (SELECT count(*)::int FROM posts WHERE status = 'visible') AS posts,
       (SELECT count(*)::int FROM posts WHERE status <> 'deleted' AND created_at > now() - interval '1 day') AS posts_today,
       (SELECT count(*)::int FROM questions WHERE status = 'pending') AS pending_questions,
       (SELECT count(*)::int FROM posts WHERE status = 'hidden')
         + (SELECT count(*)::int FROM comments WHERE status = 'hidden')
         + (SELECT count(*)::int FROM questions WHERE status = 'hidden' AND report_count > 0) AS hidden_items,
       (SELECT count(*)::int FROM reports WHERE NOT resolved) AS open_reports`,
  );
  const usage = await query<{ feature: string; total: number; users: number }>(
    "SELECT feature, sum(count)::int AS total, count(*)::int AS users FROM usage WHERE day = $1 GROUP BY feature",
    [quotaDay()],
  );
  return json({ totals, usage });
});

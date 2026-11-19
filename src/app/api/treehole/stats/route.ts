import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";
import type { TreeholeStats } from "@/lib/types";

const HEATMAP_DAYS = 84;
// Beijing has no daylight saving, so a fixed offset turns UTC instants into Beijing calendar days.
const BEIJING_DAY = "to_char((posts.created_at AT TIME ZONE 'UTC') + interval '8 hours', 'YYYY-MM-DD')";

/** Activity calendar, popular tags and moods for the treehole sidebar; `?mine=1` limits it to the viewer's posts. */
export const GET = route(async (request) => {
  const mine = request.nextUrl.searchParams.get("mine") === "1";
  const viewer = mine ? await requireUser(request) : null;
  const scope = viewer ? "posts.status <> 'deleted' AND posts.user_id = $1" : "posts.status = 'visible' AND $1 = 0";
  const values = [viewer?.id ?? 0];

  const [days, tags, moods, totals] = await Promise.all([
    query<{ date: string; count: number }>(
      `SELECT ${BEIJING_DAY} AS date, count(*)::int AS count FROM posts
       WHERE ${scope} AND posts.created_at > now() - interval '${HEATMAP_DAYS + 1} days'
       GROUP BY 1 ORDER BY 1`,
      values,
    ),
    query<{ tag: string; count: number }>(
      `SELECT tag, count(*)::int AS count FROM posts, unnest(posts.tags) AS tag
       WHERE ${scope} AND posts.created_at > now() - interval '90 days'
       GROUP BY tag ORDER BY count DESC, tag LIMIT 16`,
      values,
    ),
    query<{ mood: string; count: number }>(
      `SELECT posts.mood AS mood, count(*)::int AS count FROM posts
       WHERE ${scope} AND posts.mood IS NOT NULL AND posts.created_at > now() - interval '90 days'
       GROUP BY posts.mood ORDER BY count DESC`,
      values,
    ),
    query<{ total: number; today: number }>(
      `SELECT count(*)::int AS total,
         (count(*) FILTER (WHERE ${BEIJING_DAY} = to_char((now() AT TIME ZONE 'UTC') + interval '8 hours', 'YYYY-MM-DD')))::int AS today
       FROM posts WHERE ${scope}`,
      values,
    ),
  ]);

  return json(
    { days, tags, moods, total: totals[0]?.total ?? 0, today: totals[0]?.today ?? 0 } satisfies TreeholeStats,
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
});

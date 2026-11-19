import { randomBytes } from "node:crypto";
import { aliasFromHex } from "@/lib/alias";
import { extractTags, isValidTag, MOODS } from "@/lib/community";
import { currentUser, requireUser } from "@/lib/server/auth";
import { acceptText, POST_COLUMNS, type PostRow, toPostItem } from "@/lib/server/community";
import { query } from "@/lib/server/db";
import { HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { consume, refund } from "@/lib/server/quota";

const PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 40;
const BEIJING_OFFSET_MS = 8 * 3600 * 1000;

// Time-decayed engagement score, similar in spirit to Hacker News ranking.
const HOT_SCORE =
  "(posts.like_count * 2 + posts.comment_count * 3 + 1) / power(extract(epoch FROM now() - posts.created_at) / 3600 + 2, 1.5)";

const LIKED = "EXISTS (SELECT 1 FROM post_likes WHERE post_likes.post_id = posts.id AND post_likes.user_id = $1) AS liked";

/** The UTC instants bounding a Beijing calendar day given as YYYY-MM-DD. */
function beijingDay(value: string): [Date, Date] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const start = utc - BEIJING_OFFSET_MS;
  return [new Date(start), new Date(start + 86_400_000)];
}

export const GET = route(async (request) => {
  const params = request.nextUrl.searchParams;
  const viewer = await currentUser(request);
  const viewerId = viewer?.id ?? 0;
  const hot = params.get("sort") === "hot";
  const mine = params.get("mine") === "1";
  if (mine && !viewer) throw new HttpError(401, "请先登录。", "unauthorized");

  const mood = MOODS.find((item) => item === params.get("mood"));
  const rawTag = (params.get("tag") ?? "").trim().toLowerCase();
  const tag = isValidTag(rawTag) ? rawTag : "";
  const search = (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const day = beijingDay(params.get("date") ?? "");

  const values: unknown[] = [viewerId];
  const where = [mine ? "posts.status <> 'deleted'" : "posts.status = 'visible'"];
  const add = (clause: (placeholder: string) => string, value: unknown) => {
    values.push(value);
    where.push(clause(`$${values.length}`));
  };
  if (mine) add((p) => `posts.user_id = ${p}`, viewerId);
  if (mood) add((p) => `posts.mood = ${p}`, mood);
  if (tag) add((p) => `${p} = ANY(posts.tags)`, tag);
  if (search) add((p) => `posts.content ILIKE ${p}`, `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  if (day) {
    add((p) => `posts.created_at >= ${p}`, day[0]);
    add((p) => `posts.created_at < ${p}`, day[1]);
  }
  const filtered = where.length > 1;

  let pinned: PostRow[] = [];
  let rows: PostRow[];
  let next: string | null = null;
  if (hot) {
    if (!filtered) where.push("posts.created_at > now() - interval '30 days'");
    const page = Math.min(Math.max(Number(params.get("cursor")) || 0, 0), 50);
    rows = await query<PostRow>(
      `SELECT ${POST_COLUMNS}, ${LIKED} FROM posts
       WHERE ${where.join(" AND ")}
       ORDER BY ${HOT_SCORE} DESC, posts.id DESC
       LIMIT ${PAGE_SIZE + 1} OFFSET ${page * PAGE_SIZE}`,
      values,
    );
    if (rows.length > PAGE_SIZE) next = String(page + 1);
  } else {
    const cursor = Math.max(Number(params.get("cursor")) || 0, 0);
    if (!filtered) {
      // Pinned posts sit above the unfiltered timeline instead of inside it.
      where.push("posts.pinned_at IS NULL");
      if (!cursor) {
        pinned = await query<PostRow>(
          `SELECT ${POST_COLUMNS}, ${LIKED} FROM posts
           WHERE posts.status = 'visible' AND posts.pinned_at IS NOT NULL
           ORDER BY posts.pinned_at DESC LIMIT 3`,
          [viewerId],
        );
      }
    }
    if (cursor) add((p) => `posts.id < ${p}`, cursor);
    rows = await query<PostRow>(
      `SELECT ${POST_COLUMNS}, ${LIKED} FROM posts
       WHERE ${where.join(" AND ")}
       ORDER BY posts.id DESC
       LIMIT ${PAGE_SIZE + 1}`,
      values,
    );
    if (rows.length > PAGE_SIZE) next = String(rows[PAGE_SIZE - 1].id);
  }

  return json({
    pinned: pinned.map((row) => toPostItem(row, viewer?.id ?? null)),
    posts: rows.slice(0, PAGE_SIZE).map((row) => toPostItem(row, viewer?.id ?? null)),
    next,
  });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const { text, crisis } = acceptText(body.content, "post", "树洞内容");
  const mood = body.mood ? MOODS.find((item) => item === body.mood) : null;
  if (mood === undefined) throw new HttpError(400, "心情标签无效。", "invalid");

  rateLimit(`post:${user.id}`, 1, 30 * 1000);
  await consume(user, "post");
  try {
    const [row] = await query<PostRow>(
      `INSERT INTO posts (user_id, alias, mood, content, tags)
       VALUES ($1, $2, $3, $4, ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
       RETURNING ${POST_COLUMNS.replaceAll("posts.", "")}`,
      [user.id, aliasFromHex(randomBytes(4).toString("hex")), mood, text, JSON.stringify(extractTags(text))],
    );
    return json({ post: toPostItem(row, user.id), crisis }, { status: 201 });
  } catch (error) {
    await refund(user, "post");
    throw error;
  }
});

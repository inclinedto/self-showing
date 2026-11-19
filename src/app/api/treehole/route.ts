import { randomBytes } from "node:crypto";
import { aliasFromHex } from "@/lib/alias";
import { MOODS } from "@/lib/community";
import { currentUser, requireUser } from "@/lib/server/auth";
import { acceptText, POST_COLUMNS, type PostRow, toPostItem } from "@/lib/server/community";
import { query } from "@/lib/server/db";
import { HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { consume, refund } from "@/lib/server/quota";

const PAGE_SIZE = 20;

// Time-decayed engagement score, similar in spirit to Hacker News ranking.
const HOT_SCORE =
  "(posts.like_count * 2 + posts.comment_count * 3 + 1) / power(extract(epoch FROM now() - posts.created_at) / 3600 + 2, 1.5)";

export const GET = route(async (request) => {
  const params = request.nextUrl.searchParams;
  const viewer = await currentUser(request);
  const viewerId = viewer?.id ?? 0;
  const mood = MOODS.find((item) => item === params.get("mood")) ?? "";
  const hot = params.get("sort") === "hot";

  let rows: PostRow[];
  let next: string | null = null;
  if (hot) {
    const page = Math.min(Math.max(Number(params.get("cursor")) || 0, 0), 50);
    rows = await query<PostRow>(
      `SELECT ${POST_COLUMNS},
         EXISTS (SELECT 1 FROM post_likes WHERE post_likes.post_id = posts.id AND post_likes.user_id = $1) AS liked
       FROM posts
       WHERE posts.status = 'visible' AND ($2 = '' OR posts.mood = $2)
         AND posts.created_at > now() - interval '30 days'
       ORDER BY ${HOT_SCORE} DESC, posts.id DESC
       LIMIT $3 OFFSET $4`,
      [viewerId, mood, PAGE_SIZE + 1, page * PAGE_SIZE],
    );
    if (rows.length > PAGE_SIZE) next = String(page + 1);
  } else {
    const cursor = Math.max(Number(params.get("cursor")) || 0, 0);
    rows = await query<PostRow>(
      `SELECT ${POST_COLUMNS},
         EXISTS (SELECT 1 FROM post_likes WHERE post_likes.post_id = posts.id AND post_likes.user_id = $1) AS liked
       FROM posts
       WHERE posts.status = 'visible' AND ($2 = '' OR posts.mood = $2) AND ($3 = 0 OR posts.id < $3)
       ORDER BY posts.id DESC
       LIMIT $4`,
      [viewerId, mood, cursor, PAGE_SIZE + 1],
    );
    if (rows.length > PAGE_SIZE) next = String(rows[PAGE_SIZE - 1].id);
  }

  return json({
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
      `INSERT INTO posts (user_id, alias, mood, content) VALUES ($1, $2, $3, $4)
       RETURNING ${POST_COLUMNS.replaceAll("posts.", "")}`,
      [user.id, aliasFromHex(randomBytes(4).toString("hex")), mood, text],
    );
    return json({ post: toPostItem(row, user.id), crisis }, { status: 201 });
  } catch (error) {
    await refund(user, "post");
    throw error;
  }
});

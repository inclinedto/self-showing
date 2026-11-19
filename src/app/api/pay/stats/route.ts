import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";
import { SHOW_MEMBER_COUNT_FROM } from "@/resources/plans";

/** Active member count for the pricing page, withheld until it is large enough to say nothing about individuals. */
export const GET = route(async () => {
  const [row] = await query<{ members: number }>("SELECT count(*)::int AS members FROM users WHERE member_until > now()");
  const members = row?.members ?? 0;
  return json(
    { members: members >= SHOW_MEMBER_COUNT_FROM ? members : null },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
});

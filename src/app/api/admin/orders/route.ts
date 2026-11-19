import { requireAdmin } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";
import { type OrderRow, toOrderItem } from "@/lib/server/orders";

const STATUSES = ["pending", "paid", "cancelled"];

export const GET = route(async (request) => {
  await requireAdmin(request);
  const requested = request.nextUrl.searchParams.get("status") ?? "";
  const status = STATUSES.includes(requested) ? requested : "";
  const rows = await query<OrderRow & { username: string | null }>(
    `SELECT orders.id, orders.user_id, orders.plan_id, orders.days, orders.amount_cents, orders.provider,
       orders.status, orders.provider_trade_no, orders.note, orders.created_at, orders.paid_at, users.username
     FROM orders LEFT JOIN users ON users.id = orders.user_id
     WHERE $1 = '' OR orders.status = $1
     ORDER BY orders.created_at DESC LIMIT 100`,
    [status],
  );
  return json({
    orders: rows.map((row) => ({
      ...toOrderItem(row),
      username: row.username,
      tradeNo: row.provider_trade_no,
      note: row.note,
    })),
  });
});

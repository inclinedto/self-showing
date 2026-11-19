import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";
import { ORDER_COLUMNS, type OrderRow, toOrderItem } from "@/lib/server/orders";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const rows = await query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders
     WHERE user_id = $1 AND (status = 'paid' OR created_at > now() - interval '7 days')
     ORDER BY created_at DESC LIMIT 50`,
    [user.id],
  );
  return json({ orders: rows.map(toOrderItem) });
});

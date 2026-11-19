import { afdianConfig, findOrderByCustomId } from "@/lib/server/afdian";
import { requireUser } from "@/lib/server/auth";
import { settleAfdianOrder } from "@/lib/server/billing";
import { queryOne } from "@/lib/server/db";
import { HttpError, json, rateLimit, route } from "@/lib/server/http";
import { ORDER_COLUMNS, type OrderRow, toOrderItem } from "@/lib/server/orders";

type Context = { params: Promise<{ id: string }> };

async function loadOrder(userId: number, id: string) {
  const row = await queryOne<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (!row) throw new HttpError(404, "订单不存在。", "not_found");
  return row;
}

export const GET = route(async (request, context: Context) => {
  const user = await requireUser(request);
  const { id } = await context.params;
  return json({ order: toOrderItem(await loadOrder(user.id, id)) });
});

/** "我已支付": asks 爱发电 directly, in case the webhook was delayed or lost. */
export const POST = route(async (request, context: Context) => {
  const user = await requireUser(request);
  rateLimit(`order-sync:${user.id}`, 10, 5 * 60 * 1000);
  const { id } = await context.params;
  const order = await loadOrder(user.id, id);
  const config = afdianConfig();
  if (order.status === "pending" && order.provider === "afdian" && config) {
    const remote = await findOrderByCustomId(config, order.id).catch((error) => {
      console.error("Afdian order sync failed", error);
      throw new HttpError(502, "暂时查询不到爱发电订单，请稍后再试。", "afdian_error");
    });
    if (remote) await settleAfdianOrder(remote);
  }
  return json({ order: toOrderItem(await loadOrder(user.id, id)) });
});

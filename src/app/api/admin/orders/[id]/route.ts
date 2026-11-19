import { requireAdmin } from "@/lib/server/auth";
import { grantDays } from "@/lib/server/billing";
import { transaction } from "@/lib/server/db";
import { HttpError, json, readJson, route } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

/** Manual fallback for payments that arrived outside the normal flow. */
export const PATCH = route(async (request, context: Context) => {
  const admin = await requireAdmin(request);
  const { id } = await context.params;
  const body = await readJson(request);
  if (body.action !== "markPaid" && body.action !== "cancel") {
    throw new HttpError(400, "未知操作。", "invalid");
  }

  const changed = await transaction(async (tx) => {
    const [order] = await tx.query<{ user_id: number | null; days: number; status: string }>(
      "SELECT user_id, days, status FROM orders WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!order || order.status !== "pending") return false;
    if (body.action === "cancel") {
      await tx.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [id]);
      return true;
    }
    await tx.query(
      "UPDATE orders SET status = 'paid', paid_at = now(), note = $2 WHERE id = $1",
      [id, `由 ${admin.username} 手动确认`],
    );
    if (order.user_id !== null) await grantDays(tx, order.user_id, order.days);
    return true;
  });
  if (!changed) throw new HttpError(400, "只有待支付的订单可以操作。", "invalid");
  return json({ ok: true });
});

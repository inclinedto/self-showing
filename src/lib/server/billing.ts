import { randomInt } from "node:crypto";
import { getPlan } from "@/resources/plans";
import { type AfdianOrder, amountToCents } from "./afdian";
import { type Db, transaction } from "./db";

export function newOrderId(now = new Date()): string {
  const stamp = new Date(now.getTime() + 8 * 3600_000).toISOString().replace(/\D/g, "").slice(0, 14);
  return `ZJS${stamp}${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

export async function grantDays(tx: Db, userId: number, days: number) {
  await tx.query(
    `UPDATE users SET member_until = GREATEST(COALESCE(member_until, now()), now()) + make_interval(days => $2)
     WHERE id = $1`,
    [userId, days],
  );
}

type OrderRow = { id: string; user_id: number | null; plan_id: string; days: number; status: string };

export type SettleResult = "paid" | "already_paid" | "not_paid" | "unknown_order" | "plan_mismatch";

/** Applies a verified 爱发电 order exactly once, keyed by its trade number. */
export async function settleAfdianOrder(order: AfdianOrder): Promise<SettleResult> {
  if (order.status !== 2) return "not_paid";
  const orderId = order.custom_order_id?.trim();
  if (!orderId) return "unknown_order";

  return transaction(async (tx) => {
    const [existing] = await tx.query<OrderRow>(
      "SELECT id, user_id, plan_id, days, status FROM orders WHERE id = $1 FOR UPDATE",
      [orderId],
    );
    if (!existing || existing.user_id === null) return "unknown_order";
    if (existing.status === "paid") return "already_paid";

    const plan = getPlan(existing.plan_id);
    if (!plan || !plan.afdianPlanId || order.plan_id !== plan.afdianPlanId) {
      console.error("Afdian plan mismatch", { orderId, expected: plan?.afdianPlanId, got: order.plan_id });
      return "plan_mismatch";
    }

    const months = Math.min(Math.max(Number(order.month) || 1, 1), 36);
    const days = existing.days * months;
    const updated = await tx.query(
      `UPDATE orders SET status = 'paid', paid_at = now(), provider_trade_no = $2, amount_cents = $3, days = $4
       WHERE id = $1 AND status <> 'paid' AND NOT EXISTS (SELECT 1 FROM orders WHERE provider_trade_no = $2)
       RETURNING id`,
      [orderId, order.out_trade_no, amountToCents(order.total_amount), days],
    );
    if (updated.length === 0) return "already_paid";
    await grantDays(tx, existing.user_id, days);
    return "paid";
  });
}

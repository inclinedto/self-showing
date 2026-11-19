import { getPlan, isPurchasable } from "@/resources/plans";
import { afdianConfig, checkoutUrl } from "@/lib/server/afdian";
import { requireUser } from "@/lib/server/auth";
import { newOrderId } from "@/lib/server/billing";
import { query } from "@/lib/server/db";
import { HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";

export const POST = route(async (request) => {
  const user = await requireUser(request);
  rateLimit(`checkout:${user.id}`, 10, 10 * 60 * 1000);
  const body = await readJson(request);
  const plan = getPlan(String(body.planId ?? ""));
  if (!plan) throw new HttpError(404, "套餐不存在。", "not_found");
  if (!isPurchasable(plan) || plan.price === null) {
    throw new HttpError(400, "这个套餐还没有开放购买，可以先使用兑换码开通。", "not_for_sale");
  }
  const config = afdianConfig();
  if (!config) throw new HttpError(503, "在线支付暂未开放，可以先使用兑换码开通。", "payments_disabled");

  const orderId = newOrderId();
  await query(
    `INSERT INTO orders (id, user_id, plan_id, days, amount_cents, provider)
     VALUES ($1, $2, $3, $4, $5, 'afdian')`,
    [orderId, user.id, plan.id, plan.days, Math.round(plan.price * 100)],
  );
  const url = checkoutUrl(config, {
    planId: plan.afdianPlanId,
    orderId,
    remark: `${user.username} ${plan.name}`,
  });
  return json({ orderId, url });
});

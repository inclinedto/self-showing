import { requireUser } from "@/lib/server/auth";
import { grantDays, newOrderId } from "@/lib/server/billing";
import { queryOne, transaction } from "@/lib/server/db";
import { HttpError, json, limitByIp, rateLimit, readJson, route } from "@/lib/server/http";
import { normalizeCode } from "@/lib/server/password";

export const POST = route(async (request) => {
  const user = await requireUser(request);
  rateLimit(`redeem:${user.id}`, 10, 10 * 60 * 1000);
  limitByIp(request, "redeem", 20, 10 * 60 * 1000);
  const body = await readJson(request);
  const code = normalizeCode(String(body.code ?? ""));
  if (code.length < 8) throw new HttpError(400, "请输入完整的兑换码。", "invalid");

  const days = await transaction(async (tx) => {
    const [claimed] = await tx.query<{ days: number }>(
      `UPDATE redeem_codes SET used_by = $2, used_at = now()
       WHERE code = $1 AND used_by IS NULL AND used_at IS NULL RETURNING days`,
      [code, user.id],
    );
    if (!claimed) return null;
    await grantDays(tx, user.id, claimed.days);
    await tx.query(
      `INSERT INTO orders (id, user_id, plan_id, days, provider, status, note, paid_at)
       VALUES ($1, $2, 'redeem', $3, 'redeem', 'paid', $4, now())`,
      [newOrderId(), user.id, claimed.days, code],
    );
    return claimed.days;
  });
  if (days === null) throw new HttpError(400, "兑换码无效或已被使用。", "invalid_code");

  const row = await queryOne<{ member_until: Date }>("SELECT member_until FROM users WHERE id = $1", [
    user.id,
  ]);
  return json({ days, memberUntil: row?.member_until ? new Date(row.member_until).toISOString() : null });
});

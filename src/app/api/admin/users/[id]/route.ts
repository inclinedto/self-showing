import { isAdminName, requireAdmin } from "@/lib/server/auth";
import { grantDays, newOrderId } from "@/lib/server/billing";
import { queryOne, transaction } from "@/lib/server/db";
import { HttpError, json, readJson, route, routeId } from "@/lib/server/http";
import { hashPassword, temporaryPassword } from "@/lib/server/password";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request, context: Context) => {
  const admin = await requireAdmin(request);
  const id = await routeId(context);
  const body = await readJson(request);
  const target = await queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE id = $1",
    [id],
  );
  if (!target) throw new HttpError(404, "用户不存在。", "not_found");

  switch (body.action) {
    case "grant": {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 3660) {
        throw new HttpError(400, "天数需为 1–3660 的整数。", "invalid");
      }
      await transaction(async (tx) => {
        await grantDays(tx, id, days);
        await tx.query(
          `INSERT INTO orders (id, user_id, plan_id, days, provider, status, note, paid_at)
           VALUES ($1, $2, 'manual', $3, 'manual', 'paid', $4, now())`,
          [newOrderId(), id, days, `由 ${admin.username} 开通`],
        );
      });
      return json({ ok: true });
    }
    case "revoke":
      await queryOne("UPDATE users SET member_until = NULL WHERE id = $1", [id]);
      return json({ ok: true });
    case "ban":
    case "unban": {
      if (body.action === "ban" && (target.id === admin.id || isAdminName(target.username))) {
        throw new HttpError(400, "不能停用管理员账号。", "invalid");
      }
      await transaction(async (tx) => {
        await tx.query("UPDATE users SET banned = $2 WHERE id = $1", [id, body.action === "ban"]);
        if (body.action === "ban") await tx.query("DELETE FROM sessions WHERE user_id = $1", [id]);
      });
      return json({ ok: true });
    }
    case "resetPassword": {
      const password = temporaryPassword();
      const hash = await hashPassword(password);
      await transaction(async (tx) => {
        await tx.query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, hash]);
        await tx.query("DELETE FROM sessions WHERE user_id = $1", [id]);
      });
      return json({ ok: true, password });
    }
    default:
      throw new HttpError(400, "未知操作。", "invalid");
  }
});

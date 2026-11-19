"use client";

import { Button, Column, Feedback, Input, Row, Tag, Text, useToast } from "@once-ui-system/core";
import { useState } from "react";
import { Loading } from "@/components/ui/Notice";
import { Choice } from "@/components/ui/Choice";
import { api } from "@/lib/api";
import { daysLeft, formatDate, formatDateTime, formatYuan } from "@/lib/format";
import type { OrderItem } from "@/lib/types";
import { styles, useAction, useAdminData } from "./shared";

type AdminUser = {
  id: number;
  username: string;
  memberUntil: string | null;
  banned: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export function UsersPanel() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<Record<number, string>>({});
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string }>();
  const { data, error, loading, reload } = useAdminData<{ users: AdminUser[] }>(
    `/api/admin/users?q=${encodeURIComponent(search)}`,
  );
  const { busy, run } = useAction(reload);

  const patch = (user: AdminUser, body: Record<string, unknown>, success: string) =>
    run(`${user.id}:${body.action}`, () => api<{ password?: string }>(`/api/admin/users/${user.id}`, { method: "PATCH", body }), success);

  return (
    <Column gap="16">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <Row gap="8" vertical="end">
          <Input id="user-search" label="搜索用户名" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button type="submit" variant="secondary" size="l">
            搜索
          </Button>
        </Row>
      </form>
      {tempPassword && (
        <Feedback
          variant="success"
          title={`已重置 ${tempPassword.username} 的密码`}
          description={`临时密码：${tempPassword.password}（只显示这一次，请转告用户登录后尽快修改）`}
          showCloseButton
          onClose={() => setTempPassword(undefined)}
        />
      )}
      {error && <Feedback variant="danger" description={error} />}
      {loading && !data ? (
        <Loading />
      ) : data?.users.length === 0 ? (
        <Text onBackground="neutral-weak">没有找到用户。</Text>
      ) : (
        <div className={styles.list}>
          {data?.users.map((user) => {
            const memberDays = daysLeft(user.memberUntil);
            return (
              <div key={user.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.title}>{user.username}</span>
                  <span className={styles.muted}>#{user.id}</span>
                  {user.isAdmin && (
                    <Tag size="s" variant="accent">
                      管理员
                    </Tag>
                  )}
                  {memberDays > 0 && user.memberUntil && (
                    <Tag size="s" variant="brand">
                      会员至 {formatDate(user.memberUntil)}
                    </Tag>
                  )}
                  {user.banned && (
                    <Tag size="s" variant="danger">
                      已停用
                    </Tag>
                  )}
                  <span className={styles.muted}>
                    注册 {formatDateTime(user.createdAt)}
                    {user.lastLoginAt ? ` · 最近登录 ${formatDateTime(user.lastLoginAt)}` : ""}
                  </span>
                </div>
                <div className={styles.actions}>
                  <div className={styles.inlineInput}>
                    <Input
                      id={`days-${user.id}`}
                      label="天数"
                      height="s"
                      inputMode="numeric"
                      value={days[user.id] ?? "31"}
                      onChange={(event) => setDays((previous) => ({ ...previous, [user.id]: event.target.value }))}
                    />
                  </div>
                  <Button
                    size="s"
                    variant="secondary"
                    loading={busy === `${user.id}:grant`}
                    onClick={() =>
                      patch(user, { action: "grant", days: Number(days[user.id] ?? 31) }, `已为 ${user.username} 增加会员天数`)
                    }
                  >
                    增加会员
                  </Button>
                  {memberDays > 0 && (
                    <Button
                      size="s"
                      variant="tertiary"
                      onClick={() =>
                        window.confirm(`确定取消 ${user.username} 的会员吗？`) &&
                        patch(user, { action: "revoke" }, "已取消会员")
                      }
                    >
                      取消会员
                    </Button>
                  )}
                  <Button
                    size="s"
                    variant="tertiary"
                    onClick={async () => {
                      if (!window.confirm(`确定重置 ${user.username} 的密码吗？`)) return;
                      const result = await patch(user, { action: "resetPassword" }, "密码已重置");
                      if (result?.password) setTempPassword({ username: user.username, password: result.password });
                    }}
                  >
                    重置密码
                  </Button>
                  {!user.isAdmin && (
                    <Button
                      size="s"
                      variant={user.banned ? "secondary" : "danger"}
                      onClick={() =>
                        window.confirm(user.banned ? `恢复 ${user.username}？` : `停用 ${user.username}？停用后无法登录。`) &&
                        patch(user, { action: user.banned ? "unban" : "ban" }, user.banned ? "已恢复" : "已停用")
                      }
                    >
                      {user.banned ? "恢复账号" : "停用账号"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Column>
  );
}

type AdminOrder = OrderItem & { username: string | null; tradeNo: string | null; note: string | null };

const ORDER_FILTERS = [
  { value: "", label: "全部" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const STATUS_TAG = {
  pending: { label: "待支付", variant: "warning" },
  paid: { label: "已完成", variant: "success" },
  cancelled: { label: "已取消", variant: "neutral" },
} as const;

export function OrdersPanel() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useAdminData<{ orders: AdminOrder[] }>(`/api/admin/orders?status=${status}`);
  const { busy, run } = useAction(reload);

  return (
    <Column gap="16">
      <Choice name="订单状态" value={status} onChange={setStatus} options={ORDER_FILTERS} />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        爱发电支付通常会通过 Webhook 自动到账。只有确认用户已付款但没有自动开通时，才需要手动标记。
      </Text>
      {error && <Feedback variant="danger" description={error} />}
      {loading && !data ? (
        <Loading />
      ) : data?.orders.length === 0 ? (
        <Text onBackground="neutral-weak">没有订单。</Text>
      ) : (
        <div className={styles.list}>
          {data?.orders.map((order) => (
            <div key={order.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.title}>
                  {order.planName} · {order.days} 天
                </span>
                <Tag size="s" variant={STATUS_TAG[order.status].variant}>
                  {STATUS_TAG[order.status].label}
                </Tag>
                {order.amountCents > 0 && <span>{formatYuan(order.amountCents)}</span>}
                <span className={styles.muted}>用户：{order.username ?? "已删除"}</span>
              </div>
              <span className={styles.muted}>
                {order.id} · {formatDateTime(order.createdAt)}
                {order.tradeNo ? ` · 爱发电 ${order.tradeNo}` : ""}
                {order.note ? ` · ${order.note}` : ""}
              </span>
              {order.status === "pending" && (
                <div className={styles.actions}>
                  <Button
                    size="s"
                    variant="secondary"
                    loading={busy === `${order.id}:paid`}
                    onClick={() =>
                      window.confirm("确认用户已经付款？标记后会立即开通会员。") &&
                      run(
                        `${order.id}:paid`,
                        () => api(`/api/admin/orders/${order.id}`, { method: "PATCH", body: { action: "markPaid" } }),
                        "已标记为已支付",
                      )
                    }
                  >
                    标记已支付
                  </Button>
                  <Button
                    size="s"
                    variant="tertiary"
                    onClick={() =>
                      run(
                        `${order.id}:cancel`,
                        () => api(`/api/admin/orders/${order.id}`, { method: "PATCH", body: { action: "cancel" } }),
                        "已取消订单",
                      )
                    }
                  >
                    取消
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Column>
  );
}

type Code = { code: string; days: number; note: string | null; createdAt: string; usedAt: string | null; usedBy: string | null };

export function CodesPanel() {
  const { addToast } = useToast();
  const { data, error, loading, reload } = useAdminData<{ codes: Code[] }>("/api/admin/codes");
  const { busy, run } = useAction(reload);
  const [days, setDays] = useState("31");
  const [count, setCount] = useState("10");
  const [note, setNote] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await run(
      "generate",
      () =>
        api<{ codes: string[] }>("/api/admin/codes", {
          body: { days: Number(days), count: Number(count), note },
        }),
      "已生成兑换码",
    );
    if (result) setGenerated(result.codes);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(generated.join("\n"));
      addToast({ variant: "success", message: "已复制全部兑换码" });
    } catch {
      addToast({ variant: "danger", message: "复制失败，请手动选择复制" });
    }
  };

  return (
    <Column gap="16">
      <form onSubmit={generate}>
        <Row gap="8" vertical="end" wrap>
          <div className={styles.inlineInput}>
            <Input id="code-days" label="会员天数" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />
          </div>
          <div className={styles.inlineInput}>
            <Input id="code-count" label="数量" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} />
          </div>
          <Input id="code-note" label="备注（可选）" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" size="l" loading={busy === "generate"}>
            生成
          </Button>
        </Row>
      </form>
      {generated.length > 0 && (
        <Column gap="8">
          <Row horizontal="between" vertical="center">
            <Text variant="label-strong-s">新生成的 {generated.length} 个兑换码</Text>
            <Button size="s" variant="secondary" prefixIcon="clipboard" onClick={copyAll}>
              复制全部
            </Button>
          </Row>
          <textarea className={styles.codes} readOnly value={generated.join("\n")} aria-label="新生成的兑换码" />
        </Column>
      )}
      {error && <Feedback variant="danger" description={error} />}
      {loading && !data ? (
        <Loading />
      ) : data?.codes.length === 0 ? (
        <Text onBackground="neutral-weak">还没有兑换码。</Text>
      ) : (
        <div className={styles.list}>
          {data?.codes.map((code) => (
            <div key={code.code} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.title} style={{ fontFamily: "var(--font-code)" }}>
                  {code.code}
                </span>
                <span>{code.days} 天</span>
                {code.usedAt ? (
                  <Tag size="s" variant="neutral">
                    已被 {code.usedBy ?? "已删除用户"} 使用
                  </Tag>
                ) : (
                  <Tag size="s" variant="success">
                    未使用
                  </Tag>
                )}
                <span className={styles.muted}>
                  {formatDateTime(code.createdAt)}
                  {code.note ? ` · ${code.note}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Column>
  );
}

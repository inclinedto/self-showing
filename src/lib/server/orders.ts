import { getPlan } from "@/resources/plans";
import type { OrderItem } from "@/lib/types";

export type OrderRow = {
  id: string;
  user_id: number | null;
  plan_id: string;
  days: number;
  amount_cents: number;
  provider: OrderItem["provider"];
  status: OrderItem["status"];
  provider_trade_no: string | null;
  note: string | null;
  created_at: Date;
  paid_at: Date | null;
};

export const ORDER_COLUMNS =
  "id, user_id, plan_id, days, amount_cents, provider, status, provider_trade_no, note, created_at, paid_at";

const PROVIDER_NAMES: Record<OrderItem["provider"], string> = {
  afdian: "爱发电",
  redeem: "兑换码",
  manual: "站长开通",
};

export function planName(row: Pick<OrderRow, "plan_id" | "provider">): string {
  return getPlan(row.plan_id)?.name ?? PROVIDER_NAMES[row.provider] ?? row.plan_id;
}

export function toOrderItem(row: OrderRow): OrderItem {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: planName(row),
    days: row.days,
    amountCents: row.amount_cents,
    provider: row.provider,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
  };
}

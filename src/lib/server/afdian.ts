import { createHash } from "node:crypto";

/** 爱发电开放平台：https://afdian.com/dashboard/dev */
export type AfdianConfig = { userId: string; token: string; baseURL: string };

export type AfdianOrder = {
  out_trade_no: string;
  custom_order_id?: string;
  user_id?: string;
  plan_id?: string;
  month?: number;
  total_amount?: string;
  show_amount?: string;
  status?: number;
  remark?: string;
  product_type?: number;
};

export function afdianConfig(): AfdianConfig | null {
  const userId = process.env.AFDIAN_USER_ID?.trim() ?? "";
  const token = process.env.AFDIAN_TOKEN?.trim() ?? "";
  if (!userId || !token) return null;
  return {
    userId,
    token,
    baseURL: (process.env.AFDIAN_BASE_URL?.trim() || "https://afdian.com").replace(/\/+$/, ""),
  };
}

export function signRequest(token: string, userId: string, params: string, ts: number): string {
  return createHash("md5")
    .update(`${token}params${params}ts${ts}user_id${userId}`)
    .digest("hex");
}

export function checkoutUrl(
  config: Pick<AfdianConfig, "baseURL">,
  { planId, orderId, remark }: { planId: string; orderId: string; remark: string },
): string {
  const url = new URL("/order/create", config.baseURL);
  url.searchParams.set("plan_id", planId);
  url.searchParams.set("product_type", "0");
  url.searchParams.set("month", "1");
  url.searchParams.set("custom_order_id", orderId);
  url.searchParams.set("remark", remark);
  return url.toString();
}

async function call<T>(config: AfdianConfig, path: string, params: Record<string, unknown>): Promise<T> {
  const paramsJson = JSON.stringify(params);
  const ts = Math.floor(Date.now() / 1000);
  const response = await fetch(`${config.baseURL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: config.userId,
      params: paramsJson,
      ts,
      sign: signRequest(config.token, config.userId, paramsJson, ts),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ec !== 200) {
    throw new Error(`Afdian ${path} failed: ${response.status} ${data?.ec ?? ""} ${data?.em ?? ""}`);
  }
  return data.data as T;
}

/** Looks an order up through the signed API, which is the only trustworthy source of payment status. */
export async function fetchOrder(config: AfdianConfig, outTradeNo: string): Promise<AfdianOrder | null> {
  const data = await call<{ list?: AfdianOrder[] }>(config, "/api/open/query-order", {
    out_trade_no: outTradeNo,
  });
  return data.list?.find((order) => order.out_trade_no === outTradeNo) ?? null;
}

/** Scans the most recent orders for one we created, for when the webhook never arrived. */
export async function findOrderByCustomId(
  config: AfdianConfig,
  customOrderId: string,
): Promise<AfdianOrder | null> {
  for (let page = 1; page <= 3; page++) {
    const data = await call<{ list?: AfdianOrder[]; total_page?: number }>(
      config,
      "/api/open/query-order",
      { page, per_page: 100 },
    );
    const match = data.list?.find((order) => order.custom_order_id === customOrderId);
    if (match) return match;
    if (!data.total_page || page >= data.total_page) break;
  }
  return null;
}

export function amountToCents(amount: string | undefined): number {
  const value = Number.parseFloat(amount ?? "0");
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { afdianConfig, fetchOrder } from "@/lib/server/afdian";
import { settleAfdianOrder } from "@/lib/server/billing";
import { dbConfigured } from "@/lib/server/db";

export const runtime = "nodejs";

// 爱发电 treats anything other than {"ec":200} as a failure and retries.
const ack = () => NextResponse.json({ ec: 200, em: "" });

function keyMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook for 爱发电 orders. The payload itself is not trusted: the order is re-fetched through
 * the signed API before anything is granted.
 */
export async function POST(request: NextRequest) {
  const key = process.env.AFDIAN_WEBHOOK_KEY?.trim();
  if (key && !keyMatches(request.nextUrl.searchParams.get("key") ?? "", key)) {
    return NextResponse.json({ ec: 403, em: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const outTradeNo = String(body?.data?.order?.out_trade_no ?? "").trim();
  const config = afdianConfig();
  if (!outTradeNo || !config) return ack();
  if (!dbConfigured()) return NextResponse.json({ ec: 503, em: "unavailable" }, { status: 503 });

  try {
    const order = await fetchOrder(config, outTradeNo);
    if (!order) {
      console.warn("Afdian webhook for unknown order", outTradeNo);
      return ack();
    }
    const result = await settleAfdianOrder(order);
    console.info("Afdian webhook", outTradeNo, result);
    return ack();
  } catch (error) {
    console.error("Afdian webhook failed", error);
    return NextResponse.json({ ec: 500, em: "error" }, { status: 500 });
  }
}

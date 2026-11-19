"use client";

import {
  Button,
  Column,
  Feedback,
  Grid,
  Heading,
  Icon,
  Row,
  SmartLink,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useEffect, useState } from "react";
import { QuotaTable } from "@/components/billing/QuotaTable";
import { RedeemForm } from "@/components/billing/RedeemForm";
import { loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { daysLeft, formatDate, formatPrice } from "@/lib/format";
import type { OrderItem } from "@/lib/types";
import { isPurchasable, MEMBER_PERKS, PLANS, type Plan } from "@/resources/plans";

const FAQ = [
  {
    q: "额度是怎么计算的？",
    a: "每项功能每天单独计算，北京时间零点重置。表格提取按页计算，其余按次或按条计算。AI 出错没有返回结果时会自动退回额度。",
  },
  {
    q: "怎么付款？",
    a: "通过爱发电在线支付，支持微信和支付宝。支付完成后会员会自动开通，一般几秒钟内到账；如果没到账，点“我已支付”刷新即可。",
  },
  {
    q: "会员可以叠加吗？",
    a: "可以。续费或使用兑换码会在当前到期时间基础上顺延。",
  },
  {
    q: "可以退款吗？",
    a: "虚拟服务开通后原则上不退款。如果遇到重复扣款或无法使用的情况，请联系站长处理。",
  },
];

type Pending = { orderId: string; url: string };

export function PricingView() {
  const { user, status, refresh } = useSession();
  const { addToast } = useToast();
  const [buying, setBuying] = useState<string>();
  const [pending, setPending] = useState<Pending>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const paymentsOpen = Boolean(status?.payments);

  useEffect(() => {
    if (!pending) return;
    let stopped = false;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > 10 * 60 * 1000) return clearInterval(timer);
      try {
        const { order } = await api<{ order: OrderItem }>(`/api/pay/orders/${pending.orderId}`);
        if (!stopped && order.status === "paid") {
          clearInterval(timer);
          setPending(undefined);
          addToast({ variant: "success", message: "支付成功，会员已开通" });
          refresh();
        }
      } catch {
        // Keep polling; the user can also press "我已支付".
      }
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pending, addToast, refresh]);

  const buy = async (plan: Plan) => {
    setError(undefined);
    // Opened synchronously so popup blockers allow it; the URL is filled in once the order exists.
    const popup = window.open("", "_blank");
    setBuying(plan.id);
    try {
      const data = await api<Pending>("/api/pay/checkout", { body: { planId: plan.id } });
      if (popup) popup.location.href = data.url;
      setPending(data);
    } catch (buyError) {
      popup?.close();
      setError(errorMessage(buyError));
    } finally {
      setBuying(undefined);
    }
  };

  const checkPaid = async () => {
    if (!pending) return;
    setChecking(true);
    try {
      const { order } = await api<{ order: OrderItem }>(`/api/pay/orders/${pending.orderId}`, {
        method: "POST",
        body: {},
      });
      if (order.status === "paid") {
        setPending(undefined);
        addToast({ variant: "success", message: "支付成功，会员已开通" });
        await refresh();
      } else {
        addToast({ variant: "danger", message: "还没有查到支付记录，请稍等片刻再试" });
      }
    } catch (checkError) {
      addToast({ variant: "danger", message: errorMessage(checkError) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Column fillWidth gap="48">
      <PageHeader
        icon="crown"
        title="会员"
        description="免费用户每天都有额度。经常使用的话，开通会员可以获得更多额度，也能支持站长继续维护“角度偏爱”。"
      />

      {user?.isMember && user.memberUntil && (
        <Feedback
          variant="success"
          title="你已经是会员"
          description={`有效期至 ${formatDate(user.memberUntil)}（剩余 ${daysLeft(user.memberUntil)} 天），续费会自动顺延。`}
        />
      )}

      {!paymentsOpen && (
        <Feedback
          variant="info"
          title="在线支付即将开放"
          description="价格和支付方式还在准备中。已有兑换码的话，可以在下方直接兑换。"
        />
      )}

      <Grid columns="3" s={{ columns: "1" }} gap="16">
        {PLANS.map((plan) => {
          const purchasable = paymentsOpen && isPurchasable(plan);
          return (
            <Column
              key={plan.id}
              gap="16"
              padding="24"
              radius="l"
              border={plan.recommended ? "brand-medium" : "neutral-alpha-weak"}
              background={plan.recommended ? "brand-alpha-weak" : "surface"}
              fillWidth
            >
              <Row horizontal="between" vertical="center">
                <Heading as="h2" variant="heading-strong-m">
                  {plan.name}
                </Heading>
                {plan.recommended && (
                  <Tag size="s" variant="brand">
                    推荐
                  </Tag>
                )}
              </Row>
              <Row gap="8" vertical="end">
                <Text variant="display-strong-xs">{formatPrice(plan.price)}</Text>
                {plan.price !== null && plan.originalPrice && (
                  <Text variant="body-default-s" onBackground="neutral-weak" style={{ textDecoration: "line-through" }}>
                    {formatPrice(plan.originalPrice)}
                  </Text>
                )}
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {plan.days} 天会员 · {plan.note}
              </Text>
              {user ? (
                <Button
                  variant={plan.recommended ? "primary" : "secondary"}
                  fillWidth
                  disabled={!purchasable || Boolean(buying)}
                  loading={buying === plan.id}
                  onClick={() => buy(plan)}
                >
                  {purchasable ? (user.isMember ? "续费" : "立即开通") : "暂未开放"}
                </Button>
              ) : (
                <Button
                  variant={plan.recommended ? "primary" : "secondary"}
                  fillWidth
                  href={loginHref("/pricing")}
                  disabled={!status?.db}
                >
                  登录后购买
                </Button>
              )}
            </Column>
          );
        })}
      </Grid>

      {error && <Feedback variant="danger" description={error} />}

      {pending && (
        <Feedback variant="info" title="等待支付" description="已在新窗口打开爱发电支付页面。支付完成后回到这里，会员会自动开通。">
          <Row gap="8" paddingTop="12" wrap>
            <Button size="s" variant="primary" onClick={checkPaid} loading={checking}>
              我已支付
            </Button>
            <Button size="s" variant="secondary" href={pending.url} suffixIcon="arrowUpRight">
              没有弹出？点这里去支付
            </Button>
          </Row>
        </Feedback>
      )}

      <Column gap="16">
        <Heading as="h2" variant="heading-strong-l">
          会员权益
        </Heading>
        <Grid columns="2" s={{ columns: "1" }} gap="8">
          {MEMBER_PERKS.map((perk) => (
            <Row key={perk} gap="8" vertical="center">
              <Icon name="checkCircle" size="s" onBackground="brand-medium" />
              <Text variant="body-default-m">{perk}</Text>
            </Row>
          ))}
        </Grid>
        <QuotaTable includeFreeTools />
      </Column>

      <Column gap="12" padding="24" radius="l" border="neutral-alpha-weak" background="surface">
        <Heading as="h2" variant="heading-strong-m">
          使用兑换码
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          从站长那里拿到的兑换码，可以在这里直接兑换会员天数。
        </Text>
        {user ? (
          <RedeemForm />
        ) : (
          <Text variant="body-default-s">
            请先 <SmartLink href={loginHref("/pricing")}>登录</SmartLink> 再兑换。
          </Text>
        )}
      </Column>

      <Column gap="16">
        <Heading as="h2" variant="heading-strong-l">
          常见问题
        </Heading>
        <Column gap="12">
          {FAQ.map((item) => (
            <Column key={item.q} gap="4" padding="16" radius="m" border="neutral-alpha-weak">
              <Text variant="heading-strong-xs">{item.q}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {item.a}
              </Text>
            </Column>
          ))}
        </Column>
      </Column>
    </Column>
  );
}

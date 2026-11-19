"use client";

import { Button, Column, Feedback, Heading, Icon, SmartLink, Tag, Text, useToast } from "@once-ui-system/core";
import classNames from "classnames";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RedeemForm } from "@/components/billing/RedeemForm";
import { loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { Logo } from "@/components/shell/Logo";
import { api, errorMessage } from "@/lib/api";
import { daysLeft, formatDate, formatPrice } from "@/lib/format";
import type { OrderItem } from "@/lib/types";
import type { IconName } from "@/resources/icons";
import { kitTools } from "@/resources/kit";
import {
  FEATURE_KEYS,
  FEATURES,
  FREE_QUOTAS,
  isPurchasable,
  MEMBER_PERKS,
  MEMBER_QUOTAS,
  MEMBERSHIP_INTRO,
  PLANS,
  type Plan,
  PRICE_NOTE,
} from "@/resources/plans";
import { site, tools } from "@/resources/site";
import styles from "./pricing.module.scss";

const FEATURE_ICONS: Record<string, IconName> = {
  extract: "table",
  ask: "chat",
  chat: "sparkles",
  post: "tree",
  comment: "comment",
  question: "inbox",
};

const NOTES = [
  "会员是虚拟服务，开通后不支持无理由退款；重复扣款或开通失败请联系站长处理。",
  "按天计算，不会自动续费。到期后自动恢复为免费额度，已发的内容不受影响。",
  "续费或使用兑换码会在当前到期时间上顺延，不会浪费剩余天数。",
  "支付由爱发电提供，支持微信和支付宝，付款后一般几秒内开通。",
];

const FAQ = [
  {
    q: "额度是怎么计算的？",
    a: "每项功能每天单独计算，北京时间零点重置。表格提取按页计算，其余按次或按条计算。AI 出错没有返回结果时会自动退回额度。",
  },
  {
    q: "不开会员能用吗？",
    a: "能。树洞、提问箱每天都有免费额度，格式转换和全部小工具免费不限次，AI 工具每天也有免费次数。",
  },
  {
    q: "付款后没有开通怎么办？",
    a: "先在本页点「我已支付」刷新一下；还是不行的话，到提问箱留言（写上爱发电订单号的后 6 位就好），站长会尽快处理。",
  },
];

const BEST_RATIO = Math.max(...FEATURE_KEYS.map((key) => Math.round(MEMBER_QUOTAS[key] / FREE_QUOTAS[key])));

type Pending = { orderId: string; url: string };

function perMonth(plan: Plan): string | null {
  if (plan.price === null || plan.days <= 31) return null;
  return `约 ¥${((plan.price / plan.days) * 30).toFixed(1)}/月`;
}

export function PricingView() {
  const { user, status, refresh } = useSession();
  const { addToast } = useToast();
  const [selected, setSelected] = useState(() => (PLANS.find((plan) => plan.recommended) ?? PLANS[0]).id);
  const [members, setMembers] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [pending, setPending] = useState<Pending>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const paymentsOpen = Boolean(status?.payments);
  const plan = PLANS.find((item) => item.id === selected) ?? PLANS[0];
  const purchasable = paymentsOpen && isPurchasable(plan);

  useEffect(() => {
    if (!status?.db) return;
    api<{ members: number | null }>("/api/pay/stats")
      .then((data) => setMembers(data.members))
      .catch(() => {});
  }, [status?.db]);

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

  const buy = async () => {
    setError(undefined);
    // Opened synchronously so popup blockers allow it; the URL is filled in once the order exists.
    const popup = window.open("", "_blank");
    setBuying(true);
    try {
      const data = await api<Pending>("/api/pay/checkout", { body: { planId: plan.id } });
      if (popup) popup.location.href = data.url;
      setPending(data);
    } catch (buyError) {
      popup?.close();
      setError(errorMessage(buyError));
    } finally {
      setBuying(false);
    }
  };

  const checkPaid = async () => {
    if (!pending) return;
    setChecking(true);
    try {
      const { order } = await api<{ order: OrderItem }>(`/api/pay/orders/${pending.orderId}`, { method: "POST", body: {} });
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

  const buyButton = (size: "m" | "l") =>
    user ? (
      <Button size={size} variant="primary" fillWidth disabled={!purchasable || buying} loading={buying} onClick={buy} prefixIcon="crown">
        {purchasable ? (user.isMember ? `续费${plan.name}` : `开通${plan.name}`) : "暂未开放购买"}
      </Button>
    ) : (
      <Button size={size} variant="primary" fillWidth href={loginHref("/pricing")} disabled={!status?.db}>
        登录后开通
      </Button>
    );

  return (
    <Column fillWidth gap="40" className={styles.page}>
      <section className={styles.column} aria-labelledby="membership-title">
        <div className={styles.intro}>
          <div className={styles.author}>
            <Logo size={60} id="pricing-logo" />
            <div>
              <Heading as="h1" id="membership-title" variant="heading-strong-xl">
                {site.name}会员
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                by {site.owner} · 持续更新中
              </Text>
            </div>
          </div>
          <Text as="p" variant="body-default-m" onBackground="neutral-medium" className={styles.introText}>
            {MEMBERSHIP_INTRO}
          </Text>
          <ul className={styles.perks}>
            {MEMBER_PERKS.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          <ul className={styles.facts}>
            {members !== null && (
              <li>
                <Icon name="users" size="xs" />
                已有 {members} 位会员
              </li>
            )}
            <li>
              <Icon name="bolt" size="xs" />
              AI 额度最高 ×{BEST_RATIO}
            </li>
            <li>
              <Icon name="grid" size="xs" />
              {tools.length + kitTools.length} 个工具
            </li>
            <li>
              <Icon name="refresh" size="xs" />
              到期不自动续费
            </li>
          </ul>
          {user?.isMember && user.memberUntil && (
            <Feedback
              variant="success"
              title="你已经是会员啦"
              description={`有效期至 ${formatDate(user.memberUntil)}（剩余 ${daysLeft(user.memberUntil)} 天），续费会自动顺延。`}
            />
          )}
        </div>

        <div className={styles.buy} id="buy">
          <fieldset className={styles.plans}>
            <legend className={styles.plansLegend}>选择时长</legend>
            {PLANS.map((item) => (
              <label key={item.id} className={classNames(styles.plan, item.id === selected && styles.planActive)}>
                <input
                  type="radio"
                  name="plan"
                  className="visually-hidden"
                  checked={item.id === selected}
                  onChange={() => setSelected(item.id)}
                />
                <span className={styles.planName}>
                  {item.name}
                  {item.recommended && (
                    <Tag size="s" variant="accent">
                      推荐
                    </Tag>
                  )}
                </span>
                <span className={styles.planPrice}>{formatPrice(item.price)}</span>
                <span className={styles.planNote}>{perMonth(item) ?? item.note}</span>
              </label>
            ))}
          </fieldset>

          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(plan.price)}</span>
            {plan.price !== null && plan.originalPrice && <s className={styles.original}>{formatPrice(plan.originalPrice)}</s>}
            <span className={styles.days}>/ {plan.days} 天</span>
          </div>
          {PRICE_NOTE && <p className={styles.priceNote}>{PRICE_NOTE}</p>}
          {buyButton("l")}
          <p className={styles.payHint}>
            {paymentsOpen ? "通过爱发电支付 · 微信 / 支付宝" : "价格和支付方式还在准备中，已有兑换码可以在下方直接兑换。"}
          </p>
        </div>
      </section>

      {error && <Feedback variant="danger" description={error} />}
      {pending && (
        <Feedback variant="info" title="等待支付" description="已在新窗口打开爱发电支付页面。支付完成后回到这里，会员会自动开通。">
          <div className={styles.pendingActions}>
            <Button size="s" variant="primary" onClick={checkPaid} loading={checking}>
              我已支付
            </Button>
            <Button size="s" variant="secondary" href={pending.url} suffixIcon="arrowUpRight">
              没有弹出？点这里去支付
            </Button>
          </div>
        </Feedback>
      )}

      <section className={styles.section} aria-labelledby="catalog-title">
        <Heading as="h2" id="catalog-title" variant="heading-strong-l">
          会员能多用什么
        </Heading>
        <ol className={styles.catalog}>
          {FEATURE_KEYS.map((key) => (
            <li key={key} className={styles.entry}>
              <span className={styles.entryIcon}>
                <Icon name={FEATURE_ICONS[key] ?? "sparkles"} size="s" />
              </span>
              <span className={styles.entryName}>{FEATURES[key].label}</span>
              <span className={styles.entryFree}>
                免费 {FREE_QUOTAS[key]} {FEATURES[key].unit}/天
              </span>
              <span className={styles.entryMember}>
                会员 {MEMBER_QUOTAS[key]} {FEATURES[key].unit}/天
              </span>
            </li>
          ))}
          <li className={styles.entry}>
            <span className={styles.entryIcon}>
              <Icon name="convert" size="s" />
            </span>
            <span className={styles.entryName}>
              <Link href="/tools">格式转换 + {kitTools.length} 个小工具</Link>
            </span>
            <span className={styles.entryFree}>人人免费</span>
            <span className={styles.entryTag}>
              <Tag size="s" variant="success">
                不限次
              </Tag>
            </span>
          </li>
        </ol>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          额度每天北京时间零点重置。新功能上线时会员优先体验。
        </Text>
      </section>

      <section className={styles.section} aria-labelledby="notes-title">
        <Heading as="h2" id="notes-title" variant="heading-strong-l">
          购买须知
        </Heading>
        <ul className={styles.notes}>
          {NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>
            有问题可以去 <SmartLink href="/box">提问箱</SmartLink> 留言，也可以查看
            <SmartLink href="/terms">用户协议</SmartLink>。
          </li>
        </ul>
      </section>

      <section className={styles.redeem} aria-labelledby="redeem-title">
        <Heading as="h2" id="redeem-title" variant="heading-strong-m">
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
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <Heading as="h2" id="faq-title" variant="heading-strong-l">
          常见问题
        </Heading>
        <div className={styles.faq}>
          {FAQ.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className={styles.sticky}>
        <div className={styles.stickyPrice}>
          <span>{plan.name}</span>
          <strong>{formatPrice(plan.price)}</strong>
        </div>
        <div className={styles.stickyButton}>{buyButton("m")}</div>
      </div>
    </Column>
  );
}

"use client";

import {
  Button,
  Column,
  Feedback,
  Grid,
  Heading,
  PasswordInput,
  ProgressBar,
  Row,
  SmartLink,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RedeemForm } from "@/components/billing/RedeemForm";
import { useSession } from "@/components/session/SessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { daysLeft, formatDate, formatDateTime, formatYuan, relativeTime } from "@/lib/format";
import type { OrderItem, PostItem, QuestionItem } from "@/lib/types";
import { FEATURE_KEYS, FEATURES } from "@/resources/plans";

const ORDER_STATUS = {
  pending: { label: "待支付", variant: "neutral" },
  paid: { label: "已完成", variant: "success" },
  cancelled: { label: "已取消", variant: "neutral" },
} as const;

function Section({ id, title, children, action }: { id?: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Column id={id} gap="16" padding="24" radius="l" border="neutral-alpha-weak" background="surface" s={{ padding: "16" }}>
      <Row horizontal="between" vertical="center" gap="12">
        <Heading as="h2" variant="heading-strong-m">
          {title}
        </Heading>
        {action}
      </Row>
      {children}
    </Column>
  );
}

export function AccountView() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[] | null>(null);
  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);

  const loadOrders = useCallback(() => {
    api<{ orders: OrderItem[] }>("/api/pay/orders")
      .then((data) => setOrders(data.orders))
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    loadOrders();
    api<{ posts: PostItem[] }>("/api/treehole/mine")
      .then((data) => setPosts(data.posts))
      .catch(() => setPosts([]));
    api<{ questions: QuestionItem[] }>("/api/box/mine")
      .then((data) => setQuestions(data.questions))
      .catch(() => setQuestions([]));
  }, [loadOrders]);

  if (!user) return null;
  const remaining = daysLeft(user.memberUntil);

  return (
    <Column fillWidth gap="20" maxWidth={48} style={{ margin: "0 auto" }}>
      <PageHeader
        icon="user"
        title="我的账户"
        actions={
          <Button
            variant="secondary"
            size="s"
            prefixIcon="logout"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            退出登录
          </Button>
        }
      />

      <Section title={user.username}>
        <Row gap="12" vertical="center" wrap>
          {user.isMember ? (
            <Tag variant="brand" prefixIcon="crown">
              会员
            </Tag>
          ) : (
            <Tag variant="neutral">免费版</Tag>
          )}
          {user.isAdmin && <Tag variant="accent">管理员</Tag>}
          <Text variant="body-default-s" onBackground="neutral-weak">
            注册于 {formatDate(user.createdAt)}
          </Text>
        </Row>
        <Row horizontal="between" vertical="center" gap="12" s={{ direction: "column", vertical: "start" }}>
          <Text variant="body-default-m">
            {user.isMember && user.memberUntil
              ? `会员有效期至 ${formatDate(user.memberUntil)}，还剩 ${remaining} 天。`
              : "开通会员可以获得更多 AI 工具和社区额度。"}
          </Text>
          <Button href="/pricing" variant={user.isMember ? "secondary" : "primary"} size="s" prefixIcon="crown">
            {user.isMember ? "续费会员" : "开通会员"}
          </Button>
        </Row>
      </Section>

      <Section title="今日额度" action={<Text variant="body-default-xs" onBackground="neutral-weak">北京时间零点重置</Text>}>
        <Grid columns="2" s={{ columns: "1" }} gap="16">
          {FEATURE_KEYS.map((key) => {
            const used = user.usage[key] ?? 0;
            const quota = user.quotas[key];
            return (
              <Column key={key} gap="8">
                <Row horizontal="between">
                  <Text variant="label-default-s">{FEATURES[key].label}</Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {used} / {quota} {FEATURES[key].unit}
                  </Text>
                </Row>
                <ProgressBar value={Math.min(100, (used / quota) * 100)} label={false} />
              </Column>
            );
          })}
        </Grid>
      </Section>

      <Section title="兑换码">
        <RedeemForm onRedeemed={loadOrders} />
      </Section>

      <Section title="订单记录">
        {orders === null ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            加载中…
          </Text>
        ) : orders.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            还没有订单。
          </Text>
        ) : (
          <Column gap="8">
            {orders.map((order) => (
              <Row
                key={order.id}
                horizontal="between"
                vertical="center"
                gap="12"
                paddingY="8"
                borderBottom="neutral-alpha-weak"
                s={{ direction: "column", vertical: "start" }}
              >
                <Column gap="4">
                  <Text variant="label-default-s">
                    {order.planName} · {order.days} 天
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {formatDateTime(order.createdAt)} · 订单号 {order.id}
                  </Text>
                </Column>
                <Row gap="8" vertical="center">
                  {order.amountCents > 0 && <Text variant="body-default-s">{formatYuan(order.amountCents)}</Text>}
                  <Tag size="s" variant={ORDER_STATUS[order.status].variant}>
                    {ORDER_STATUS[order.status].label}
                  </Tag>
                </Row>
              </Row>
            ))}
          </Column>
        )}
      </Section>

      <Section id="posts" title="我的树洞" action={<SmartLink href="/treehole">去树洞</SmartLink>}>
        {posts === null ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            加载中…
          </Text>
        ) : posts.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            还没有发过树洞。只有你自己能在这里看到自己发过的内容。
          </Text>
        ) : (
          <Column gap="8">
            {posts.map((post) => (
              <Link key={post.id} href={`/treehole/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Row gap="12" vertical="center" paddingY="8" borderBottom="neutral-alpha-weak">
                  <Text variant="body-default-s" style={{ flex: 1, minWidth: 0 }} className="line-clamp-6">
                    {post.content.length > 80 ? `${post.content.slice(0, 80)}…` : post.content}
                  </Text>
                  {post.status === "hidden" && (
                    <Tag size="s" variant="warning">
                      审核中
                    </Tag>
                  )}
                  <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: "nowrap" }}>
                    {relativeTime(post.createdAt)} · {post.likeCount} 抱抱 · {post.commentCount} 评论
                  </Text>
                </Row>
              </Link>
            ))}
          </Column>
        )}
      </Section>

      <Section id="questions" title="我的提问" action={<SmartLink href="/box">去提问箱</SmartLink>}>
        {questions === null ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            加载中…
          </Text>
        ) : questions.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            还没有提过问题。
          </Text>
        ) : (
          <Column gap="8">
            {questions.slice(0, 20).map((question) => (
              <Column key={question.id} gap="4" paddingY="8" borderBottom="neutral-alpha-weak">
                <Row gap="8" vertical="center">
                  <Text variant="body-default-s" style={{ flex: 1 }}>
                    {question.content}
                  </Text>
                  <Tag size="s" variant={question.status === "answered" ? "success" : "neutral"}>
                    {question.status === "answered" ? "已回答" : question.status === "hidden" ? "未公开" : "等待回答"}
                  </Tag>
                </Row>
                {question.answer && (
                  <Text variant="body-default-s" onBackground="brand-strong" className="pre-wrap">
                    回答：{question.answer}
                  </Text>
                )}
              </Column>
            ))}
          </Column>
        )}
      </Section>

      <Section title="修改密码">
        <ChangePassword />
      </Section>
    </Column>
  );
}

function ChangePassword() {
  const { addToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (next !== confirm) return setError("两次输入的新密码不一致。");
    setBusy(true);
    try {
      await api("/api/auth/password", { body: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      addToast({ variant: "success", message: "密码已修改，其他设备需要重新登录" });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Column gap="12" maxWidth={24}>
        <PasswordInput
          id="current-password"
          label="当前密码"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <PasswordInput
          id="new-password"
          label="新密码"
          autoComplete="new-password"
          description="至少 8 位"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
        <PasswordInput
          id="confirm-new-password"
          label="确认新密码"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        {error && <Feedback variant="danger" description={error} />}
        <Row>
          <Button type="submit" variant="secondary" loading={busy} disabled={!current || !next}>
            修改密码
          </Button>
        </Row>
      </Column>
    </form>
  );
}

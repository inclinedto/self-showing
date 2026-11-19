"use client";

import { Column, Feedback, Heading, Row, Tag, Text } from "@once-ui-system/core";
import { useSession } from "@/components/session/SessionProvider";
import { Loading } from "@/components/ui/Notice";
import { formatYuan } from "@/lib/format";
import { type Feature, FEATURES } from "@/resources/plans";
import { styles, useAdminData } from "./shared";

type Stats = {
  totals: Record<string, number>;
  usage: { feature: Feature; total: number; users: number }[];
};

const CARDS: { key: string; label: string; format?: (value: number) => string }[] = [
  { key: "users", label: "注册用户" },
  { key: "new_users", label: "近 24 小时新用户" },
  { key: "members", label: "有效会员" },
  { key: "revenue_cents", label: "累计收入", format: formatYuan },
  { key: "paid_orders", label: "已支付订单" },
  { key: "posts", label: "可见树洞" },
  { key: "posts_today", label: "近 24 小时树洞" },
  { key: "pending_questions", label: "待回答提问" },
  { key: "hidden_items", label: "被隐藏的内容" },
  { key: "open_reports", label: "未处理举报" },
];

export function OverviewPanel() {
  const { status } = useSession();
  const { data, error, loading } = useAdminData<Stats>("/api/admin/stats");

  return (
    <Column gap="24">
      <Column gap="8">
        <Heading as="h2" variant="heading-strong-s">
          配置状态
        </Heading>
        <Row gap="8" wrap>
          <Tag variant={status?.db ? "success" : "danger"}>{status?.db ? "数据库已连接" : "数据库未配置"}</Tag>
          <Tag variant={status?.ai ? "success" : "warning"}>{status?.ai ? "AI 已配置" : "AI 演示模式（未配置密钥）"}</Tag>
          <Tag variant={status?.payments ? "success" : "warning"}>
            {status?.payments ? "在线支付已开启" : "在线支付未开启（缺爱发电配置或套餐价格）"}
          </Tag>
          <Tag variant="neutral">{status?.inviteRequired ? "注册需要邀请码" : "开放注册"}</Tag>
        </Row>
      </Column>

      {error && <Feedback variant="danger" description={error} />}
      {loading && !data ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className={styles.stats}>
              {CARDS.map((card) => {
                const value = data.totals[card.key] ?? 0;
                return (
                  <div key={card.key} className={styles.stat}>
                    <span className={styles.muted}>{card.label}</span>
                    <span className={styles.statValue}>{card.format ? card.format(value) : value}</span>
                  </div>
                );
              })}
            </div>
            <Column gap="8">
              <Heading as="h2" variant="heading-strong-s">
                今日用量
              </Heading>
              {data.usage.length === 0 ? (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  今天还没有人使用。
                </Text>
              ) : (
                <div className={styles.list}>
                  {data.usage.map((row) => (
                    <div key={row.feature} className={styles.item}>
                      <div className={styles.itemHead}>
                        <span className={styles.title}>{FEATURES[row.feature]?.label ?? row.feature}</span>
                        <span className={styles.muted}>
                          {row.total} {FEATURES[row.feature]?.unit} · {row.users} 人
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Column>
          </>
        )
      )}
    </Column>
  );
}

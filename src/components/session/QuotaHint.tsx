"use client";

import { Feedback, Row, SmartLink, Tag, Text } from "@once-ui-system/core";
import { type Feature, FEATURES } from "@/resources/plans";
import { useSession } from "./SessionProvider";

export function remainingQuota(
  user: { quotas: Record<Feature, number>; usage: Partial<Record<Feature, number>> },
  feature: Feature,
) {
  return Math.max(0, user.quotas[feature] - (user.usage[feature] ?? 0));
}

/** Today's remaining quota for a feature, with an upgrade link for free users. */
export function QuotaHint({ feature }: { feature: Feature }) {
  const { user, status } = useSession();
  const { unit, label } = FEATURES[feature];

  if (!user) {
    if (status && !status.db) {
      return (
        <Tag size="s" variant="neutral">
          演示模式 · 无需登录
        </Tag>
      );
    }
    return null;
  }

  const left = remainingQuota(user, feature);
  return (
    <Row gap="8" vertical="center" wrap>
      <Tag size="s" variant={left > 0 ? (user.isMember ? "brand" : "neutral") : "danger"}>
        {`今日${label}剩余 ${left} / ${user.quotas[feature]} ${unit}`}
      </Tag>
      {!user.isMember && (
        <SmartLink href="/pricing">
          <Text variant="label-default-s">开通会员提升额度</Text>
        </SmartLink>
      )}
    </Row>
  );
}

export function DemoBanner() {
  const { status } = useSession();
  if (!status || status.ai) return null;
  return (
    <Feedback
      variant="info"
      title="演示模式"
      description="站长还没有配置 AI 模型密钥，现在返回的是示例结果，可以先体验完整流程。"
    />
  );
}

export function QuotaExceeded({ message }: { message: string }) {
  const { user } = useSession();
  return (
    <Feedback variant="warning" title="今日额度已用完" description={message}>
      {!user?.isMember && (
        <Row paddingTop="8">
          <SmartLink href="/pricing">查看会员方案</SmartLink>
        </Row>
      )}
    </Feedback>
  );
}

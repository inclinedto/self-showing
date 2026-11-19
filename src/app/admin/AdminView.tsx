"use client";

import { Column, SegmentedControl } from "@once-ui-system/core";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { CodesPanel, OrdersPanel, UsersPanel } from "./AccountPanels";
import { ModerationPanel, QuestionsPanel } from "./ContentPanels";
import { OverviewPanel } from "./OverviewPanel";

const TABS = [
  { value: "overview", label: "概览", panel: OverviewPanel },
  { value: "questions", label: "提问箱", panel: QuestionsPanel },
  { value: "moderation", label: "内容审核", panel: ModerationPanel },
  { value: "users", label: "用户", panel: UsersPanel },
  { value: "orders", label: "订单", panel: OrdersPanel },
  { value: "codes", label: "兑换码", panel: CodesPanel },
] as const;

type Tab = (typeof TABS)[number]["value"];

export function AdminView() {
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>("overview");

  if (!user?.isAdmin) {
    return (
      <Notice
        icon="lock"
        title="没有管理权限"
        description="管理员账号由环境变量 ADMIN_USERNAMES 指定，修改后重新部署即可生效。"
      />
    );
  }

  const Panel = TABS.find((item) => item.value === tab)?.panel ?? OverviewPanel;
  return (
    <Column fillWidth gap="20">
      <PageHeader icon="settings" title="管理后台" />
      <SegmentedControl
        selected={tab}
        onToggle={(value) => setTab(value as Tab)}
        buttons={TABS.map((item) => ({ value: item.value, label: item.label }))}
      />
      <Panel key={tab} />
    </Column>
  );
}

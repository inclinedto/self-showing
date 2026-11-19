import { Column, Icon, Row, Text } from "@once-ui-system/core";
import { CRISIS_LINES } from "@/lib/community";

export function CrisisNotice() {
  return (
    <Column
      gap="8"
      padding="16"
      radius="l"
      background="warning-alpha-weak"
      border="warning-alpha-medium"
      role="note"
    >
      <Row gap="8" vertical="center">
        <Icon name="heart" size="s" onBackground="warning-strong" />
        <Text variant="label-strong-m">你并不孤单，愿意的话可以找人聊聊</Text>
      </Row>
      <Text variant="body-default-s" onBackground="neutral-medium">
        如果你正在经历很难熬的时刻，下面的热线有专业的人在听，免费且保密：
      </Text>
      <Column gap="4">
        {CRISIS_LINES.map((line) => (
          <Text key={line.phone} variant="body-default-s">
            {line.name}：
            <a href={`tel:${line.phone.replace(/-/g, "")}`}>
              <strong>{line.phone}</strong>
            </a>
          </Text>
        ))}
      </Column>
      <Text variant="body-default-xs" onBackground="neutral-weak">
        如果有立即的危险，请拨打 110 或 120。
      </Text>
    </Column>
  );
}

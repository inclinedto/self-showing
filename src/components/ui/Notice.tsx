import { Column, Heading, Icon, Row, Spinner, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";

type Props = {
  icon?: IconName;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
};

/** Centered empty, blocked or coming-soon state. */
export function Notice({ icon = "info", title, description, children }: Props) {
  return (
    <Column
      fillWidth
      horizontal="center"
      align="center"
      gap="12"
      paddingX="24"
      paddingY="48"
      radius="l"
      border="neutral-alpha-weak"
      background="surface"
    >
      <Row padding="12" radius="full" background="neutral-alpha-weak">
        <Icon name={icon} size="l" onBackground="neutral-medium" />
      </Row>
      <Heading as="h2" variant="heading-strong-s">
        {title}
      </Heading>
      {description && (
        <Text variant="body-default-s" onBackground="neutral-weak" wrap="balance" style={{ maxWidth: 420 }}>
          {description}
        </Text>
      )}
      {children && (
        <Row gap="8" paddingTop="8" wrap horizontal="center">
          {children}
        </Row>
      )}
    </Column>
  );
}

export function Loading({ label = "加载中…" }: { label?: string }) {
  return (
    <Row fillWidth horizontal="center" vertical="center" gap="8" paddingY="48">
      <Spinner size="m" />
      <Text variant="body-default-s" onBackground="neutral-weak">
        {label}
      </Text>
    </Row>
  );
}

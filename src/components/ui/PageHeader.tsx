import { Column, Heading, Icon, Row, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";

type Props = {
  icon?: IconName;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHeader({ icon, title, description, actions }: Props) {
  return (
    <Row fillWidth gap="16" vertical="end" horizontal="between" paddingBottom="24" s={{ direction: "column", vertical: "start" }}>
      <Column gap="8" flex={1}>
        <Row gap="12" vertical="center">
          {icon && (
            <Row
              padding="8"
              radius="m"
              background="brand-alpha-weak"
              border="brand-alpha-medium"
              vertical="center"
              horizontal="center"
            >
              <Icon name={icon} size="m" onBackground="brand-strong" />
            </Row>
          )}
          <Heading as="h1" variant="heading-strong-xl">
            {title}
          </Heading>
        </Row>
        {description && (
          <Text variant="body-default-m" onBackground="neutral-weak" wrap="balance">
            {description}
          </Text>
        )}
      </Column>
      {actions && <Row gap="8">{actions}</Row>}
    </Row>
  );
}

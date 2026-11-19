import { Button, Column, Heading, Row, Text } from "@once-ui-system/core";

export default function NotFound() {
  return (
    <Column as="section" fillWidth horizontal="center" align="center" gap="12" paddingY="80">
      <Text variant="display-strong-l" onBackground="neutral-weak">
        404
      </Text>
      <Heading as="h1" variant="heading-strong-l">
        页面不存在
      </Heading>
      <Text onBackground="neutral-weak">你要找的页面可能已经下线，或者地址有误。</Text>
      <Row gap="8" paddingTop="12">
        <Button href="/" variant="primary" size="m">
          回到首页
        </Button>
        <Button href="/tools" variant="secondary" size="m">
          看看工具
        </Button>
      </Row>
    </Column>
  );
}

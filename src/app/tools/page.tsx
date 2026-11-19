import { Card, Column, Grid, Heading, Icon, Row, Tag, Text } from "@once-ui-system/core";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/metadata";
import { FEATURES, FREE_QUOTAS } from "@/resources/plans";
import { tools } from "@/resources/site";

export const metadata = pageMetadata({
  title: "全部工具",
  description: "表格提取、文档问答、AI 小助手、格式转换，常用的文档和图片小事一站搞定。",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <Column fillWidth>
      <PageHeader
        icon="grid"
        title="全部工具"
        description="AI 工具每天有免费额度，格式转换完全免费且在本地运行。"
      />
      <Grid columns="2" s={{ columns: "1" }} gap="16">
        {tools.map((tool) => (
          <Card
            key={tool.slug}
            href={tool.path}
            direction="column"
            gap="16"
            padding="24"
            radius="l"
            border="neutral-alpha-weak"
            background="surface"
            fillWidth
          >
            <Row gap="12" vertical="center" fillWidth>
              <Row padding="8" radius="m" background="brand-alpha-weak">
                <Icon name={tool.icon} size="m" onBackground="brand-strong" />
              </Row>
              <Heading as="h2" variant="heading-strong-m">
                {tool.name}
              </Heading>
              <Row flex={1} />
              <Tag size="s" variant={tool.feature ? "neutral" : "success"}>
                {tool.feature
                  ? `免费 ${FREE_QUOTAS[tool.feature]} ${FEATURES[tool.feature].unit}/天`
                  : "免费不限次"}
              </Tag>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {tool.description}
            </Text>
            <Column gap="8" as="ul" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {tool.highlights.map((highlight) => (
                <Row as="li" key={highlight} gap="8" vertical="center">
                  <Icon name="checkCircle" size="xs" onBackground="brand-medium" />
                  <Text variant="body-default-s">{highlight}</Text>
                </Row>
              ))}
            </Column>
          </Card>
        ))}
      </Grid>
    </Column>
  );
}

import { Button, Card, Column, Grid, Heading, Icon, Row, Tag, Text } from "@once-ui-system/core";
import { QuotaTable } from "@/components/billing/QuotaTable";
import type { IconName } from "@/resources/icons";
import { community, site, tools } from "@/resources/site";
import styles from "./home.module.scss";

const promises: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "shield",
    title: "文件尽量不出浏览器",
    description: "文档在本地解析，格式转换全程离线；AI 工具只发送必要的页面或片段，服务器不保存。",
  },
  {
    icon: "eyeOff",
    title: "社区完全匿名",
    description: "树洞和提问箱只显示随机昵称，不展示用户名，也不能留联系方式。",
  },
  {
    icon: "key",
    title: "注册不要手机号",
    description: "用户名 + 密码即可注册。免费用户每天都有额度，够用再考虑会员。",
  },
];

export default function Home() {
  return (
    <Column fillWidth gap="80" s={{ gap: "56" }}>
      <section className={styles.hero}>
        <Tag size="m" variant="brand" prefixIcon="sparkles">
          AI 工具 · 匿名树洞 · 提问箱
        </Tag>
        <h1 className={styles.title}>
          好用的 AI 小工具，
          <br />
          和一个能说心里话的地方
        </h1>
        <Text variant="body-default-l" onBackground="neutral-weak" className={styles.subtitle}>
          {site.description}
        </Text>
        <Row gap="12" wrap horizontal="center">
          <Button href="/tools" size="l" variant="primary" suffixIcon="arrowRight">
            开始使用
          </Button>
          <Button href="/treehole" size="l" variant="secondary" prefixIcon="tree">
            去树洞看看
          </Button>
        </Row>
      </section>

      <Column as="section" gap="24" aria-labelledby="tools-title">
        <Row horizontal="between" vertical="end" gap="12">
          <Column gap="4">
            <Heading as="h2" id="tools-title" variant="heading-strong-l">
              实用工具
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              常见的文档、表格、图片琐事，交给它们。
            </Text>
          </Column>
          <Button href="/tools" variant="tertiary" size="s" suffixIcon="arrowRight">
            全部工具
          </Button>
        </Row>
        <Grid columns="2" s={{ columns: "1" }} gap="16">
          {tools.map((tool) => (
            <Card
              key={tool.slug}
              href={tool.path}
              direction="column"
              gap="12"
              padding="24"
              radius="l"
              border="neutral-alpha-weak"
              background="surface"
              fillWidth
            >
              <Row horizontal="between" vertical="center" fillWidth>
                <Row padding="8" radius="m" background="brand-alpha-weak">
                  <Icon name={tool.icon} size="m" onBackground="brand-strong" />
                </Row>
                <Tag size="s" variant={tool.feature ? "neutral" : "success"}>
                  {tool.feature ? "每日免费额度" : "免费不限次"}
                </Tag>
              </Row>
              <Heading as="h3" variant="heading-strong-m">
                {tool.name}
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {tool.summary}
              </Text>
            </Card>
          ))}
        </Grid>
      </Column>

      <Column as="section" gap="24" aria-labelledby="community-title">
        <Column gap="4">
          <Heading as="h2" id="community-title" variant="heading-strong-l">
            匿名社区
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            有些话不方便跟熟人说，那就说给陌生人听。
          </Text>
        </Column>
        <Grid columns="2" s={{ columns: "1" }} gap="16">
          {community.map((item) => (
            <Card
              key={item.path}
              href={item.path}
              direction="column"
              gap="12"
              padding="24"
              radius="l"
              border="neutral-alpha-weak"
              background="surface"
              fillWidth
            >
              <Row gap="12" vertical="center">
                <Row padding="8" radius="m" background="accent-alpha-weak">
                  <Icon name={item.icon} size="m" onBackground="accent-strong" />
                </Row>
                <Heading as="h3" variant="heading-strong-m">
                  {item.name}
                </Heading>
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {item.description}
              </Text>
              <Row gap="4" vertical="center">
                <Text variant="label-default-s" onBackground="brand-medium">
                  进入{item.name}
                </Text>
                <Icon name="arrowRight" size="xs" onBackground="brand-medium" />
              </Row>
            </Card>
          ))}
        </Grid>
      </Column>

      <Column
        as="section"
        gap="24"
        padding="32"
        radius="xl"
        border="brand-alpha-medium"
        background="brand-alpha-weak"
        s={{ padding: "20" }}
        aria-labelledby="plans-title"
      >
        <Row horizontal="between" vertical="center" gap="16" s={{ direction: "column", vertical: "start" }}>
          <Column gap="4">
            <Heading as="h2" id="plans-title" variant="heading-strong-l">
              免费用户每天都能用
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              额度每天北京时间零点重置。用得多再开通会员，支持站长继续维护。
            </Text>
          </Column>
          <Button href="/pricing" variant="primary" size="m" prefixIcon="crown">
            查看会员
          </Button>
        </Row>
        <QuotaTable />
      </Column>

      <Grid as="section" columns="3" s={{ columns: "1" }} gap="16" aria-label="我们的承诺">
        {promises.map((item) => (
          <Column key={item.title} gap="8" padding="20" radius="l" border="neutral-alpha-weak">
            <Icon name={item.icon} size="m" onBackground="brand-medium" />
            <Heading as="h3" variant="heading-strong-s">
              {item.title}
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {item.description}
            </Text>
          </Column>
        ))}
      </Grid>
    </Column>
  );
}

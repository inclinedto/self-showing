import { Button, Heading, Icon, Tag, Text } from "@once-ui-system/core";
import classNames from "classnames";
import Link from "next/link";
import { QuotaTable } from "@/components/billing/QuotaTable";
import { LatestPosts } from "@/components/community/LatestPosts";
import type { IconName } from "@/resources/icons";
import { community, site, tools } from "@/resources/site";
import styles from "./home.module.scss";

const promises: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "eyeOff",
    title: "社区完全匿名",
    description: "树洞和提问箱只显示随机昵称，不展示用户名，也不能留联系方式。",
  },
  {
    icon: "shield",
    title: "文件尽量不出浏览器",
    description: "文档在本地解析，格式转换全程离线；AI 工具只发送必要的页面或片段，服务器不保存。",
  },
  {
    icon: "key",
    title: "注册不要手机号",
    description: "用户名 + 密码即可注册。免费用户每天都有额度，够用再考虑会员。",
  },
];

const CARD_TONES = { "/treehole": styles.sea, "/box": styles.sunset } as const;

function SectionTitle({ id, kicker, title, description }: { id: string; kicker: string; title: string; description: string }) {
  return (
    <div className={styles.sectionTitle}>
      <span className={styles.kicker} lang="en">
        {kicker}
      </span>
      <Heading as="h2" id={id} variant="heading-strong-l">
        {title}
      </Heading>
      <Text variant="body-default-s" onBackground="neutral-weak">
        {description}
      </Text>
    </div>
  );
}

export default function Home() {
  const [before, after] = site.quote.text.split("summer’s day");
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.sun} aria-hidden="true" />
        <Tag size="m" variant="accent" prefixIcon="sun">
          匿名树洞 · 提问箱 · 实用工具
        </Tag>
        <blockquote className={styles.quoteBlock} cite="https://en.wikipedia.org/wiki/Sonnet_18">
          <h1 id="hero-title" className={styles.quote} lang="en">
            {before}
            <em className={styles.summer}>summer’s day</em>
            {after}
          </h1>
          <footer className={styles.cite} lang="en">
            — {site.quote.source}
          </footer>
        </blockquote>
        <p className={styles.translation}>“{site.quote.translation}”</p>
        <Text variant="body-default-l" onBackground="neutral-weak" className={styles.subtitle}>
          {site.description}
        </Text>
        <div className={styles.actions}>
          <Button href="/treehole" size="l" variant="primary" prefixIcon="tree">
            去树洞说说
          </Button>
          <Button href="/box" size="l" variant="secondary" prefixIcon="inbox">
            向站长提问
          </Button>
        </div>
        <svg className={styles.waves} viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C 150 10 300 70 450 40 S 750 10 900 40 S 1100 70 1200 40 V80 H0 Z" />
          <path d="M0 56 C 200 30 350 80 600 56 S 1000 30 1200 56 V80 H0 Z" />
        </svg>
      </section>

      <section className={styles.section} aria-labelledby="community-title">
        <SectionTitle
          id="community-title"
          kicker="Whisper to the sea"
          title="匿名社区"
          description="有些话不方便跟熟人说，那就说给陌生人听。"
        />
        <div className={styles.communityGrid}>
          {community.map((item) => (
            <Link key={item.path} href={item.path} className={classNames(styles.postcard, CARD_TONES[item.path])}>
              <span className={styles.postcardIcon}>
                <Icon name={item.icon} size="m" />
              </span>
              <span className={styles.postcardTitle}>{item.name}</span>
              <span className={styles.postcardText}>{item.description}</span>
              <span className={styles.postcardLink}>
                进入{item.name}
                <Icon name="arrowRight" size="xs" />
              </span>
            </Link>
          ))}
        </div>
        <LatestPosts />
      </section>

      <section className={styles.section} aria-labelledby="tools-title">
        <div className={styles.sectionRow}>
          <SectionTitle
            id="tools-title"
            kicker="Little helpers"
            title="实用工具"
            description="文档、表格、图片这些琐事，交给它们。"
          />
          <Button href="/tools" variant="tertiary" size="s" suffixIcon="arrowRight">
            全部工具
          </Button>
        </div>
        <div className={styles.toolGrid}>
          {tools.map((tool) => (
            <Link key={tool.slug} href={tool.path} className={styles.tool}>
              <span className={styles.toolHead}>
                <span className={styles.toolIcon}>
                  <Icon name={tool.icon} size="s" />
                </span>
                <Tag size="s" variant={tool.feature ? "neutral" : "success"}>
                  {tool.feature ? "每日免费额度" : "免费不限次"}
                </Tag>
              </span>
              <span className={styles.toolName}>{tool.name}</span>
              <span className={styles.toolText}>{tool.summary}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.plans} aria-labelledby="plans-title">
        <div className={styles.sectionRow}>
          <SectionTitle
            id="plans-title"
            kicker="Free every day"
            title="免费用户每天都能用"
            description="额度每天北京时间零点重置。用得多再开通会员，支持站长继续维护。"
          />
          <Button href="/pricing" variant="primary" size="m" prefixIcon="crown">
            查看会员
          </Button>
        </div>
        <QuotaTable />
      </section>

      <section className={styles.promises} aria-label="我们的承诺">
        {promises.map((item) => (
          <div key={item.title} className={styles.promise}>
            <Icon name={item.icon} size="m" onBackground="brand-medium" />
            <Heading as="h3" variant="heading-strong-s">
              {item.title}
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {item.description}
            </Text>
          </div>
        ))}
      </section>
    </div>
  );
}

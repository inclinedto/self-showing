import { Heading, Icon, Row, Tag, Text } from "@once-ui-system/core";
import Link from "next/link";
import { KIT_CATEGORIES, type KitTool, kitTools } from "@/resources/kit";
import styles from "./KitShell.module.scss";
import { RecordRecent } from "./recent";

export function KitShell({ tool, children }: { tool: KitTool; children: React.ReactNode }) {
  const category = KIT_CATEGORIES.find((item) => item.id === tool.category);
  const related = kitTools.filter((item) => item.category === tool.category && item.slug !== tool.slug);

  return (
    <div className={styles.shell}>
      <RecordRecent slug={tool.slug} />
      <nav aria-label="当前位置" className={styles.crumbs}>
        <Link href="/tools">全部工具</Link>
        <Icon name="chevronRight" size="xs" />
        <Link href={`/tools?category=${tool.category}`}>{category?.label}</Link>
      </nav>

      <header className={styles.head}>
        <span className={styles.icon}>
          <Icon name={tool.icon} size="m" />
        </span>
        <div className={styles.headText}>
          <Heading as="h1" variant="heading-strong-xl">
            {tool.name}
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            {tool.summary}
          </Text>
        </div>
        <Tag size="m" variant="success" prefixIcon="shield">
          本地运行 · 免费不限次
        </Tag>
      </header>

      {children}

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-tools">
          <Row gap="8" vertical="center">
            <Heading as="h2" id="related-tools" variant="heading-strong-s">
              同类小工具
            </Heading>
          </Row>
          <div className={styles.relatedList}>
            {related.map((item) => (
              <Link key={item.slug} href={`/tools/${item.slug}`} className={styles.relatedItem}>
                <Icon name={item.icon} size="s" />
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

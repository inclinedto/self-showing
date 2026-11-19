"use client";

import { Icon } from "@once-ui-system/core";
import classNames from "classnames";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { readRecent } from "@/components/kit/recent";
import type { IconName } from "@/resources/icons";
import { type KitCategory, kitTools } from "@/resources/kit";
import { FEATURES, FREE_QUOTAS } from "@/resources/plans";
import { tools } from "@/resources/site";
import styles from "./tools.module.scss";

type Group = "ai" | KitCategory;

type Entry = {
  slug: string;
  href: string;
  name: string;
  icon: IconName;
  group: Group;
  summary: string;
  badge: string;
  search: string;
};

const GROUPS: { id: Group; label: string; emoji: string }[] = [
  { id: "ai", label: "AI 与文件", emoji: "🤖" },
  { id: "text", label: "文本", emoji: "📝" },
  { id: "dev", label: "开发", emoji: "💻" },
  { id: "image", label: "图片", emoji: "🖼️" },
  { id: "life", label: "生活", emoji: "🍹" },
];

const ENTRIES: Entry[] = [
  ...tools.map((tool) => ({
    slug: tool.slug,
    href: tool.path,
    name: tool.name,
    icon: tool.icon,
    group: "ai" as const,
    summary: tool.summary,
    badge: tool.feature ? `免费 ${FREE_QUOTAS[tool.feature]} ${FEATURES[tool.feature].unit}/天` : "不限次",
    search: [tool.name, tool.summary, tool.description, ...tool.highlights].join(" ").toLowerCase(),
  })),
  ...kitTools.map((tool) => ({
    slug: tool.slug,
    href: `/tools/${tool.slug}`,
    name: tool.name,
    icon: tool.icon,
    group: tool.category,
    summary: tool.summary,
    badge: "本地",
    search: [tool.name, tool.summary, ...tool.keywords].join(" ").toLowerCase(),
  })),
];

function isGroup(value: string | null): value is Group {
  return GROUPS.some((group) => group.id === value);
}

function ToolCard({ entry }: { entry: Entry }) {
  return (
    <Link href={entry.href} className={styles.card} data-group={entry.group}>
      <span className={styles.cardIcon}>
        <Icon name={entry.icon} size="s" />
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardName}>
          {entry.name}
          <span className={classNames(styles.badge, entry.group === "ai" && styles.badgeAi)}>{entry.badge}</span>
        </span>
        <span className={styles.cardSummary}>{entry.summary}</span>
      </span>
    </Link>
  );
}

export function ToolsDirectory({ group = null }: { group?: Group | null }) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<Entry[]>([]);
  const deferred = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    const slugs = readRecent();
    setRecent(slugs.map((slug) => ENTRIES.find((entry) => entry.slug === slug)).filter((entry) => entry !== undefined));
  }, []);

  const results = useMemo(() => {
    const words = deferred.split(/\s+/).filter(Boolean);
    return ENTRIES.filter(
      (entry) => (!group || entry.group === group) && words.every((word) => entry.search.includes(word)),
    );
  }, [deferred, group]);

  const filtering = deferred !== "" || group !== null;

  return (
    <div className={styles.directory}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <Icon name="search" size="s" />
          <span className="visually-hidden">搜索工具</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`搜索 ${ENTRIES.length} 个工具，比如「二维码」「json」「房贷」`}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        <CategoryChips group={group} />
      </div>

      {!filtering && recent.length > 0 && (
        <section className={styles.recent} aria-labelledby="recent-tools">
          <h2 id="recent-tools" className={styles.recentTitle}>
            最近用过
          </h2>
          <div className={styles.recentList}>
            {recent.map((entry) => (
              <Link key={entry.slug} href={entry.href} className={styles.recentItem}>
                <Icon name={entry.icon} size="xs" />
                {entry.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {filtering ? (
        results.length > 0 ? (
          <div className={styles.grid} aria-live="polite">
            {results.map((entry) => (
              <ToolCard key={entry.slug} entry={entry} />
            ))}
          </div>
        ) : (
          <p className={styles.empty} aria-live="polite">
            没找到相关工具，换个关键词试试 🐚
          </p>
        )
      ) : (
        GROUPS.map((item) => (
          <section key={item.id} className={styles.group} aria-labelledby={`group-${item.id}`}>
            <h2 id={`group-${item.id}`} className={styles.groupTitle}>
              <span aria-hidden="true">{item.emoji}</span>
              {item.label}
            </h2>
            <div className={styles.grid}>
              {ENTRIES.filter((entry) => entry.group === item.id).map((entry) => (
                <ToolCard key={entry.slug} entry={entry} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

const COUNTS = Object.fromEntries(
  GROUPS.map((item) => [item.id, ENTRIES.filter((entry) => entry.group === item.id).length]),
) as Record<Group, number>;

function CategoryChips({ group }: { group: Group | null }) {
  const pathname = usePathname();
  const select = (next: Group | null) => {
    window.history.replaceState(null, "", next ? `${pathname}?category=${next}` : pathname);
  };
  return (
    <fieldset className={styles.chips}>
      <legend className="visually-hidden">工具分类</legend>
      <button type="button" className={styles.chip} aria-pressed={group === null} onClick={() => select(null)}>
        全部 <span>{ENTRIES.length}</span>
      </button>
      {GROUPS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.chip}
          aria-pressed={group === item.id}
          onClick={() => select(item.id)}
        >
          {item.label} <span>{COUNTS[item.id]}</span>
        </button>
      ))}
    </fieldset>
  );
}

/** Reads `?category=` so links such as the kit breadcrumbs open the matching tab. */
export function ToolsDirectoryFromParams() {
  const params = useSearchParams();
  const category = params.get("category");
  return <ToolsDirectory group={isGroup(category) ? category : null} />;
}

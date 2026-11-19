"use client";

import { Icon } from "@once-ui-system/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CRISIS_LINES,
  MOOD_COLORS,
  MOODS,
  type Mood,
  REPORT_HIDE_THRESHOLD,
} from "@/lib/community";
import { beijingDateKey } from "@/lib/format";
import type { TreeholeStats } from "@/lib/types";
import styles from "./memos.module.scss";

export type Filters = {
  sort: string;
  mood: string;
  tag: string;
  q: string;
  date: string;
  mine: boolean;
};

export function filterHref(filters: Filters, changes: Partial<Filters>): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.sort === "hot") params.set("sort", "hot");
  if (next.mood) params.set("mood", next.mood);
  if (next.tag) params.set("tag", next.tag);
  if (next.q) params.set("q", next.q);
  if (next.date) params.set("date", next.date);
  if (next.mine) params.set("mine", "1");
  const query = params.toString();
  return query ? `/treehole?${query}` : "/treehole";
}

const WEEKS = 12;
const DAY_MS = 86_400_000;
const WEEKDAY_LABELS = [
  { id: "mon", label: "一" },
  { id: "tue", label: "" },
  { id: "wed", label: "三" },
  { id: "thu", label: "" },
  { id: "fri", label: "五" },
  { id: "sat", label: "" },
  { id: "sun", label: "" },
];

function parseKey(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function keyOf(utc: number): string {
  return new Date(utc).toISOString().slice(0, 10);
}

/** 12 columns of weeks (Monday first) ending with the current Beijing week. */
function Heatmap({
  days,
  selected,
  hrefFor,
}: {
  days: TreeholeStats["days"];
  selected: string;
  hrefFor: (date: string) => string;
}) {
  // The calendar depends on "today", so it renders after mount to avoid a server/client mismatch around midnight.
  const [today, setToday] = useState<string>();
  useEffect(() => setToday(beijingDateKey(Date.now())), []);
  if (!today) return <div className={styles.heatmap} style={{ minHeight: 150 }} />;

  const counts = new Map(days.map((day) => [day.date, day.count]));
  const max = Math.max(4, ...days.map((day) => day.count));
  const todayUtc = parseKey(today);
  const weekday = (new Date(todayUtc).getUTCDay() + 6) % 7;
  const start = todayUtc - (weekday + (WEEKS - 1) * 7) * DAY_MS;

  const cells: React.ReactNode[] = [<span key="corner" />];
  for (const weekdayLabel of WEEKDAY_LABELS) {
    cells.push(
      <span key={weekdayLabel.id} className={styles.weekdayLabel}>
        {weekdayLabel.label}
      </span>,
    );
  }
  const monthOf = (week: number) => new Date(start + week * 7 * DAY_MS).getUTCMonth();
  const labelled = new Set<number>();
  for (let week = 1; week < WEEKS; week++)
    if (monthOf(week) !== monthOf(week - 1)) labelled.add(week);
  // The first column only gets a label when the next month label is far enough away not to collide.
  const firstChange = Math.min(...labelled, WEEKS);
  if (firstChange >= 3) labelled.add(0);
  for (let week = 0; week < WEEKS; week++) {
    cells.push(
      <span key={`m${week}`} className={styles.monthLabel}>
        {labelled.has(week) ? `${monthOf(week) + 1}月` : ""}
      </span>,
    );
    for (let day = 0; day < 7; day++) {
      const utc = start + (week * 7 + day) * DAY_MS;
      const key = keyOf(utc);
      if (utc > todayUtc) {
        cells.push(<span key={key} className={`${styles.cell} ${styles.future}`} />);
        continue;
      }
      const count = counts.get(key) ?? 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
      const date = new Date(utc);
      const label = `${date.getUTCMonth() + 1}月${date.getUTCDate()}日：${count} 条`;
      cells.push(
        <Link
          key={key}
          href={hrefFor(selected === key ? "" : key)}
          className={styles.cell}
          data-level={level}
          data-today={key === today}
          aria-current={selected === key ? "date" : undefined}
          aria-label={label}
          title={label}
          scroll={false}
        />,
      );
    }
  }
  return (
    <>
      <div className={styles.heatmap}>{cells}</div>
      <div className={styles.legend} aria-hidden="true">
        少
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={styles.cell} data-level={level} />
        ))}
        多
      </div>
    </>
  );
}

function SearchBox({ filters, onSearch }: { filters: Filters; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(filters.q);
  useEffect(() => setValue(filters.q), [filters.q]);
  return (
    <search>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(value.trim());
        }}
      >
        <span className={styles.searchIcon}>
          <Icon name="search" size="xs" />
        </span>
        <label htmlFor="treehole-search" className="visually-hidden">
          搜索树洞
        </label>
        <input
          id="treehole-search"
          type="search"
          enterKeyHint="search"
          placeholder="搜索树洞，回车确认"
          maxLength={40}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {value && (
          <button
            type="button"
            className={styles.searchClear}
            aria-label="清空搜索"
            onClick={() => {
              setValue("");
              if (filters.q) onSearch("");
            }}
          >
            <Icon name="close" size="xs" />
          </button>
        )}
      </form>
    </search>
  );
}

const MOOD_DOT: Record<string, string> = {
  success: "var(--success-solid-medium)",
  info: "var(--info-solid-medium)",
  warning: "var(--warning-solid-medium)",
  danger: "var(--danger-solid-medium)",
  neutral: "var(--neutral-solid-medium)",
  brand: "var(--brand-solid-medium)",
  accent: "var(--accent-solid-medium)",
};

export function TreeholeSidebar({
  filters,
  stats,
  onSearch,
}: {
  filters: Filters;
  stats: TreeholeStats | null;
  onSearch: (q: string) => void;
}) {
  const moodCounts = new Map(stats?.moods.map((item) => [item.mood, item.count]));
  return (
    <aside className={styles.side} aria-label="筛选与统计">
      <SearchBox filters={filters} onSearch={onSearch} />

      <section className={`${styles.box} ${styles.wideOnly}`} aria-labelledby="heatmap-title">
        <div className={styles.numbers}>
          <div className={styles.number}>
            <strong>{stats?.total ?? "–"}</strong>
            <span>{filters.mine ? "我的树洞" : "条树洞"}</span>
          </div>
          <div className={styles.number}>
            <strong>{stats?.today ?? "–"}</strong>
            <span>今天</span>
          </div>
          <div className={styles.number}>
            <strong>{stats?.tags.length ?? "–"}</strong>
            <span>个话题</span>
          </div>
        </div>
        <h2 id="heatmap-title" className={styles.boxTitle}>
          最近 12 周<span className={styles.boxHint}>点一天只看那天</span>
        </h2>
        <Heatmap
          days={stats?.days ?? []}
          selected={filters.date}
          hrefFor={(date) => filterHref(filters, { date })}
        />
      </section>

      {stats && stats.tags.length > 0 && (
        <section className={styles.box} aria-labelledby="tags-title">
          <h2 id="tags-title" className={`${styles.boxTitle} ${styles.wideOnly}`}>
            热门标签
          </h2>
          <div className={styles.tagList}>
            {stats.tags.map((item) => (
              <Link
                key={item.tag}
                href={filterHref(filters, { tag: filters.tag === item.tag ? "" : item.tag })}
                className={styles.tagChip}
                aria-current={filters.tag === item.tag}
                scroll={false}
              >
                #{item.tag}
                <small>{item.count}</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`${styles.box} ${styles.wideOnly}`} aria-labelledby="moods-title">
        <h2 id="moods-title" className={styles.boxTitle}>
          心情
        </h2>
        <div className={styles.moodList}>
          {MOODS.map((mood) => (
            <Link
              key={mood}
              href={filterHref(filters, { mood: filters.mood === mood ? "" : mood })}
              className={styles.moodRow}
              aria-current={filters.mood === mood}
              scroll={false}
            >
              <span
                className={styles.dot}
                style={{ background: MOOD_DOT[MOOD_COLORS[mood as Mood]] }}
              />
              {mood}
              <small>{moodCounts.get(mood) ?? 0}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.box} ${styles.wideOnly}`} aria-labelledby="rules-title">
        <h2 id="rules-title" className={styles.boxTitle}>
          树洞公约
        </h2>
        <ul className={styles.rules}>
          <li>不留联系方式，不打广告</li>
          <li>不人身攻击，不泄露他人隐私</li>
          <li>被 {REPORT_HIDE_THRESHOLD} 个人举报会先隐藏，等站长审核</li>
          <li>如果你正处在危险中，请拨打 {CRISIS_LINES[0].phone}</li>
        </ul>
      </section>
    </aside>
  );
}

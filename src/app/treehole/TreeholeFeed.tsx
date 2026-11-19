"use client";

import { Button, Column, Feedback, Row } from "@once-ui-system/core";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { CrisisNotice } from "@/components/community/CrisisNotice";
import styles from "@/components/community/memos.module.scss";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { ReportDialog } from "@/components/community/ReportDialog";
import { type Filters, filterHref, TreeholeSidebar } from "@/components/community/TreeholeSidebar";
import { ComingSoon, loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { Loading, Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { isValidTag, MOODS } from "@/lib/community";
import { beijingDateKey, dayLabel } from "@/lib/format";
import type { PostItem, TreeholeStats } from "@/lib/types";

type Page = { pinned: PostItem[]; posts: PostItem[]; next: string | null };

function readFilters(params: URLSearchParams): Filters {
  const mood = params.get("mood") ?? "";
  const tag = (params.get("tag") ?? "").toLowerCase();
  const date = params.get("date") ?? "";
  return {
    sort: params.get("sort") === "hot" ? "hot" : "new",
    mood: (MOODS as readonly string[]).includes(mood) ? mood : "",
    tag: isValidTag(tag) ? tag : "",
    q: (params.get("q") ?? "").slice(0, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    mine: params.get("mine") === "1",
  };
}

function feedQuery(filters: Filters, cursor?: string) {
  const params = new URLSearchParams({ sort: filters.sort });
  if (filters.mood) params.set("mood", filters.mood);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.q) params.set("q", filters.q);
  if (filters.date) params.set("date", filters.date);
  if (filters.mine) params.set("mine", "1");
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

function shortDate(key: string) {
  const [, month, day] = key.split("-").map(Number);
  return `${month}月${day}日`;
}

export function TreeholeFeed() {
  const { status, user, loading: sessionLoading } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const filterKey = feedQuery(filters);
  const mine = filters.mine && Boolean(user);

  const [pinned, setPinned] = useState<PostItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [stats, setStats] = useState<TreeholeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [crisis, setCrisis] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post"; id: number } | null>(null);
  const [feedToken, setFeedToken] = useState(0);
  const [statsToken, setStatsToken] = useState(0);
  const dbReady = status?.db !== false;

  const go = useCallback(
    // Native history updates sync with useSearchParams without a server round-trip, so filters apply instantly.
    (changes: Partial<Filters>) => window.history.replaceState(null, "", filterHref(filters, changes)),
    [filters],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: filterKey captures the filters; reload when the viewer changes so liked/mine flags are correct.
  useEffect(() => {
    if (sessionLoading || !dbReady) return;
    if (filters.mine && !user) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    api<Page>(`/api/treehole?${filterKey}`)
      .then((page) => {
        if (cancelled) return;
        setPinned(page.pinned);
        setPosts(page.posts);
        setNext(page.next);
      })
      .catch((loadError) => !cancelled && setError(errorMessage(loadError)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filterKey, sessionLoading, dbReady, user?.id, feedToken]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stats only depend on the "mine" scope and explicit reloads.
  useEffect(() => {
    if (sessionLoading || !dbReady) return;
    if (filters.mine && !user) return;
    let cancelled = false;
    api<TreeholeStats>(`/api/treehole/stats${mine ? "?mine=1" : ""}`)
      .then((data) => !cancelled && setStats(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mine, sessionLoading, dbReady, user?.id, statsToken]);

  const loadMore = async () => {
    if (!next) return;
    setLoadingMore(true);
    try {
      const page = await api<Page>(`/api/treehole?${feedQuery(filters, next)}`);
      setPosts((previous) => {
        const seen = new Set(previous.map((post) => post.id));
        return [...previous, ...page.posts.filter((post) => !seen.has(post.id))];
      });
      setNext(page.next);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (updated: PostItem) => {
    const apply = (list: PostItem[]) => list.map((item) => (item.id === updated.id ? updated : item));
    setPosts(apply);
    setPinned(apply);
  };

  const removed = (id: number) => {
    setPosts((previous) => previous.filter((item) => item.id !== id));
    setPinned((previous) => previous.filter((item) => item.id !== id));
    setStatsToken((value) => value + 1);
  };

  const header = (
    <PageHeader icon="tree" title="树洞" description="这里没有人知道你是谁。说出来，也许会好受一点 🌊" />
  );

  if (sessionLoading) return <Loading />;
  if (!dbReady) {
    return (
      <Column fillWidth>
        {header}
        <ComingSoon />
      </Column>
    );
  }

  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.tag) chips.push({ label: `#${filters.tag}`, clear: { tag: "" } });
  if (filters.mood) chips.push({ label: `心情：${filters.mood}`, clear: { mood: "" } });
  if (filters.date) chips.push({ label: shortDate(filters.date), clear: { date: "" } });
  if (filters.q) chips.push({ label: `搜索：${filters.q}`, clear: { q: "" } });
  if (filters.mine) chips.push({ label: "只看我的", clear: { mine: false } });
  const grouped = filters.sort === "new";

  let lastDay = "";
  const timeline = posts.map((post) => {
    const day = beijingDateKey(post.createdAt);
    const separator = grouped && day !== lastDay ? <h3 className={styles.day}>{dayLabel(day)}</h3> : null;
    lastDay = day;
    return (
      <Fragment key={post.id}>
        {separator}
        <PostCard
          post={post}
          onChange={update}
          onDeleted={() => removed(post.id)}
          onReport={setReportTarget}
          onPinChange={() => setFeedToken((value) => value + 1)}
        />
      </Fragment>
    );
  });

  return (
    <Column fillWidth>
      {header}
      <div className={styles.layout}>
        <TreeholeSidebar filters={filters} stats={stats} onSearch={(q) => go({ q })} />

        <div className={styles.main}>
          <PostComposer
            suggestedTags={stats?.tags.map((item) => item.tag) ?? []}
            onCreated={(post, isCrisis) => {
              setCrisis(isCrisis);
              const fits =
                filters.sort === "new" &&
                (!filters.mood || filters.mood === post.mood) &&
                (!filters.tag || post.tags.includes(filters.tag)) &&
                !filters.q &&
                !filters.date;
              if (fits) setPosts((previous) => [post, ...previous]);
              setStatsToken((value) => value + 1);
            }}
          />
          {crisis && <CrisisNotice />}

          <div className={styles.filterBar}>
            <div className={styles.activeFilters}>
              {chips.length === 0 ? (
                <span>全部树洞</span>
              ) : (
                chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={styles.filterChip}
                    onClick={() => go(chip.clear)}
                    aria-label={`取消筛选 ${chip.label}`}
                  >
                    {chip.label} ✕
                  </button>
                ))
              )}
            </div>
            <Row gap="12" vertical="center">
              {user && (
                <label className={styles.mineToggle}>
                  <input type="checkbox" checked={filters.mine} onChange={(event) => go({ mine: event.target.checked })} />
                  只看我的
                </label>
              )}
              <div className={styles.sortTabs}>
                {[
                  { value: "new", label: "最新" },
                  { value: "hot", label: "最热" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={styles.sortTab}
                    aria-pressed={filters.sort === item.value}
                    onClick={() => go({ sort: item.value })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Row>
          </div>

          {error && <Feedback variant="danger" description={error} />}

          {filters.mine && !user ? (
            <Notice icon="lock" title="登录后才能看自己的树洞">
              <Button href={loginHref(`${pathname}?mine=1`)} variant="primary" size="s">
                去登录
              </Button>
            </Notice>
          ) : loading ? (
            <Loading />
          ) : posts.length === 0 && pinned.length === 0 ? (
            <Notice
              icon="tree"
              title={chips.length > 0 ? "没有找到相关的树洞" : "树洞还空着"}
              description={chips.length > 0 ? "换个关键词或标签试试。" : "来做第一个说话的人吧。"}
            >
              {chips.length > 0 && (
                <Button variant="secondary" size="s" onClick={() => window.history.replaceState(null, "", "/treehole")}>
                  清除筛选
                </Button>
              )}
            </Notice>
          ) : (
            <>
              {pinned.map((post) => (
                <PostCard
                  key={`pin-${post.id}`}
                  post={post}
                  onChange={update}
                  onDeleted={() => removed(post.id)}
                  onReport={setReportTarget}
                  onPinChange={() => setFeedToken((value) => value + 1)}
                />
              ))}
              {timeline}
              {next && (
                <Row horizontal="center" paddingTop="8">
                  <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                    加载更多
                  </Button>
                </Row>
              )}
            </>
          )}
        </div>
      </div>

      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </Column>
  );
}

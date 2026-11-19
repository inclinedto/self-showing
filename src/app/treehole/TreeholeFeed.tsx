"use client";

import { Button, Column, Feedback, Row, SegmentedControl } from "@once-ui-system/core";
import { useCallback, useEffect, useState } from "react";
import { CrisisNotice } from "@/components/community/CrisisNotice";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { ReportDialog } from "@/components/community/ReportDialog";
import styles from "@/components/community/community.module.scss";
import { ComingSoon } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { Loading, Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { MOODS } from "@/lib/community";
import type { PostItem } from "@/lib/types";

type Sort = "new" | "hot";
type Page = { posts: PostItem[]; next: string | null };

export function TreeholeFeed() {
  const { status, user, loading: sessionLoading } = useSession();
  const [sort, setSort] = useState<Sort>("new");
  const [mood, setMood] = useState("");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [crisis, setCrisis] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post"; id: number } | null>(null);
  const dbReady = status?.db !== false;

  const load = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ sort });
      if (mood) params.set("mood", mood);
      if (cursor) params.set("cursor", cursor);
      return api<Page>(`/api/treehole?${params}`);
    },
    [sort, mood],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when the viewer changes so liked/mine flags are correct.
  useEffect(() => {
    if (sessionLoading || !dbReady) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    load()
      .then((page) => {
        if (cancelled) return;
        setPosts(page.posts);
        setNext(page.next);
      })
      .catch((loadError) => !cancelled && setError(errorMessage(loadError)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load, sessionLoading, dbReady, user?.id]);

  const loadMore = async () => {
    if (!next) return;
    setLoadingMore(true);
    try {
      const page = await load(next);
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

  const header = (
    <PageHeader
      icon="tree"
      title="树洞"
      description="这里没有人知道你是谁。说出来，也许会好受一点。"
    />
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

  return (
    <Column fillWidth gap="20" maxWidth={44} style={{ margin: "0 auto" }}>
      {header}
      <PostComposer
        onCreated={(post, isCrisis) => {
          setCrisis(isCrisis);
          if (sort === "new" && (!mood || mood === post.mood)) setPosts((previous) => [post, ...previous]);
        }}
      />
      {crisis && <CrisisNotice />}

      <Column gap="12">
        <SegmentedControl
          selected={sort}
          onToggle={(value) => setSort(value as Sort)}
          buttons={[
            { value: "new", label: "最新", prefixIcon: "refresh" },
            { value: "hot", label: "最热", prefixIcon: "bolt" },
          ]}
        />
        <fieldset className={styles.pills}>
          <legend className="visually-hidden">按心情筛选</legend>
          <button type="button" className={styles.pill} aria-pressed={mood === ""} onClick={() => setMood("")}>
            全部
          </button>
          {MOODS.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.pill}
              aria-pressed={mood === item}
              onClick={() => setMood(mood === item ? "" : item)}
            >
              {item}
            </button>
          ))}
        </fieldset>
      </Column>

      {error && <Feedback variant="danger" description={error} />}

      {loading ? (
        <Loading />
      ) : posts.length === 0 ? (
        <Notice
          icon="tree"
          title={mood ? `还没有「${mood}」的树洞` : "树洞还空着"}
          description="来做第一个说话的人吧。"
        />
      ) : (
        <Column gap="12">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChange={(updated) =>
                setPosts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
              }
              onDeleted={() => setPosts((previous) => previous.filter((item) => item.id !== post.id))}
              onReport={setReportTarget}
            />
          ))}
          {next && (
            <Row horizontal="center" paddingTop="8">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                加载更多
              </Button>
            </Row>
          )}
        </Column>
      )}

      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </Column>
  );
}

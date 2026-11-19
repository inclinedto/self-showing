"use client";

import { Button, Column, Feedback, Heading, Icon, Row, Text, Textarea, useToast } from "@once-ui-system/core";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CrisisNotice } from "@/components/community/CrisisNotice";
import { MemoAvatar, PostCard } from "@/components/community/PostCard";
import { ReportDialog } from "@/components/community/ReportDialog";
import styles from "@/components/community/community.module.scss";
import { QuotaHint } from "@/components/session/QuotaHint";
import { ComingSoon, loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { Loading, Notice } from "@/components/ui/Notice";
import { api, ApiError, errorMessage } from "@/lib/api";
import { LIMITS } from "@/lib/community";
import { relativeTime } from "@/lib/format";
import type { CommentItem, PostItem } from "@/lib/types";

type Target = { type: "post" | "comment"; id: number };

export function PostDetail({ id }: { id: number }) {
  const { user, status, loading: sessionLoading, refresh } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [post, setPost] = useState<PostItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadError, setLoadError] = useState<{ message: string; missing: boolean }>();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const [crisis, setCrisis] = useState(false);
  const [reportTarget, setReportTarget] = useState<Target | null>(null);
  const dbReady = status?.db !== false;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when the viewer changes so liked/mine flags are correct.
  useEffect(() => {
    if (sessionLoading || !dbReady) return;
    api<{ post: PostItem; comments: CommentItem[] }>(`/api/treehole/${id}`)
      .then((data) => {
        setPost(data.post);
        setComments(data.comments);
      })
      .catch((error) =>
        setLoadError({
          message: errorMessage(error),
          missing: error instanceof ApiError && error.status === 404,
        }),
      );
  }, [id, sessionLoading, dbReady, user?.id]);

  if (sessionLoading) return <Loading />;
  if (!dbReady) return <ComingSoon />;
  if (loadError) {
    return (
      <Notice icon={loadError.missing ? "eyeOff" : "warning"} title={loadError.missing ? "找不到这条树洞" : "加载失败"} description={loadError.message}>
        <Button href="/treehole" variant="secondary">
          回到树洞
        </Button>
      </Notice>
    );
  }
  if (!post) return <Loading />;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setSendError(undefined);
    try {
      const data = await api<{ comment: CommentItem; crisis: boolean }>(`/api/treehole/${id}/comments`, {
        body: { content: draft },
      });
      setComments((previous) => [...previous, data.comment]);
      setPost((previous) => previous && { ...previous, commentCount: previous.commentCount + 1 });
      setCrisis(data.crisis);
      setDraft("");
      refresh();
    } catch (error) {
      setSendError(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (comment: CommentItem) => {
    if (!window.confirm("确定删除这条评论吗？")) return;
    try {
      await api(`/api/treehole/comments/${comment.id}`, { method: "DELETE" });
      setComments((previous) => previous.filter((item) => item.id !== comment.id));
      setPost((previous) => previous && { ...previous, commentCount: Math.max(0, previous.commentCount - 1) });
    } catch (error) {
      addToast({ variant: "danger", message: errorMessage(error) });
    }
  };

  return (
    <Column fillWidth gap="20" maxWidth={44} style={{ margin: "0 auto" }}>
      <Row>
        <Button href="/treehole" variant="tertiary" size="s" prefixIcon="back">
          返回树洞
        </Button>
      </Row>

      <PostCard
        post={post}
        detail
        onChange={setPost}
        onDeleted={() => router.push("/treehole")}
        onReport={setReportTarget}
      />

      <Column gap="12" id="comments">
        <Heading as="h2" variant="heading-strong-s">
          评论 {comments.length > 0 && `· ${comments.length}`}
        </Heading>

        {comments.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            还没有人评论，说句温暖的话吧。
          </Text>
        ) : (
          <div className={styles.card} style={{ gap: 0, paddingTop: 4, paddingBottom: 4 }}>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <div className={styles.meta}>
                  <MemoAvatar alias={comment.alias} />
                  <span className={styles.alias}>{comment.alias}</span>
                  {comment.isAuthor && <span className={styles.authorBadge}>洞主</span>}
                  {comment.mine && !comment.isAuthor && <span>（我）</span>}
                  <time dateTime={comment.createdAt}>{relativeTime(comment.createdAt)}</time>
                  <span className={styles.spacer} />
                  {comment.mine || user?.isAdmin ? (
                    <button type="button" className={styles.action} onClick={() => removeComment(comment)}>
                      <Icon name="trash" size="xs" />
                      删除
                    </button>
                  ) : (
                    user && (
                      <button
                        type="button"
                        className={styles.action}
                        onClick={() => setReportTarget({ type: "comment", id: comment.id })}
                      >
                        <Icon name="flag" size="xs" />
                        举报
                      </button>
                    )
                  )}
                </div>
                <p className={styles.content} style={{ fontSize: "var(--font-size-body-s)" }}>
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {crisis && <CrisisNotice />}

        {post.status !== "visible" ? null : user ? (
          <form onSubmit={send} className={styles.card}>
            <Textarea
              id="comment-content"
              label="写下你的回应"
              lines={3}
              resize="vertical"
              value={draft}
              maxLength={LIMITS.comment.max}
              onChange={(event) => setDraft(event.target.value)}
            />
            {sendError && <Feedback variant="danger" description={sendError} />}
            <Row horizontal="between" vertical="center" gap="12" s={{ direction: "column", vertical: "start" }}>
              <QuotaHint feature="comment" />
              <Button type="submit" size="m" loading={sending} disabled={!draft.trim()} prefixIcon="send">
                匿名评论
              </Button>
            </Row>
          </form>
        ) : (
          <Row className={styles.card} horizontal="between" vertical="center" gap="12">
            <Text variant="body-default-s" onBackground="neutral-medium">
              登录后可以匿名评论
            </Text>
            <Button href={loginHref(pathname)} size="s">
              登录
            </Button>
          </Row>
        )}
      </Column>

      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </Column>
  );
}

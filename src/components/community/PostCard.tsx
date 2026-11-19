"use client";

import { Icon, Tag, useToast } from "@once-ui-system/core";
import classNames from "classnames";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { aliasEmoji } from "@/lib/alias";
import { api, errorMessage } from "@/lib/api";
import { type Mood, MOOD_COLORS, splitTags } from "@/lib/community";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { PostItem } from "@/lib/types";
import type { IconName } from "@/resources/icons";
import styles from "./memos.module.scss";

type Props = {
  post: PostItem;
  detail?: boolean;
  onChange: (post: PostItem) => void;
  onDeleted: () => void;
  onReport: (target: { type: "post"; id: number }) => void;
  onPinChange?: () => void;
};

const AVATAR_TONES = ["brand", "accent", "success", "warning", "info"] as const;

function avatarTone(alias: string) {
  let hash = 0;
  for (const char of alias) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

const LONG_POST = 240;

/** Post text with `#tags` turned into filter links. */
export function MemoText({ content, className }: { content: string; className?: string }) {
  return (
    <p className={classNames(styles.memoBody, className)}>
      {splitTags(content).map((segment, index) =>
        segment.tag ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are derived from immutable text.
          <Link key={index} href={`/treehole?tag=${encodeURIComponent(segment.tag)}`} className={styles.tag}>
            {segment.text}
          </Link>
        ) : (
          segment.text
        ),
      )}
    </p>
  );
}

export function MemoAvatar({ alias }: { alias: string }) {
  return (
    <span className={styles.avatar} style={{ background: `var(--${avatarTone(alias)}-alpha-weak)` }} aria-hidden="true">
      {aliasEmoji(alias)}
    </span>
  );
}

type MenuAction = { label: string; icon: IconName; danger?: boolean; run: () => void };

function MemoMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !wrap.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (actions.length === 0) return null;
  return (
    <div className={styles.menuWrap} ref={wrap}>
      <button
        type="button"
        className={styles.action}
        aria-label="更多操作"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="more" size="s" />
      </button>
      {open && (
        <div className={styles.menu}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={classNames(styles.menuItem, action.danger && styles.danger)}
              onClick={() => {
                setOpen(false);
                action.run();
              }}
            >
              <Icon name={action.icon} size="xs" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, detail = false, onChange, onDeleted, onReport, onPinChange }: Props) {
  const { user } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [liking, setLiking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const href = `/treehole/${post.id}`;
  const visible = post.status === "visible";
  const long = !detail && (post.content.length > LONG_POST || post.content.split("\n").length > 8);

  const toggleLike = async () => {
    if (!user) return router.push(loginHref(pathname));
    if (liking) return;
    setLiking(true);
    const optimistic = { ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) };
    onChange(optimistic);
    try {
      const result = await api<{ liked: boolean; likeCount: number }>(`/api/treehole/${post.id}/like`, { body: {} });
      onChange({ ...post, ...result });
    } catch (error) {
      onChange(post);
      addToast({ variant: "danger", message: errorMessage(error) });
    } finally {
      setLiking(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("确定删除这条树洞吗？删除后无法恢复。")) return;
    try {
      await api(`/api/treehole/${post.id}`, { method: "DELETE" });
      addToast({ variant: "success", message: "已删除" });
      onDeleted();
    } catch (error) {
      addToast({ variant: "danger", message: errorMessage(error) });
    }
  };

  const togglePin = async () => {
    try {
      const result = await api<{ pinned: boolean }>(`/api/treehole/${post.id}/pin`, { body: { pinned: !post.pinned } });
      onChange({ ...post, pinned: result.pinned });
      addToast({ variant: "success", message: result.pinned ? "已置顶" : "已取消置顶" });
      onPinChange?.();
    } catch (error) {
      addToast({ variant: "danger", message: errorMessage(error) });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      addToast({ variant: "success", message: "链接已复制" });
    } catch {
      addToast({ variant: "danger", message: "复制失败" });
    }
  };

  const actions: MenuAction[] = [];
  if (visible) actions.push({ label: "复制链接", icon: "clipboard", run: copyLink });
  if (user?.isAdmin && visible) {
    actions.push({ label: post.pinned ? "取消置顶" : "置顶", icon: post.pinned ? "unpin" : "pin", run: togglePin });
  }
  if (post.mine || user?.isAdmin) actions.push({ label: "删除", icon: "trash", danger: true, run: remove });
  else if (user && visible) actions.push({ label: "举报", icon: "flag", run: () => onReport({ type: "post", id: post.id }) });

  return (
    <article className={classNames(styles.memo, post.pinned && styles.pinnedMemo)} aria-label={`${post.alias} 的树洞`}>
      <div className={styles.memoHead}>
        <MemoAvatar alias={post.alias} />
        <div className={styles.who}>
          <span className={styles.alias}>{post.alias}</span>
          <span className={styles.meta}>
            {detail ? (
              <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
            ) : (
              <Link href={href} className={styles.bodyLink} title={formatDateTime(post.createdAt)}>
                <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
              </Link>
            )}
            {post.mine && <span>· 我发的</span>}
          </span>
        </div>
        <div className={styles.badges}>
          {post.pinned && (
            <Tag size="s" variant="accent" prefixIcon="pin">
              置顶
            </Tag>
          )}
          {post.mood && (
            <Tag size="s" variant={MOOD_COLORS[post.mood as Mood] ?? "neutral"}>
              {post.mood}
            </Tag>
          )}
          {post.status === "hidden" && (
            <Tag size="s" variant="warning">
              已隐藏，等待审核
            </Tag>
          )}
        </div>
        <MemoMenu actions={actions} />
      </div>

      <MemoText content={post.content} className={long && !expanded ? styles.clamped : undefined} />
      {long && (
        <button type="button" className={styles.expand} onClick={() => setExpanded((value) => !value)}>
          {expanded ? "收起" : "展开全文"}
        </button>
      )}

      <div className={styles.memoFoot}>
        <button
          type="button"
          className={classNames(styles.action, post.liked && styles.hugged)}
          aria-pressed={post.liked}
          aria-label={post.liked ? "取消抱抱" : "抱抱 TA"}
          onClick={toggleLike}
          disabled={!visible}
        >
          <Icon name={post.liked ? "heartFilled" : "heart"} size="s" />
          {post.likeCount > 0 ? post.likeCount : "抱抱"}
        </button>
        {detail ? (
          <span className={styles.action}>
            <Icon name="comment" size="s" />
            {post.commentCount}
          </span>
        ) : (
          <Link href={`${href}#comments`} className={styles.action} aria-label="查看评论">
            <Icon name="comment" size="s" />
            {post.commentCount > 0 ? post.commentCount : "评论"}
          </Link>
        )}
      </div>
    </article>
  );
}

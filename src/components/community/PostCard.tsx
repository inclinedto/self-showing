"use client";

import classNames from "classnames";
import { Icon, Tag, useToast } from "@once-ui-system/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { api, errorMessage } from "@/lib/api";
import { type Mood, MOOD_COLORS } from "@/lib/community";
import { relativeTime } from "@/lib/format";
import type { PostItem } from "@/lib/types";
import styles from "./community.module.scss";

type Props = {
  post: PostItem;
  detail?: boolean;
  onChange: (post: PostItem) => void;
  onDeleted: () => void;
  onReport: (target: { type: "post"; id: number }) => void;
};

export function PostCard({ post, detail = false, onChange, onDeleted, onReport }: Props) {
  const { user } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [liking, setLiking] = useState(false);
  const href = `/treehole/${post.id}`;

  const toggleLike = async () => {
    if (!user) return router.push(loginHref(pathname));
    if (liking) return;
    setLiking(true);
    const optimistic = { ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) };
    onChange(optimistic);
    try {
      const result = await api<{ liked: boolean; likeCount: number }>(`/api/treehole/${post.id}/like`, {
        body: {},
      });
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

  const content = (
    <p className={classNames(styles.content, !detail && "line-clamp-6")}>{post.content}</p>
  );

  return (
    <article className={styles.card} aria-label={`${post.alias} 的树洞`}>
      <div className={styles.meta}>
        <span className={styles.alias}>{post.alias}</span>
        {post.mood && (
          <Tag size="s" variant={MOOD_COLORS[post.mood as Mood] ?? "neutral"}>
            {post.mood}
          </Tag>
        )}
        <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
        {post.mine && (
          <Tag size="s" variant="neutral">
            我发的
          </Tag>
        )}
        {post.status === "hidden" && (
          <Tag size="s" variant="warning">
            已隐藏，等待审核
          </Tag>
        )}
      </div>

      {detail ? (
        content
      ) : (
        <Link href={href} className={styles.contentLink}>
          {content}
        </Link>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={classNames(styles.action, post.liked && styles.liked)}
          aria-pressed={post.liked}
          aria-label={post.liked ? "取消抱抱" : "抱抱 TA"}
          onClick={toggleLike}
          disabled={post.status !== "visible"}
        >
          <Icon name={post.liked ? "heartFilled" : "heart"} size="s" />
          {post.likeCount > 0 ? post.likeCount : "抱抱"}
        </button>
        {detail ? (
          <span className={styles.action} aria-label="评论数">
            <Icon name="comment" size="s" />
            {post.commentCount}
          </span>
        ) : (
          <Link href={`${href}#comments`} className={styles.action} aria-label="查看评论">
            <Icon name="comment" size="s" />
            {post.commentCount > 0 ? post.commentCount : "评论"}
          </Link>
        )}
        <span className={styles.spacer} />
        {post.mine || user?.isAdmin ? (
          <button type="button" className={styles.action} onClick={remove} aria-label="删除这条树洞">
            <Icon name="trash" size="s" />
            删除
          </button>
        ) : (
          user &&
          post.status === "visible" && (
            <button
              type="button"
              className={styles.action}
              onClick={() => onReport({ type: "post", id: post.id })}
              aria-label="举报这条树洞"
            >
              <Icon name="flag" size="s" />
              举报
            </button>
          )
        )}
      </div>
    </article>
  );
}

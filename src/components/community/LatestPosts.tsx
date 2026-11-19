"use client";

import { Tag } from "@once-ui-system/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { type Mood, MOOD_COLORS } from "@/lib/community";
import { relativeTime } from "@/lib/format";
import { mentionsCrisis } from "@/lib/moderation";
import type { PostItem } from "@/lib/types";
import styles from "./LatestPosts.module.scss";

const SHOWN = 3;

/** A peek at the newest posts on the home page; renders nothing until the community is live. */
export function LatestPosts() {
  const [posts, setPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    let alive = true;
    api<{ posts: PostItem[] }>("/api/treehole")
      .then((data) => {
        // Posts about self-harm stay in the feed (with hotlines) but are not put on the front page.
        if (alive) setPosts(data.posts.filter((post) => !mentionsCrisis(post.content)).slice(0, SHOWN));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (posts.length === 0) return null;
  return (
    <div className={styles.latest}>
      <div className={styles.head}>
        <span className={styles.title}>树洞里刚刚有人说</span>
        <Link href="/treehole" className={styles.more}>
          看更多
        </Link>
      </div>
      <div className={styles.grid}>
        {posts.map((post) => (
          <Link key={post.id} href={`/treehole/${post.id}`} className={styles.note}>
            <span className={styles.meta}>
              <span className={styles.alias}>{post.alias}</span>
              {post.mood && (
                <Tag size="s" variant={MOOD_COLORS[post.mood as Mood] ?? "neutral"}>
                  {post.mood}
                </Tag>
              )}
              <span className={styles.time}>{relativeTime(post.createdAt)}</span>
            </span>
            <span className={styles.content}>{post.content}</span>
            <span className={styles.stats}>
              抱抱 {post.likeCount} · 评论 {post.commentCount}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Button, Feedback, Icon, Row, Text } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { QuotaHint } from "@/components/session/QuotaHint";
import { loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { api, errorMessage } from "@/lib/api";
import { extractTags, LIMITS, MAX_TAGS, MOODS, type Mood } from "@/lib/community";
import type { PostItem } from "@/lib/types";
import styles from "./memos.module.scss";

export function PostComposer({
  onCreated,
  suggestedTags = [],
}: {
  onCreated: (post: PostItem, crisis: boolean) => void;
  suggestedTags?: string[];
}) {
  const { user, refresh } = useSession();
  const pathname = usePathname();
  const input = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [showMoods, setShowMoods] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: grow the textarea whenever the text changes.
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [content]);

  if (!user) {
    return (
      <Row className={styles.composer} horizontal="between" vertical="center" gap="12" s={{ direction: "column", vertical: "start" }}>
        <Text variant="body-default-m" onBackground="neutral-medium">
          登录后就可以匿名发树洞、给别人抱抱和评论。
        </Text>
        <Row gap="8">
          <Button href={loginHref(pathname)} size="s" variant="primary">
            登录
          </Button>
          <Button href={loginHref(pathname, true)} size="s" variant="secondary">
            注册
          </Button>
        </Row>
      </Row>
    );
  }

  const insert = (text: string) => {
    const element = input.current;
    const start = element?.selectionStart ?? content.length;
    const end = element?.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const spacer = before && !/\s$/.test(before) ? " " : "";
    const next = `${before}${spacer}${text}${content.slice(end)}`;
    setContent(next.slice(0, LIMITS.post.max));
    requestAnimationFrame(() => {
      element?.focus();
      const caret = before.length + spacer.length + text.length;
      element?.setSelectionRange(caret, caret);
    });
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busy || content.trim().length < LIMITS.post.min) return;
    setBusy(true);
    setError(undefined);
    try {
      const data = await api<{ post: PostItem; crisis: boolean }>("/api/treehole", { body: { content, mood } });
      setContent("");
      setMood(null);
      setShowMoods(false);
      onCreated(data.post, data.crisis);
      refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const length = content.trim().length;
  const tags = extractTags(content);
  const suggestions = suggestedTags.filter((tag) => !tags.includes(tag)).slice(0, 4);

  return (
    <form onSubmit={submit} className={styles.composer} aria-label="发一条树洞">
      <label htmlFor="treehole-content" className="visually-hidden">
        想说点什么
      </label>
      <textarea
        id="treehole-content"
        ref={input}
        className={styles.composerInput}
        placeholder="此刻的想法…… 用 #标签 归类，Ctrl + Enter 发布"
        value={content}
        maxLength={LIMITS.post.max}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
        }}
      />

      {showMoods && (
        <fieldset className={styles.composerMoods}>
          <legend className="visually-hidden">心情（可选）</legend>
          {MOODS.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.moodPill}
              aria-pressed={mood === item}
              onClick={() => setMood(mood === item ? null : item)}
            >
              {item}
            </button>
          ))}
        </fieldset>
      )}

      {suggestions.length > 0 && tags.length < MAX_TAGS && (
        <div className={styles.composerMoods}>
          {suggestions.map((tag) => (
            <button key={tag} type="button" className={styles.moodPill} onClick={() => insert(`#${tag} `)}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      {error && <Feedback variant="danger" description={error} />}

      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={() => insert("#")} aria-label="插入标签">
          <Icon name="hash" size="s" />
          标签
        </button>
        <button
          type="button"
          className={styles.toolButton}
          aria-expanded={showMoods}
          onClick={() => setShowMoods((value) => !value)}
        >
          <Icon name="heart" size="s" />
          {mood ?? "心情"}
        </button>
        <span className={styles.counter}>
          {length} / {LIMITS.post.max}
        </span>
        <Button type="submit" variant="primary" size="s" loading={busy} disabled={length < LIMITS.post.min} prefixIcon="send">
          匿名发布
        </Button>
      </div>
      <div className={styles.composerHint}>
        <span>以随机昵称发布，不显示用户名。请不要留下手机号、微信等联系方式。</span>
        <QuotaHint feature="post" />
      </div>
    </form>
  );
}

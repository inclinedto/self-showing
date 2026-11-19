"use client";

import { Button, Column, Feedback, Row, Text, Textarea } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { QuotaHint } from "@/components/session/QuotaHint";
import { loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { api, errorMessage } from "@/lib/api";
import { LIMITS, MOODS, type Mood } from "@/lib/community";
import type { PostItem } from "@/lib/types";
import styles from "./community.module.scss";

export function PostComposer({ onCreated }: { onCreated: (post: PostItem, crisis: boolean) => void }) {
  const { user, refresh } = useSession();
  const pathname = usePathname();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!user) {
    return (
      <Row
        className={styles.card}
        horizontal="between"
        vertical="center"
        gap="12"
        s={{ direction: "column", vertical: "start" }}
      >
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const data = await api<{ post: PostItem; crisis: boolean }>("/api/treehole", {
        body: { content, mood },
      });
      setContent("");
      setMood(null);
      onCreated(data.post, data.crisis);
      refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const length = content.trim().length;
  return (
    <form onSubmit={submit} className={styles.card}>
      <Textarea
        id="treehole-content"
        label="想说点什么？"
        lines={4}
        resize="vertical"
        value={content}
        maxLength={LIMITS.post.max}
        onChange={(event) => setContent(event.target.value)}
      />
      <fieldset className={styles.pills}>
        <legend className="visually-hidden">心情（可选）</legend>
        {MOODS.map((item) => (
          <button
            key={item}
            type="button"
            className={styles.pill}
            aria-pressed={mood === item}
            onClick={() => setMood(mood === item ? null : item)}
          >
            {item}
          </button>
        ))}
      </fieldset>
      {error && <Feedback variant="danger" description={error} />}
      <Row horizontal="between" vertical="center" gap="12" s={{ direction: "column", vertical: "start" }}>
        <Column gap="4">
          <Text variant="body-default-xs" onBackground="neutral-weak">
            会以随机昵称发布，不显示用户名。请不要留下手机号、微信等联系方式。
          </Text>
          <QuotaHint feature="post" />
        </Column>
        <Row gap="12" vertical="center">
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {length} / {LIMITS.post.max}
          </Text>
          <Button type="submit" variant="primary" size="m" loading={busy} disabled={length < LIMITS.post.min} prefixIcon="send">
            匿名发布
          </Button>
        </Row>
      </Row>
    </form>
  );
}

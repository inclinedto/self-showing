"use client";

import { Button, Column, Feedback, Heading, SmartLink, Tag, Text, Textarea } from "@once-ui-system/core";
import { useState } from "react";
import { Choice } from "@/components/ui/Choice";
import { Loading } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { LIMITS } from "@/lib/community";
import { formatDateTime } from "@/lib/format";
import type { QuestionItem } from "@/lib/types";
import { styles, useAction, useAdminData } from "./shared";

type ModerationItem = {
  id: number;
  postId: number | null;
  alias: string;
  content: string;
  status: string;
  reportCount: number;
  reasons: string | null;
  createdAt: string;
};

export function ModerationPanel() {
  const { data, error, loading, reload } = useAdminData<{ posts: ModerationItem[]; comments: ModerationItem[] }>(
    "/api/admin/moderation",
  );
  const { busy, run } = useAction(reload);

  const act = (type: "post" | "comment", item: ModerationItem, action: "restore" | "delete") =>
    run(
      `${type}:${item.id}:${action}`,
      () => api("/api/admin/moderation", { method: "PATCH", body: { type, id: item.id, action } }),
      action === "restore" ? "已恢复显示" : "已删除",
    );

  const section = (type: "post" | "comment", title: string, items: ModerationItem[]) => (
    <Column gap="8">
      <Heading as="h2" variant="heading-strong-s">
        {title}（{items.length}）
      </Heading>
      {items.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          没有需要处理的内容。
        </Text>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.title}>{item.alias}</span>
                <Tag size="s" variant={item.status === "hidden" ? "warning" : "neutral"}>
                  {item.status === "hidden" ? "已自动隐藏" : "被举报"}
                </Tag>
                <span className={styles.muted}>
                  举报 {item.reportCount} 次{item.reasons ? `：${item.reasons}` : ""} · {formatDateTime(item.createdAt)}
                </span>
                <SmartLink href={`/treehole/${type === "post" ? item.id : item.postId}`}>查看</SmartLink>
              </div>
              <p className={styles.text}>{item.content}</p>
              <div className={styles.actions}>
                <Button
                  size="s"
                  variant="secondary"
                  loading={busy === `${type}:${item.id}:restore`}
                  onClick={() => act(type, item, "restore")}
                >
                  没问题，恢复
                </Button>
                <Button
                  size="s"
                  variant="danger"
                  loading={busy === `${type}:${item.id}:delete`}
                  onClick={() => window.confirm("确定删除？") && act(type, item, "delete")}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Column>
  );

  if (loading && !data) return <Loading />;
  return (
    <Column gap="24">
      {error && <Feedback variant="danger" description={error} />}
      {data && section("post", "树洞", data.posts)}
      {data && section("comment", "评论", data.comments)}
    </Column>
  );
}

type AdminQuestion = QuestionItem & { reportCount: number };

const QUESTION_FILTERS = [
  { value: "pending", label: "待回答" },
  { value: "answered", label: "已回答" },
  { value: "hidden", label: "已隐藏" },
];

export function QuestionsPanel() {
  const [status, setStatus] = useState("pending");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const { data, error, loading, reload } = useAdminData<{ questions: AdminQuestion[] }>(
    `/api/admin/questions?status=${status}`,
  );
  const { busy, run } = useAction(reload);

  const act = (question: AdminQuestion, body: Record<string, unknown>, success: string) =>
    run(`${question.id}:${body.action}`, () => api(`/api/admin/questions/${question.id}`, { method: "PATCH", body }), success);

  return (
    <Column gap="16">
      <Choice name="提问状态" value={status} onChange={setStatus} options={QUESTION_FILTERS} />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        提问是匿名的，这里不显示提问者。回答后，用户允许公开的问题会出现在提问箱页面。
      </Text>
      {error && <Feedback variant="danger" description={error} />}
      {loading && !data ? (
        <Loading />
      ) : data?.questions.length === 0 ? (
        <Text onBackground="neutral-weak">这里是空的。</Text>
      ) : (
        <div className={styles.list}>
          {data?.questions.map((question) => {
            const draft = drafts[question.id] ?? question.answer ?? "";
            return (
              <div key={question.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.muted}>#{question.id} · {formatDateTime(question.createdAt)}</span>
                  {!question.isPublic && (
                    <Tag size="s" variant="neutral">
                      不公开
                    </Tag>
                  )}
                  {question.reportCount > 0 && (
                    <Tag size="s" variant="warning">
                      被举报 {question.reportCount} 次
                    </Tag>
                  )}
                </div>
                <p className={styles.text}>{question.content}</p>
                {status !== "hidden" && (
                  <Textarea
                    id={`answer-${question.id}`}
                    label={question.answer ? "修改回答" : "写下回答"}
                    lines={3}
                    resize="vertical"
                    maxLength={LIMITS.answer.max}
                    value={draft}
                    onChange={(event) => setDrafts((previous) => ({ ...previous, [question.id]: event.target.value }))}
                  />
                )}
                <div className={styles.actions}>
                  {status !== "hidden" && (
                    <Button
                      size="s"
                      loading={busy === `${question.id}:answer`}
                      disabled={!draft.trim()}
                      onClick={() => act(question, { action: "answer", answer: draft }, "回答已发布")}
                    >
                      {question.answer ? "更新回答" : "发布回答"}
                    </Button>
                  )}
                  {status === "hidden" ? (
                    <Button size="s" variant="secondary" onClick={() => act(question, { action: "restore" }, "已恢复")}>
                      恢复
                    </Button>
                  ) : (
                    <Button size="s" variant="tertiary" onClick={() => act(question, { action: "hide" }, "已隐藏")}>
                      隐藏
                    </Button>
                  )}
                  <Button
                    size="s"
                    variant="danger"
                    onClick={() => window.confirm("确定删除这个提问？") && act(question, { action: "delete" }, "已删除")}
                  >
                    删除
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Column>
  );
}

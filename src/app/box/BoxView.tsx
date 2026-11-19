"use client";

import {
  Button,
  Column,
  Feedback,
  Icon,
  Row,
  SegmentedControl,
  Switch,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CrisisNotice } from "@/components/community/CrisisNotice";
import { ReportDialog } from "@/components/community/ReportDialog";
import styles from "@/components/community/community.module.scss";
import { QuotaHint } from "@/components/session/QuotaHint";
import { ComingSoon, loginHref } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { Loading, Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { LIMITS } from "@/lib/community";
import { relativeTime } from "@/lib/format";
import type { QuestionItem } from "@/lib/types";
import { site } from "@/resources/site";

type Tab = "answered" | "mine";

const STATUS_LABELS: Record<QuestionItem["status"], { label: string; variant: "neutral" | "success" | "warning" }> = {
  pending: { label: "等待回答", variant: "neutral" },
  answered: { label: "已回答", variant: "success" },
  hidden: { label: "未公开", variant: "warning" },
};

export function BoxView() {
  const { user, status, loading: sessionLoading, refresh } = useSession();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("answered");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string; crisis?: boolean }>();
  const [reportTarget, setReportTarget] = useState<{ type: "question"; id: number } | null>(null);
  const dbReady = status?.db !== false;

  useEffect(() => {
    if (sessionLoading || !dbReady) return;
    if (tab === "mine" && !user) {
      setTab("answered");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const request =
      tab === "mine"
        ? api<{ questions: QuestionItem[] }>("/api/box/mine").then((data) => ({ ...data, next: null, total: 0 }))
        : api<{ questions: QuestionItem[]; next: string | null; total: number }>("/api/box");
    request
      .then((data) => {
        if (cancelled) return;
        setQuestions(data.questions);
        setNext(data.next);
        if (tab === "answered") setTotal(data.total);
      })
      .catch((loadError) => !cancelled && setError(errorMessage(loadError)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, user, sessionLoading, dbReady]);

  const loadMore = async () => {
    if (!next) return;
    try {
      const data = await api<{ questions: QuestionItem[]; next: string | null }>(`/api/box?cursor=${next}`);
      setQuestions((previous) => [...previous, ...data.questions]);
      setNext(data.next);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setSendResult(undefined);
    try {
      const data = await api<{ question: QuestionItem; crisis: boolean }>("/api/box", {
        body: { content: draft, isPublic },
      });
      setDraft("");
      setSendResult({
        ok: true,
        crisis: data.crisis,
        message: "已经匿名投递给站长啦。回答后可以在「我的提问」里看到。",
      });
      if (tab === "mine") setQuestions((previous) => [data.question, ...previous]);
      refresh();
    } catch (sendError) {
      setSendResult({ ok: false, message: errorMessage(sendError) });
    } finally {
      setSending(false);
    }
  };

  const header = (
    <PageHeader
      icon="inbox"
      title="提问箱"
      description={`想问${site.owner}什么都可以，匿名投递。回答后，你选择公开的问题会展示在这里。`}
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

      {user ? (
        <form onSubmit={send} className={styles.card}>
          <Textarea
            id="question-content"
            label="你的问题"
            lines={3}
            resize="vertical"
            value={draft}
            maxLength={LIMITS.question.max}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Switch
            isChecked={isPublic}
            onToggle={() => setIsPublic((value) => !value)}
            label="回答后允许公开展示"
            description="关闭后，问题和回答只有你自己能看到"
          />
          {sendResult && (
            <Feedback variant={sendResult.ok ? "success" : "danger"} description={sendResult.message} />
          )}
          {sendResult?.crisis && <CrisisNotice />}
          <Row horizontal="between" vertical="center" gap="12" s={{ direction: "column", vertical: "start" }}>
            <QuotaHint feature="question" />
            <Button
              type="submit"
              loading={sending}
              disabled={draft.trim().length < LIMITS.question.min}
              prefixIcon="send"
            >
              匿名提问
            </Button>
          </Row>
        </form>
      ) : (
        <Row className={styles.card} horizontal="between" vertical="center" gap="12" s={{ direction: "column", vertical: "start" }}>
          <Text variant="body-default-m" onBackground="neutral-medium">
            登录后可以匿名提问，站长看不到你的用户名。
          </Text>
          <Button href={loginHref(pathname)} size="s">
            登录后提问
          </Button>
        </Row>
      )}

      {user && (
        <SegmentedControl
          selected={tab}
          onToggle={(value) => setTab(value as Tab)}
          buttons={[
            { value: "answered", label: total ? `全部回答 · ${total}` : "全部回答" },
            { value: "mine", label: "我的提问" },
          ]}
        />
      )}

      {error && <Feedback variant="danger" description={error} />}

      {loading ? (
        <Loading />
      ) : questions.length === 0 ? (
        <Notice
          icon="inbox"
          title={tab === "mine" ? "你还没有提过问题" : "还没有公开的回答"}
          description={tab === "mine" ? "在上面写下你的第一个问题吧。" : "站长回答之后，公开的问题会出现在这里。"}
        />
      ) : (
        <Column gap="12">
          {questions.map((question) => (
            <article key={question.id} className={styles.card}>
              <div className={styles.meta}>
                <Icon name="question" size="s" onBackground="neutral-weak" />
                <span>匿名提问</span>
                <time dateTime={question.createdAt}>{relativeTime(question.createdAt)}</time>
                {tab === "mine" && (
                  <>
                    <Tag size="s" variant={STATUS_LABELS[question.status].variant}>
                      {STATUS_LABELS[question.status].label}
                    </Tag>
                    {!question.isPublic && (
                      <Tag size="s" variant="neutral">
                        仅自己可见
                      </Tag>
                    )}
                  </>
                )}
                <span className={styles.spacer} />
                {tab === "answered" && user && (
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => setReportTarget({ type: "question", id: question.id })}
                  >
                    <Icon name="flag" size="xs" />
                    举报
                  </button>
                )}
              </div>
              <p className={styles.content}>{question.content}</p>
              {question.answer && (
                <div className={styles.answer}>
                  <Text variant="label-strong-s" onBackground="brand-strong">
                    {site.owner}的回答
                  </Text>
                  <p className={styles.content} style={{ marginTop: 6 }}>
                    {question.answer}
                  </p>
                </div>
              )}
            </article>
          ))}
          {next && (
            <Row horizontal="center">
              <Button variant="secondary" onClick={loadMore}>
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

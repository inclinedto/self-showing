"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Column,
  Feedback,
  Heading,
  Icon,
  ProgressBar,
  Row,
  Spinner,
  Switch,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { FileDrop } from "@/components/FileDrop";
import { DemoBanner, QuotaHint } from "@/components/session/QuotaHint";
import { useSession } from "@/components/session/SessionProvider";
import { AnswerText } from "@/components/tools/AnswerText";
import { api, apiFetch } from "@/lib/api";
import {
  ACCEPTED_DOCUMENTS,
  DocumentError,
  parseDocument,
  type ParsedDocument,
} from "@/lib/documents";
import { Bm25Index, chunkSections, citedIds, selectChunks } from "@/lib/retrieval";
import type {
  ChatTurn,
  ClaimVerdict,
  Excerpt,
  VerifiedClaim,
  VerifyResponse,
} from "@/lib/types";

type VerifyState =
  | { status: "running" }
  | { status: "done"; claims: VerifiedClaim[] }
  | { status: "error"; error: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  excerpts?: Excerpt[];
  streaming?: boolean;
  error?: string;
  verify?: VerifyState;
};

type LoadedDocument = ParsedDocument & { index: Bm25Index; chunkCount: number };

const EXAMPLES = [
  "这份文档主要讲了什么？",
  "列出文中提到的关键数字和日期",
  "有哪些限制条件或需要注意的风险？",
];

let messageCounter = 0;
const nextId = () => `m${Date.now().toString(36)}${(messageCounter++).toString(36)}`;

export function AskTool() {
  const { refresh } = useSession();
  const [doc, setDoc] = useState<LoadedDocument | null>(null);
  const [parsing, setParsing] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [autoVerify, setAutoVerify] = useState(true);
  const [active, setActive] = useState<{ messageId: string; id: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const busy = messages.some((message) => message.streaming);

  useEffect(() => () => abortRef.current?.abort(), []);

  const lastContent = messages[messages.length - 1]?.content;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll as the latest answer streams in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  const updateMessage = (id: string, patch: Partial<Message>) =>
    setMessages((previous) =>
      previous.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );

  const onFiles = async ([file]: File[]) => {
    abortRef.current?.abort();
    setError(undefined);
    setMessages([]);
    setDoc(null);
    setParsing({ done: 0, total: 1 });
    try {
      const parsed = await parseDocument(file, (done, total) => setParsing({ done, total }));
      const chunks = chunkSections(parsed.sections);
      if (chunks.length === 0) {
        setError(
          parsed.emptyLabels.length > 0
            ? "这份文档没有可识别的文字，可能是扫描件或图片 PDF。可以先用“表格提取”工具识别图片里的内容。"
            : "文档是空的。",
        );
        return;
      }
      setDoc({ ...parsed, index: new Bm25Index(chunks), chunkCount: chunks.length });
    } catch (parseError) {
      console.error(parseError);
      setError(
        parseError instanceof DocumentError ? parseError.message : "文档读取失败，请换一个文件试试",
      );
    } finally {
      setParsing(null);
    }
  };

  const verify = async (messageId: string, answer: string, excerpts: Excerpt[]) => {
    const cited = new Set(citedIds(answer));
    const used = excerpts.filter((excerpt) => cited.has(excerpt.id));
    if (used.length === 0) {
      updateMessage(messageId, { verify: { status: "done", claims: [] } });
      return;
    }
    updateMessage(messageId, { verify: { status: "running" } });
    try {
      const data = await api<VerifyResponse>("/api/ask/verify", {
        body: { answer, excerpts: used },
      });
      updateMessage(messageId, { verify: { status: "done", claims: data.claims ?? [] } });
    } catch (verifyError) {
      updateMessage(messageId, {
        verify: {
          status: "error",
          error: verifyError instanceof Error ? verifyError.message : "核查失败",
        },
      });
    }
  };

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!doc || !question || busy) return;
    setInput("");
    setError(undefined);

    const previousQuestion =
      [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const chunks = selectChunks(doc.index, `${question} ${previousQuestion}`);
    const excerpts: Excerpt[] = chunks.map((chunk, index) => ({
      id: index + 1,
      label: chunk.label,
      text: chunk.text,
    }));
    // Old answers cite a different excerpt numbering, so markers are stripped from the history.
    const history: ChatTurn[] = messages
      .filter((message) => !message.error && message.content)
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content.replace(/\[\d+(?:\s*[,，、]\s*\d+)*\]/g, ""),
      }));

    const userMessage: Message = { id: nextId(), role: "user", content: question };
    const answerId = nextId();
    setMessages((previous) => [
      ...previous,
      userMessage,
      { id: answerId, role: "assistant", content: "", excerpts, streaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    try {
      const response = await apiFetch("/api/ask", {
        body: { documentName: doc.name, question, excerpts, history },
        signal: controller.signal,
      });
      if (!response.body) throw new Error("回答失败，请重试");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        updateMessage(answerId, { content: answer });
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("AI 没有返回内容，请重试");
      updateMessage(answerId, { content: answer, streaming: false });
      if (autoVerify) verify(answerId, answer, excerpts);
    } catch (askError) {
      const aborted = controller.signal.aborted;
      updateMessage(answerId, {
        content: answer,
        streaming: false,
        error: aborted
          ? answer
            ? undefined
            : "已停止"
          : askError instanceof Error
            ? askError.message
            : "回答失败",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      refresh();
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setDoc(null);
    setMessages([]);
    setError(undefined);
  };

  return (
    <Column fillWidth gap="24">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-s">
          文档问答
        </Heading>
        <Text onBackground="neutral-weak" variant="body-default-l">
          上传文档后直接提问。回答里的每个编号都能点开看原文出处，并会自动核查一遍。
        </Text>
        <QuotaHint feature="ask" />
      </Column>
      <DemoBanner />

      {!doc && (
        <Column gap="12">
          {parsing ? (
            <Column
              gap="12"
              padding="32"
              radius="l"
              border="neutral-alpha-weak"
              background="surface"
              horizontal="center"
            >
              <Spinner />
              <Text variant="body-default-s">
                正在本地解析文档… {parsing.total > 1 ? `${parsing.done} / ${parsing.total} 页` : ""}
              </Text>
              {parsing.total > 1 && (
                <ProgressBar value={(parsing.done / parsing.total) * 100} label={false} />
              )}
            </Column>
          ) : (
            <FileDrop
              accept={ACCEPTED_DOCUMENTS}
              title="点击或拖拽上传文档"
              hint="PDF、Word（.docx）、TXT、Markdown，最大 50 MB"
              onFiles={onFiles}
            />
          )}
          <Row gap="8" vertical="center">
            <Icon name="shield" size="xs" onBackground="neutral-weak" />
            <Text variant="body-default-xs" onBackground="neutral-weak">
              文档在浏览器本地解析，每次提问只把最相关的几段原文发给 AI 模型，服务器不保存文档。
            </Text>
          </Row>
        </Column>
      )}

      {error && <Feedback variant="danger" description={error} />}

      {doc && (
        <Column gap="12" padding="16" radius="l" border="neutral-alpha-weak" background="surface">
          <Row
            fillWidth
            horizontal="between"
            vertical="center"
            gap="12"
            s={{ direction: "column", vertical: "start" }}
          >
            <Row gap="8" vertical="center" style={{ minWidth: 0 }}>
              <Icon name="documentText" onBackground="brand-medium" />
              <Text
                variant="heading-strong-s"
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {doc.name}
              </Text>
              <Text
                variant="body-default-s"
                onBackground="neutral-weak"
                style={{ whiteSpace: "nowrap" }}
              >
                {doc.pageCount} {/\.pdf$/i.test(doc.name) ? "页" : "部分"} · {doc.chunkCount} 个片段
              </Text>
            </Row>
            <Row gap="16" vertical="center">
              <Row gap="8" vertical="center">
                <Switch
                  isChecked={autoVerify}
                  onToggle={() => setAutoVerify((value) => !value)}
                  ariaLabel="自动核查"
                />
                <Text variant="body-default-s">自动核查</Text>
              </Row>
              <Button variant="secondary" size="s" prefixIcon="refresh" onClick={reset}>
                换个文档
              </Button>
            </Row>
          </Row>
          {doc.emptyLabels.length > 0 && (
            <Text variant="body-default-xs" onBackground="warning-medium">
              有 {doc.emptyLabels.length}{" "}
              页没有可识别的文字（可能是扫描页），这些页的内容无法被检索：
              {doc.emptyLabels.slice(0, 8).join("、")}
              {doc.emptyLabels.length > 8 ? " 等" : ""}
            </Text>
          )}
          {doc.truncated && (
            <Text variant="body-default-xs" onBackground="warning-medium">
              文档超过 500 页，只解析了前 500 页。
            </Text>
          )}
        </Column>
      )}

      {doc && messages.length === 0 && (
        <Column gap="8">
          <Text variant="label-default-s" onBackground="neutral-weak">
            可以这样问：
          </Text>
          <Row gap="8" wrap>
            {EXAMPLES.map((example) => (
              <Button key={example} variant="secondary" size="s" onClick={() => ask(example)}>
                {example}
              </Button>
            ))}
          </Row>
        </Column>
      )}

      {messages.length > 0 && (
        <Column gap="20" fillWidth>
          {messages.map((message) =>
            message.role === "user" ? (
              <Row key={message.id} fillWidth horizontal="end">
                <Row
                  maxWidth={36}
                  paddingX="16"
                  paddingY="12"
                  radius="l"
                  background="brand-alpha-weak"
                  border="brand-alpha-medium"
                >
                  <Text variant="body-default-m" style={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </Text>
                </Row>
              </Row>
            ) : (
              <AnswerCard
                key={message.id}
                message={message}
                activeId={active?.messageId === message.id ? active.id : undefined}
                onCite={(id) =>
                  setActive((current) =>
                    current?.messageId === message.id && current.id === id
                      ? null
                      : { messageId: message.id, id },
                  )
                }
                onVerify={() => verify(message.id, message.content, message.excerpts ?? [])}
              />
            ),
          )}
          <div ref={bottomRef} />
        </Column>
      )}

      {doc && (
        <Column
          as="form"
          gap="8"
          fillWidth
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <Textarea
            id="question"
            label="输入问题，Enter 发送，Shift + Enter 换行"
            lines={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                ask(input);
              }
            }}
          />
          <Row gap="8" horizontal="end">
            {busy && (
              <Button variant="secondary" size="m" onClick={() => abortRef.current?.abort()}>
                停止
              </Button>
            )}
            <Button type="submit" size="m" prefixIcon="send" disabled={busy || !input.trim()}>
              发送
            </Button>
          </Row>
        </Column>
      )}
    </Column>
  );
}

const VERDICT_STYLE: Record<ClaimVerdict, { icon: string; color: string; label: string }> = {
  supported: { icon: "checkCircle", color: "success-medium", label: "有依据" },
  partial: { icon: "warning", color: "warning-medium", label: "部分有依据" },
  unsupported: { icon: "warning", color: "danger-medium", label: "无依据" },
};

type AnswerCardProps = {
  message: Message;
  activeId?: number;
  onCite: (id: number) => void;
  onVerify: () => void;
};

function AnswerCard({ message, activeId, onCite, onVerify }: AnswerCardProps) {
  const excerpts = message.excerpts ?? [];
  const knownIds = useMemo(() => new Set(excerpts.map((excerpt) => excerpt.id)), [excerpts]);
  const cited = useMemo(() => new Set(citedIds(message.content)), [message.content]);
  const sources = excerpts.filter((excerpt) => cited.has(excerpt.id));
  const activeExcerpt = excerpts.find((excerpt) => excerpt.id === activeId);

  return (
    <Column
      fillWidth
      gap="12"
      padding="16"
      radius="l"
      border="neutral-alpha-weak"
      background="surface"
    >
      {message.content ? (
        <AnswerText
          text={message.content}
          knownIds={knownIds}
          activeId={activeId}
          onCite={onCite}
        />
      ) : message.streaming ? (
        <Row gap="8" vertical="center">
          <Spinner size="s" />
          <Text variant="body-default-s" onBackground="neutral-weak">
            正在检索相关段落并生成回答…
          </Text>
        </Row>
      ) : null}

      {message.error && <Feedback variant="danger" description={message.error} />}

      {activeExcerpt && (
        <Column gap="8" padding="12" radius="m" background="neutral-alpha-weak">
          <Row gap="8" vertical="center">
            <Tag size="s" variant="brand" label={`来源 ${activeExcerpt.id}`} />
            <Text variant="label-default-s">{activeExcerpt.label}</Text>
          </Row>
          <Text
            variant="body-default-s"
            onBackground="neutral-medium"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {activeExcerpt.text}
          </Text>
        </Column>
      )}

      {!message.streaming && sources.length > 0 && (
        <Row gap="8" wrap vertical="center">
          <Text variant="label-default-s" onBackground="neutral-weak">
            出处：
          </Text>
          {sources.map((excerpt) => (
            <Button
              key={excerpt.id}
              variant={activeId === excerpt.id ? "primary" : "tertiary"}
              size="s"
              onClick={() => onCite(excerpt.id)}
            >
              [{excerpt.id}] {excerpt.label}
            </Button>
          ))}
        </Row>
      )}

      {!message.streaming && message.content && (
        <VerifyPanel state={message.verify} onVerify={onVerify} />
      )}
    </Column>
  );
}

function VerifyPanel({ state, onVerify }: { state?: VerifyState; onVerify: () => void }) {
  const [open, setOpen] = useState(false);

  if (!state) {
    return (
      <Row>
        <Button variant="tertiary" size="s" prefixIcon="shield" onClick={onVerify}>
          核查这个回答
        </Button>
      </Row>
    );
  }
  if (state.status === "running") {
    return (
      <Row gap="8" vertical="center">
        <Spinner size="xs" />
        <Text variant="body-default-xs" onBackground="neutral-weak">
          正在对照原文核查…
        </Text>
      </Row>
    );
  }
  if (state.status === "error") {
    return (
      <Row gap="8" vertical="center">
        <Text variant="body-default-xs" onBackground="danger-medium">
          {state.error}
        </Text>
        <Button variant="tertiary" size="s" prefixIcon="refresh" onClick={onVerify}>
          重新核查
        </Button>
      </Row>
    );
  }
  if (state.claims.length === 0) {
    return (
      <Text variant="body-default-xs" onBackground="neutral-weak">
        这个回答没有需要核查的事实陈述。
      </Text>
    );
  }

  const counts: Record<ClaimVerdict, number> = { supported: 0, partial: 0, unsupported: 0 };
  for (const claim of state.claims) counts[claim.verdict] += 1;
  const allGood = counts.partial === 0 && counts.unsupported === 0;

  return (
    <Column gap="8" paddingTop="8" borderTop="neutral-alpha-weak">
      <Row gap="12" vertical="center" wrap>
        <Icon
          name={allGood ? "checkCircle" : "warning"}
          size="xs"
          onBackground={allGood ? "success-medium" : "warning-medium"}
        />
        <Text variant="body-default-s">
          {allGood
            ? `核查通过：${counts.supported} 条陈述都能在原文找到依据`
            : `核查：${counts.supported} 条有依据，${counts.partial} 条部分有依据，${counts.unsupported} 条无依据`}
        </Text>
        <Button variant="tertiary" size="s" onClick={() => setOpen((value) => !value)}>
          {open ? "收起" : "查看详情"}
        </Button>
      </Row>
      {open && (
        <Column gap="8">
          {state.claims.map((claim, index) => {
            const style = VERDICT_STYLE[claim.verdict];
            return (
              <Row key={`${index}-${claim.claim.slice(0, 10)}`} gap="8" vertical="start">
                <Icon
                  name={style.icon}
                  size="xs"
                  onBackground={style.color as "success-medium"}
                  marginTop="4"
                />
                <Column gap="2" flex={1}>
                  <Text variant="body-default-s">
                    {claim.claim}
                    {claim.citations.length > 0 && (
                      <Text onBackground="neutral-weak"> [{claim.citations.join("][")}]</Text>
                    )}
                  </Text>
                  <Text variant="body-default-xs" onBackground={style.color as "success-medium"}>
                    {style.label}
                    {claim.reason ? `：${claim.reason}` : ""}
                  </Text>
                </Column>
              </Row>
            );
          })}
        </Column>
      )}
    </Column>
  );
}

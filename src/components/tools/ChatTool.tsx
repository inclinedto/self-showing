"use client";

import { Button, Column, Feedback, Heading, IconButton, Row, SmartLink, Text, useToast } from "@once-ui-system/core";
import { useEffect, useRef, useState } from "react";
import { DemoBanner, QuotaHint } from "@/components/session/QuotaHint";
import { useSession } from "@/components/session/SessionProvider";
import { ApiError, apiFetch } from "@/lib/api";
import { Markdown } from "./Markdown";
import styles from "./ChatTool.module.scss";

type Message = { id: string; role: "user" | "assistant"; content: string; error?: string; quota?: boolean };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number };

const STORAGE_KEY = "zjs-chat-v1";
const MAX_CONVERSATIONS = 30;
const MAX_INPUT = 4000;

const EXAMPLES = [
  "帮我把这段话改得更正式一点：我们下周再约时间聊吧",
  "用简单的话解释一下什么是复利",
  "把“今天天气真好，适合出去走走”翻译成英文和日文",
  "帮我列一个周末大扫除的清单",
];

let counter = 0;
const newId = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

function readStored(): Conversation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && Array.isArray(item.messages))
      .map((item: Conversation) => ({
        ...item,
        // An empty answer was saved mid-stream and the page was closed before it finished.
        messages: item.messages.map((message) =>
          message.role === "assistant" && !message.content && !message.error
            ? { ...message, error: "回答被中断，请重试" }
            : message,
        ),
      }));
  } catch {
    return [];
  }
}

export function ChatTool() {
  const { refresh } = useSession();
  const { addToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastSaveRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readStored();
    setConversations(stored);
    setActiveId(stored[0]?.id ?? "");
    setLoaded(true);
    return () => abortRef.current?.abort();
  }, []);

  // Saves immediately when idle; while an answer streams in, at most once per second.
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      lastSaveRef.current = Date.now();
      try {
        const kept = conversations.filter((item) => item.messages.length > 0).slice(0, MAX_CONVERSATIONS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
      } catch {
        // Storage full or disabled: history just won't persist.
      }
    };
    const wait = streaming ? 1000 - (Date.now() - lastSaveRef.current) : 0;
    if (wait <= 0) {
      save();
      return;
    }
    const timer = setTimeout(save, wait);
    return () => clearTimeout(timer);
  }, [conversations, streaming, loaded]);

  const active = conversations.find((item) => item.id === activeId);
  const messages = active?.messages ?? [];
  const lastContent = messages.at(-1)?.content;

  // biome-ignore lint/correctness/useExhaustiveDependencies: follow the streamed answer while the reader is at the bottom.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
    if (nearBottom) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, lastContent]);

  const patchMessage = (conversationId: string, messageId: string, patch: Partial<Message>) =>
    setConversations((previous) =>
      previous.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages: item.messages.map((message) => (message.id === messageId ? { ...message, ...patch } : message)),
            }
          : item,
      ),
    );

  const send = async (raw: string, base?: Message[]) => {
    const text = raw.trim();
    if (!text || streaming) return;
    if (text.length > MAX_INPUT) {
      addToast({ variant: "danger", message: `单条消息最多 ${MAX_INPUT} 字` });
      return;
    }
    const conversationId = active?.id ?? newId();
    const history = base ?? messages;
    const userMessage: Message = { id: newId(), role: "user", content: text };
    const answerId = newId();
    const nextMessages = [...history, userMessage, { id: answerId, role: "assistant" as const, content: "" }];

    setConversations((previous) => {
      const existing = previous.find((item) => item.id === conversationId);
      const updated: Conversation = {
        id: conversationId,
        title: existing?.title || text.slice(0, 24),
        messages: nextMessages,
        updatedAt: Date.now(),
      };
      return [updated, ...previous.filter((item) => item.id !== conversationId)];
    });
    setActiveId(conversationId);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    try {
      const payload = [...history, userMessage]
        .filter((message) => !message.error && message.content)
        .map(({ role, content }) => ({ role, content }));
      const response = await apiFetch("/api/chat", { body: { messages: payload }, signal: controller.signal });
      if (!response.body) throw new Error("AI 没有返回内容，请重试");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        patchMessage(conversationId, answerId, { content: answer });
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("AI 没有返回内容，请重试");
      patchMessage(conversationId, answerId, { content: answer });
    } catch (error) {
      if (controller.signal.aborted) {
        patchMessage(conversationId, answerId, { content: answer, error: answer ? undefined : "已停止" });
      } else {
        patchMessage(conversationId, answerId, {
          content: answer,
          error: error instanceof Error ? error.message : "回答失败，请重试",
          quota: error instanceof ApiError && error.code === "quota_exceeded",
        });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
      refresh();
      inputRef.current?.focus();
    }
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUser) return;
    const index = messages.lastIndexOf(lastUser);
    send(lastUser.content, messages.slice(0, index));
  };

  const newChat = () => {
    if (streaming) return;
    setActiveId("");
    setInput("");
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const removeChat = (id: string) => {
    if (streaming && id === activeId) return;
    setConversations((previous) => previous.filter((item) => item.id !== id));
    if (id === activeId) setActiveId("");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ variant: "success", message: "已复制" });
    } catch {
      addToast({ variant: "danger", message: "复制失败，请手动选择文字复制" });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter is also used to confirm IME candidates when typing Chinese.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      send(input);
    }
  };

  const autosize = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: resize when the text is cleared or replaced programmatically.
  useEffect(() => {
    if (inputRef.current) autosize(inputRef.current);
  }, [input]);

  const sorted = [...conversations].filter((item) => item.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt);
  const last = messages.at(-1);

  return (
    <Column fillWidth gap="20">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-s">
          AI 小助手
        </Heading>
        <Text onBackground="neutral-weak" variant="body-default-l">
          写作、翻译、答疑、整理思路都可以问。对话记录只保存在这台设备的浏览器里。
        </Text>
        <QuotaHint feature="chat" />
      </Column>
      <DemoBanner />

      <div className={styles.layout}>
        <aside className={styles.sidebar} data-open={historyOpen} aria-label="历史对话">
          <Row gap="8">
            <Button variant="secondary" size="s" prefixIcon="plus" onClick={newChat} disabled={streaming} fillWidth>
              新对话
            </Button>
            <Button
              variant="tertiary"
              size="s"
              className={styles.toggleHistory}
              onClick={() => setHistoryOpen((value) => !value)}
              aria-expanded={historyOpen}
            >
              {historyOpen ? "收起历史" : `历史 (${sorted.length})`}
            </Button>
          </Row>
          <div className={styles.history}>
            {sorted.length === 0 ? (
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ padding: "8px 10px" }}>
                还没有历史对话
              </Text>
            ) : (
              sorted.map((item) => (
                <div key={item.id} className={styles.historyItem} aria-current={item.id === activeId}>
                  <button
                    type="button"
                    className={styles.historyButton}
                    onClick={() => {
                      if (streaming) return;
                      setActiveId(item.id);
                      setHistoryOpen(false);
                    }}
                    title={item.title}
                  >
                    {item.title || "新对话"}
                  </button>
                  <IconButton
                    icon="trash"
                    size="s"
                    variant="tertiary"
                    tooltip="删除"
                    aria-label={`删除对话：${item.title}`}
                    onClick={() => removeChat(item.id)}
                  />
                </div>
              ))
            )}
          </div>
        </aside>

        <section className={styles.main} aria-label="对话">
          {messages.length === 0 ? (
            <Column gap="16" paddingY="24">
              <Text variant="heading-strong-m">今天想聊点什么？</Text>
              <div className={styles.examples}>
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" className={styles.example} onClick={() => send(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </Column>
          ) : (
            <div className={styles.messages} aria-live="polite">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className={styles.user}>
                    {message.content}
                  </div>
                ) : (
                  <div key={message.id} className={styles.assistant}>
                    {(message.content || (!message.error && streaming && message === last)) && (
                      <div className={styles.assistantBody}>
                        {message.content ? (
                          <Markdown>{message.content}</Markdown>
                        ) : (
                          <span className={styles.cursor}>正在思考</span>
                        )}
                      </div>
                    )}
                    {message.error &&
                      (message.quota ? (
                        <Feedback variant="warning" description={message.error}>
                          <Row paddingTop="8">
                            <SmartLink href="/pricing">查看会员方案</SmartLink>
                          </Row>
                        </Feedback>
                      ) : (
                        <Feedback variant="danger" description={message.error} />
                      ))}
                    {message.content && !(streaming && message === last) && (
                      <Row gap="4">
                        <IconButton
                          icon="clipboard"
                          size="s"
                          variant="tertiary"
                          tooltip="复制"
                          aria-label="复制回答"
                          onClick={() => copy(message.content)}
                        />
                      </Row>
                    )}
                    {message.error && message === last && !message.quota && (
                      <Row>
                        <Button size="s" variant="secondary" prefixIcon="refresh" onClick={retry}>
                          重试
                        </Button>
                      </Row>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
          <div ref={bottomRef} />

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="chat-input" className="visually-hidden">
              输入消息
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              className={styles.input}
              rows={2}
              value={input}
              maxLength={MAX_INPUT}
              placeholder="输入消息，Enter 发送，Shift + Enter 换行"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <Row horizontal="between" vertical="center">
              <Text variant="body-default-xs" onBackground="neutral-weak">
                AI 可能出错，重要信息请自行核实
              </Text>
              {streaming ? (
                <Button type="button" size="s" variant="secondary" onClick={() => abortRef.current?.abort()}>
                  停止
                </Button>
              ) : (
                <Button type="submit" size="s" prefixIcon="send" disabled={!input.trim()}>
                  发送
                </Button>
              )}
            </Row>
          </form>
        </section>
      </div>
    </Column>
  );
}

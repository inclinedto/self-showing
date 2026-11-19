"use client";

import { Button } from "@once-ui-system/core";
import classNames from "classnames";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSegments,
  describeRegexError,
  type MatchInfo,
  PRESETS,
  parseSlashPattern,
  WORKER_SOURCE,
  type WorkerRequest,
  type WorkerResponse,
} from "@/lib/kit/regex";
import { Check, CopyButton, ErrorText, kit, Panel, TextArea, TextInput } from "../ui";
import styles from "./regex.module.scss";

const FLAGS = [
  { flag: "g", label: "g 全局" },
  { flag: "i", label: "i 忽略大小写" },
  { flag: "m", label: "m 多行" },
  { flag: "s", label: "s 点号匹配换行" },
  { flag: "u", label: "u Unicode" },
] as const;

const SAMPLE = `客服电话：13812345678，备用 15900001111
邮箱：hello@example.com / summer.sea@qq.com
官网：https://example.com/tools?from=regex
活动日期：2026-07-15 至 2026-08-31
服务器：192.168.1.10，邮编 266000`;

const TIMEOUT_MS = 1500;
const DEBOUNCE_MS = 200;
const HIGHLIGHT_LIMIT = 5000;
const LIST_LIMIT = 500;
const COUNT_LIMIT = 1_000_000;
const MAX_TEXT = 1_000_000;

type Outcome =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "timeout" }
  | {
      kind: "ok";
      text: string;
      total: number;
      capped: boolean;
      matches: MatchInfo[];
      replaced: string;
    };

/** Owns the Blob-URL worker; a busy or timed-out worker is terminated and replaced next run. */
class RegexRunner {
  private worker: Worker | null = null;
  private url: string | null = null;
  private timer: number | null = null;
  private seq = 0;

  run(request: Omit<WorkerRequest, "id">, done: (response: WorkerResponse | "timeout") => void) {
    this.cancel();
    const id = ++this.seq;
    if (!this.url) {
      this.url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    }
    const worker = this.worker ?? new Worker(this.url);
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      this.clearTimer();
      done(event.data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.clearTimer();
      this.kill();
      done({ id, ok: false, error: event.message || "匹配时出错了" });
    };
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.kill();
      done("timeout");
    }, TIMEOUT_MS);
    worker.postMessage({ ...request, id } satisfies WorkerRequest);
  }

  /** Drops the in-flight request, if any; a running match cannot be interrupted, only terminated. */
  cancel() {
    if (this.timer === null) return;
    this.clearTimer();
    this.kill();
  }

  dispose() {
    this.cancel();
    this.kill();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }

  private clearTimer() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private kill() {
    this.worker?.terminate();
    this.worker = null;
  }
}

const clip = (value: string, max = 80) => (value.length > max ? `${value.slice(0, max)}…` : value);

function describeGroups(match: MatchInfo): string {
  const parts = match.groups.map(
    (group, index) => `$${index + 1} = ${group === null ? "（未参与匹配）" : clip(group, 40)}`,
  );
  for (const [name, value] of Object.entries(match.named ?? {})) {
    parts.push(`<${name}> = ${value === null ? "（未参与匹配）" : clip(value, 40)}`);
  }
  return parts.join("，");
}

export default function RegexTool() {
  const [pattern, setPattern] = useState("(1[3-9]\\d)\\d{4}(\\d{4})");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState(SAMPLE);
  const [replacement, setReplacement] = useState("$1****$2");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const runnerRef = useRef<RegexRunner | null>(null);

  useEffect(() => () => runnerRef.current?.dispose(), []);

  useEffect(() => {
    if (!pattern || text.length > MAX_TEXT) {
      runnerRef.current?.cancel();
      setOutcome({ kind: "idle" });
      return;
    }
    const handle = window.setTimeout(() => {
      runnerRef.current ??= new RegexRunner();
      runnerRef.current.run(
        { pattern, flags, text, replacement, limit: HIGHLIGHT_LIMIT, countLimit: COUNT_LIMIT },
        (response) => {
          if (response === "timeout") setOutcome({ kind: "timeout" });
          else if (!response.ok) {
            setOutcome({ kind: "error", message: describeRegexError(response.error) });
          } else setOutcome({ kind: "ok", text, ...response });
        },
      );
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [pattern, flags, text, replacement]);

  const segments = useMemo(
    () => (outcome.kind === "ok" ? buildSegments(outcome.text, outcome.matches) : []),
    [outcome],
  );

  const toggleFlag = (flag: string, on: boolean) =>
    setFlags((prev) =>
      FLAGS.map((item) => item.flag)
        .filter((item) => (item === flag ? on : prev.includes(item)))
        .join(""),
    );

  const changePattern = (value: string) => {
    const pasted = value.length - pattern.length > 1 ? parseSlashPattern(value) : null;
    if (!pasted) return setPattern(value);
    setPattern(pasted.pattern);
    setFlags(
      FLAGS.map((item) => item.flag)
        .filter((flag) => pasted.flags.includes(flag))
        .join(""),
    );
  };

  const ok = outcome.kind === "ok" ? outcome : null;
  let status = "输入正则表达式开始匹配";
  if (ok) {
    status = ok.total
      ? `共匹配 ${ok.capped ? "超过 " : ""}${ok.total.toLocaleString("zh-CN")} 处`
      : "没有匹配到内容";
  } else if (outcome.kind === "error" || outcome.kind === "timeout") {
    status = "表达式需要修改，暂时没有结果";
  } else if (text.length > MAX_TEXT) {
    status = "测试文本太长";
  } else if (pattern) {
    status = "匹配中…";
  }

  return (
    <div className={kit.stack}>
      <Panel title="正则表达式">
        <TextInput
          label="表达式（不用写两边的 /）"
          mono
          value={pattern}
          onChange={changePattern}
          placeholder="例如 \d+"
          autoComplete="off"
          spellCheck={false}
          hint="直接粘贴 /abc/gi 这样的写法也行，会自动拆出标志"
        />
        <div className={kit.stack}>
          <span className={kit.label}>标志</span>
          <div className={styles.flags}>
            {FLAGS.map((item) => (
              <Check
                key={item.flag}
                label={item.label}
                checked={flags.includes(item.flag)}
                onChange={(on) => toggleFlag(item.flag, on)}
              />
            ))}
          </div>
        </div>
        <div className={kit.row}>
          <span className={kit.label}>常用</span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="s"
              variant="tertiary"
              onClick={() => setPattern(preset.pattern)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        {outcome.kind === "error" && <ErrorText>{outcome.message}</ErrorText>}
        {outcome.kind === "timeout" && <ErrorText>匹配超时，可能是正则存在灾难性回溯</ErrorText>}
        {text.length > MAX_TEXT && (
          <ErrorText>测试文本太长（超过 100 万字），请缩短后再试</ErrorText>
        )}
      </Panel>

      <div className={kit.grid2}>
        <Panel
          title="测试文本"
          actions={
            <>
              <Button size="s" variant="tertiary" onClick={() => setText(SAMPLE)}>
                填入示例
              </Button>
              <Button
                size="s"
                variant="tertiary"
                prefixIcon="trash"
                disabled={!text}
                onClick={() => setText("")}
              >
                清空
              </Button>
            </>
          }
        >
          <TextArea label="要匹配的文字" mono rows={10} value={text} onChange={setText} />
        </Panel>

        <Panel title="匹配高亮">
          <span className={kit.label} aria-live="polite">
            {status}
          </span>
          {ok?.text ? (
            <pre className={kit.output}>
              {segments.map((segment) =>
                segment.match < 0 ? (
                  <Fragment key={segment.start}>{segment.text}</Fragment>
                ) : (
                  <mark
                    key={segment.start}
                    className={classNames(kit.mark, segment.match % 2 === 1 && styles.alt)}
                  >
                    {segment.text}
                  </mark>
                ),
              )}
            </pre>
          ) : (
            <div className={kit.empty}>匹配到的内容会在这里高亮</div>
          )}
          {ok && ok.matches.length >= HIGHLIGHT_LIMIT && ok.total > HIGHLIGHT_LIMIT && (
            <span className={kit.hint}>匹配太多，只高亮前 {HIGHLIGHT_LIMIT} 处。</span>
          )}
        </Panel>
      </div>

      {ok && ok.matches.length > 0 && (
        <Panel title="匹配详情">
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>位置</th>
                  <th>匹配内容</th>
                  <th>分组</th>
                </tr>
              </thead>
              <tbody>
                {ok.matches.slice(0, LIST_LIMIT).map((match, index) => (
                  <tr key={match.index}>
                    <td>{index + 1}</td>
                    <td>{match.index}</td>
                    <td className={kit.mono}>
                      {match.text ? clip(match.text) : <span className={styles.muted}>（空）</span>}
                    </td>
                    <td className={kit.mono}>{describeGroups(match) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ok.total > LIST_LIMIT && (
            <span className={kit.hint}>只列出前 {LIST_LIMIT} 处匹配。位置从 0 开始计数。</span>
          )}
        </Panel>
      )}

      <Panel title="替换预览" actions={<CopyButton text={ok ? ok.replaced : ""} />}>
        <TextInput
          label="替换为"
          mono
          value={replacement}
          onChange={setReplacement}
          placeholder="留空则删除匹配到的内容"
          autoComplete="off"
          hint="支持 $1、$<名称>、$&（整个匹配）和 $$（美元符号），规则同 JavaScript 的 replace"
        />
        {ok ? (
          <pre className={kit.output}>{ok.replaced || " "}</pre>
        ) : (
          <div className={kit.empty}>替换结果会显示在这里</div>
        )}
      </Panel>
    </div>
  );
}

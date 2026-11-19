"use client";

import { Button, SegmentedControl } from "@once-ui-system/core";
import classNames from "classnames";
import { type ArrayChange, type Change, diffArrays, diffChars, diffWords } from "diff";
import { useDeferredValue, useMemo, useState } from "react";
import {
  buildLineRows,
  type DiffSummary,
  describeSummary,
  makeLineComparator,
  splitLines,
  summarize,
} from "@/lib/kit/diff";
import { Check, kit, Panel, TextArea } from "../ui";
import styles from "./diff.module.scss";

type Mode = "lines" | "words" | "chars";

const MODES: { value: Mode; label: string }[] = [
  { value: "lines", label: "按行" },
  { value: "words", label: "按词" },
  { value: "chars", label: "按字" },
];

const CHAR_LIMIT = 200_000;
const ROW_LIMIT = 5000;
const TIMEOUT_MS = 1500;

const SAMPLE_OLD = `夏日出行清单
1. 防晒霜 SPF30
2. 遮阳帽
3. 墨镜
4. 一本小说
5. 充电宝
6. 驱蚊水
7. 保温杯
8. 拖鞋
9. 雨伞
10. 相机
出发时间：7 月 15 日早上 8 点
目的地：青岛`;

const SAMPLE_NEW = `夏日出行清单
1. 防晒霜 SPF50+
2. 遮阳帽
3. 墨镜
4. 一本小说
5. 充电宝
6. 驱蚊水
7. 保温杯
8. 拖鞋
9. 雨伞
10. 相机
11. 泳衣
出发时间：7 月 16 日早上 7 点
目的地：厦门`;

type Result =
  | { kind: "empty" | "tooLong" | "timeout" }
  | { kind: "lines"; changes: ArrayChange<string>[]; summary: DiffSummary }
  | { kind: "inline"; changes: Change[]; summary: DiffSummary };

function compare(
  left: string,
  right: string,
  mode: Mode,
  ignoreCase: boolean,
  ignoreTrim: boolean,
): Result {
  if (!left && !right) return { kind: "empty" };
  if (mode === "lines") {
    const changes = diffArrays(splitLines(left), splitLines(right), {
      comparator: makeLineComparator(ignoreCase, ignoreTrim),
      timeout: TIMEOUT_MS,
    });
    return changes ? { kind: "lines", changes, summary: summarize(changes) } : { kind: "timeout" };
  }
  if (mode === "chars" && left.length + right.length > CHAR_LIMIT) return { kind: "tooLong" };
  const changes =
    mode === "chars"
      ? diffChars(left, right, { ignoreCase, timeout: TIMEOUT_MS })
      : diffWords(left, right, {
          ignoreCase,
          timeout: TIMEOUT_MS,
          intlSegmenter:
            typeof Intl.Segmenter === "function"
              ? new Intl.Segmenter("zh", { granularity: "word" })
              : undefined,
        });
  return changes ? { kind: "inline", changes, summary: summarize(changes) } : { kind: "timeout" };
}

function LineView({ changes, collapse }: { changes: ArrayChange<string>[]; collapse: boolean }) {
  const rows = useMemo(() => buildLineRows(changes, 3, collapse), [changes, collapse]);
  let oldCount = 0;
  let newCount = 0;
  for (const change of changes) {
    if (!change.added) oldCount += change.value.length;
    if (!change.removed) newCount += change.value.length;
  }
  const width = `${Math.max(2, String(Math.max(oldCount, newCount)).length)}ch`;
  return (
    <>
      <div className={styles.lines} style={{ "--num-width": width } as React.CSSProperties}>
        {rows.slice(0, ROW_LIMIT).map((row) => {
          if (row.kind === "skip") {
            return (
              <div key={`skip-${row.at}`} className={styles.skip}>
                … 省略 {row.hidden} 行相同内容 …
              </div>
            );
          }
          return (
            <div
              key={`${row.kind}-${row.oldNo ?? ""}-${row.newNo ?? ""}`}
              className={classNames(
                styles.line,
                row.kind === "add" && kit.added,
                row.kind === "del" && kit.removed,
              )}
            >
              <span className={styles.num}>{row.oldNo ?? ""}</span>
              <span className={styles.num}>{row.newNo ?? ""}</span>
              <span className={styles.sign}>
                {row.kind === "add" ? "+" : row.kind === "del" ? "-" : ""}
              </span>
              <span className={styles.text}>{row.text || " "}</span>
            </div>
          );
        })}
      </div>
      {rows.length > ROW_LIMIT && (
        <span className={kit.hint}>结果太长，只显示前 {ROW_LIMIT} 行。</span>
      )}
    </>
  );
}

function InlineView({ changes }: { changes: Change[] }) {
  let offset = 0;
  return (
    <>
      <pre className={classNames(kit.output, styles.inline)}>
        {changes.slice(0, ROW_LIMIT).map((change) => {
          const key = `${offset}-${change.added ? "a" : change.removed ? "d" : "s"}`;
          offset += change.value.length;
          if (change.added)
            return (
              <ins key={key} className={kit.added}>
                {change.value}
              </ins>
            );
          if (change.removed)
            return (
              <del key={key} className={kit.removed}>
                {change.value}
              </del>
            );
          return <span key={key}>{change.value}</span>;
        })}
      </pre>
      {changes.length > ROW_LIMIT && (
        <span className={kit.hint}>差异太多，只显示前 {ROW_LIMIT} 段。</span>
      )}
    </>
  );
}

export default function DiffTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [mode, setMode] = useState<Mode>("lines");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreTrim, setIgnoreTrim] = useState(false);
  const [collapse, setCollapse] = useState(true);

  const oldText = useDeferredValue(left);
  const newText = useDeferredValue(right);
  const trim = mode === "lines" && ignoreTrim;
  const result = useMemo(
    () => compare(oldText, newText, mode, ignoreCase, trim),
    [oldText, newText, mode, ignoreCase, trim],
  );

  const ignored = [ignoreCase && "大小写", trim && "行首尾空白"].filter(Boolean).join("和");
  let summary = "";
  if (result.kind === "lines" || result.kind === "inline") {
    summary = describeSummary(result.summary);
    const { added, removed, addedUnits, removedUnits } = result.summary;
    if (result.kind === "lines" && (added || removed)) {
      summary += `（+${addedUnits} 行，−${removedUnits} 行）`;
    }
    if (!added && !removed && ignored) summary += `（已忽略${ignored}）`;
  }
  const identical = summary.startsWith("两段文本完全相同");

  return (
    <div className={kit.stack}>
      <Panel
        title="输入"
        actions={
          <>
            <Button
              size="s"
              variant="secondary"
              prefixIcon="convert"
              disabled={!left && !right}
              onClick={() => {
                setLeft(right);
                setRight(left);
              }}
            >
              交换
            </Button>
            <Button
              size="s"
              variant="tertiary"
              onClick={() => {
                setLeft(SAMPLE_OLD);
                setRight(SAMPLE_NEW);
              }}
            >
              填入示例
            </Button>
            <Button
              size="s"
              variant="tertiary"
              prefixIcon="trash"
              disabled={!left && !right}
              onClick={() => {
                setLeft("");
                setRight("");
              }}
            >
              清空
            </Button>
          </>
        }
      >
        <div className={kit.grid2}>
          <TextArea
            label="原文本"
            mono
            rows={12}
            value={left}
            onChange={setLeft}
            placeholder="粘贴修改前的内容"
          />
          <TextArea
            label="新文本"
            mono
            rows={12}
            value={right}
            onChange={setRight}
            placeholder="粘贴修改后的内容"
          />
        </div>
        <div className={kit.row}>
          <span className={kit.label}>对比方式</span>
          <SegmentedControl
            selected={mode}
            onToggle={(value) => setMode(value as Mode)}
            buttons={MODES.map((item) => ({ value: item.value, label: item.label }))}
          />
        </div>
        <div className={kit.row}>
          <Check label="忽略大小写" checked={ignoreCase} onChange={setIgnoreCase} />
          {mode === "lines" && (
            <>
              <Check label="忽略行首尾空白" checked={ignoreTrim} onChange={setIgnoreTrim} />
              <Check label="折叠相同内容" checked={collapse} onChange={setCollapse} />
            </>
          )}
        </div>
      </Panel>

      <Panel title="对比结果">
        {result.kind === "empty" && (
          <div className={kit.empty}>在上面填入两段文本，差异会实时显示在这里</div>
        )}
        {result.kind === "tooLong" && (
          <div className={kit.empty}>
            文本太长（合计超过 20 万字），按字对比会很慢，请切换到“按行”对比。
          </div>
        )}
        {result.kind === "timeout" && (
          <div className={kit.empty}>差异太多，计算超时了。试试按行对比，或者把文本拆小一点。</div>
        )}
        {summary && (
          <div className={styles.summary} aria-live="polite">
            {summary}
          </div>
        )}
        {result.kind === "lines" && !identical && (
          <LineView changes={result.changes} collapse={collapse} />
        )}
        {result.kind === "inline" && !identical && <InlineView changes={result.changes} />}
      </Panel>
    </div>
  );
}

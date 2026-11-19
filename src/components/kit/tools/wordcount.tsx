"use client";

import { Button } from "@once-ui-system/core";
import { useDeferredValue, useMemo, useState } from "react";
import {
  collapseBlankLines,
  countText,
  formatReadingTime,
  toChinesePunctuation,
  toEnglishPunctuation,
  toHalfwidthAlnum,
  trimLines,
} from "@/lib/kit/wordcount";
import { CopyButton, kit, Panel, Stat, Stats, TextArea } from "../ui";

const SAMPLE = `夏天的海边, 风是咸的. 我们沿着沙滩走了很久, 看太阳一点点沉进海里!

  听说 the ocean covers about 71% of the Earth's surface, 可我只想记住今天这一小片蓝.   


ＡＩ 时代, 也别忘了抬头看看天空（２０２６年夏）.`;

const CLEANUPS: { label: string; run: (text: string) => string }[] = [
  { label: "英文标点→中文标点", run: toChinesePunctuation },
  { label: "中文标点→英文标点", run: toEnglishPunctuation },
  { label: "去除多余空行", run: collapseBlankLines },
  { label: "去除行首行尾空格", run: trimLines },
  { label: "全角字母数字→半角", run: toHalfwidthAlnum },
];

const format = (value: number) => value.toLocaleString("zh-CN");

export default function WordCountTool() {
  const [text, setText] = useState("");
  const [previous, setPrevious] = useState<string>();
  const [status, setStatus] = useState("");
  const deferred = useDeferredValue(text);
  const stats = useMemo(() => countText(deferred), [deferred]);

  const edit = (value: string) => {
    setText(value);
    setPrevious(undefined);
    setStatus("");
  };

  const cleanup = (label: string, run: (value: string) => string) => {
    const next = run(text);
    if (next === text) {
      setStatus(`${label}：没有需要处理的地方`);
      return;
    }
    setPrevious(text);
    setText(next);
    setStatus(`已完成：${label}`);
  };

  const undo = () => {
    if (previous === undefined) return;
    setText(previous);
    setPrevious(undefined);
    setStatus("已撤销上一次处理");
  };

  return (
    <div className={kit.stack}>
      <Panel
        title="文本"
        actions={
          <>
            <Button size="s" variant="tertiary" onClick={() => edit(SAMPLE)}>
              填入示例
            </Button>
            <CopyButton text={text} />
            <Button
              size="s"
              variant="secondary"
              prefixIcon="trash"
              disabled={!text}
              onClick={() => edit("")}
            >
              清空
            </Button>
          </>
        }
      >
        <TextArea
          label="在这里输入或粘贴文字"
          rows={12}
          value={text}
          onChange={edit}
          placeholder="统计结果会随着输入实时更新"
        />
        <div className={kit.stack}>
          <span className={kit.label}>一键整理</span>
          <div className={kit.row}>
            {CLEANUPS.map((item) => (
              <Button
                key={item.label}
                size="s"
                variant="secondary"
                disabled={!text}
                onClick={() => cleanup(item.label, item.run)}
              >
                {item.label}
              </Button>
            ))}
            {previous !== undefined && (
              <Button size="s" variant="tertiary" prefixIcon="refresh" onClick={undo}>
                撤销
              </Button>
            )}
          </div>
          <span className={kit.hint} aria-live="polite">
            {status || "英文句点只在汉字后面才会转成句号，小数点、时间和网址不受影响。"}
          </span>
        </div>
      </Panel>

      <Panel title="统计">
        <Stats>
          <Stat label="总字符（含空格）" value={format(stats.total)} />
          <Stat label="字符（不含空格）" value={format(stats.noSpaces)} />
          <Stat label="汉字" value={format(stats.hanzi)} />
          <Stat label="英文单词" value={format(stats.englishWords)} />
          <Stat label="数字（连续数字算一个）" value={format(stats.numbers)} />
          <Stat label="标点符号（中英文）" value={format(stats.punctuation)} />
          <Stat label="行数" value={format(stats.lines)} />
          <Stat label="段落数" value={format(stats.paragraphs)} />
          <Stat
            label="预计阅读时间"
            value={deferred.trim() ? formatReadingTime(stats.readingMinutes) : "—"}
          />
        </Stats>
        <span className={kit.hint}>
          总字符不计换行；段落按换行分隔，空行不算；阅读时间按中文每分钟约 400 字、英文每分钟约 200
          词估算。
        </span>
      </Panel>
    </div>
  );
}

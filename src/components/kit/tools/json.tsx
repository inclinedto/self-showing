"use client";

import { Button } from "@once-ui-system/core";
import { useState } from "react";
import { downloadBlob } from "@/lib/files";
import { findJsonProblem } from "@/lib/kit/json";
import { Check, CopyButton, ErrorText, kit, Panel, Select, TextArea } from "../ui";

type Indent = "2" | "4" | "tab";

const SAMPLE = '{"name":"角度偏爱","tags":["树洞","工具"],"summer":{"sun":true,"waves":3}}';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function describeError(error: unknown, source: string): string {
  const problem = error instanceof SyntaxError ? findJsonProblem(source) : null;
  if (problem) return `第 ${problem.line} 行第 ${problem.column} 列：${problem.message}`;
  return error instanceof Error ? error.message : String(error);
}

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string>();
  const [indent, setIndent] = useState<Indent>("2");
  const [sorted, setSorted] = useState(false);

  const run = (mode: "format" | "minify" | "escape" | "unescape") => {
    setError(undefined);
    const source = input.trim();
    if (!source) return setOutput("");
    try {
      if (mode === "escape") return setOutput(JSON.stringify(source));
      if (mode === "unescape") {
        const value = JSON.parse(source);
        if (typeof value !== "string") throw new Error("输入不是 JSON 字符串（需要用双引号包起来）");
        return setOutput(value);
      }
      const parsed = JSON.parse(source);
      const value = sorted ? sortKeys(parsed) : parsed;
      setOutput(mode === "minify" ? JSON.stringify(value) : JSON.stringify(value, null, indent === "tab" ? "\t" : Number(indent)));
    } catch (parseError) {
      setOutput("");
      setError(describeError(parseError, source));
    }
  };

  return (
    <div className={kit.grid2}>
      <Panel
        title="输入"
        actions={
          <Button size="s" variant="tertiary" onClick={() => setInput(SAMPLE)}>
            填入示例
          </Button>
        }
      >
        <TextArea
          label="JSON 文本"
          mono
          rows={16}
          value={input}
          onChange={setInput}
          placeholder='{"key": "value"}'
        />
        <div className={kit.row}>
          <Select
            label="缩进"
            value={indent}
            onChange={setIndent}
            options={[
              { value: "2", label: "2 个空格" },
              { value: "4", label: "4 个空格" },
              { value: "tab", label: "Tab" },
            ]}
          />
          <Check label="按键名排序" checked={sorted} onChange={setSorted} />
        </div>
        <div className={kit.row}>
          <Button size="s" variant="primary" onClick={() => run("format")} disabled={!input.trim()}>
            格式化
          </Button>
          <Button size="s" variant="secondary" onClick={() => run("minify")} disabled={!input.trim()}>
            压缩
          </Button>
          <Button size="s" variant="secondary" onClick={() => run("escape")} disabled={!input.trim()}>
            转成字符串
          </Button>
          <Button size="s" variant="secondary" onClick={() => run("unescape")} disabled={!input.trim()}>
            字符串还原
          </Button>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </Panel>

      <Panel
        title="结果"
        actions={
          <>
            <CopyButton text={output} />
            <Button
              size="s"
              variant="secondary"
              prefixIcon="download"
              disabled={!output}
              onClick={() => downloadBlob(new Blob([output], { type: "application/json" }), "formatted.json")}
            >
              下载
            </Button>
          </>
        }
      >
        <TextArea label="输出" mono rows={16} value={output} readOnly placeholder="结果会显示在这里" />
      </Panel>
    </div>
  );
}

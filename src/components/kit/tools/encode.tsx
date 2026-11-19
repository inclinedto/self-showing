"use client";

import { Button, SegmentedControl } from "@once-ui-system/core";
import { useDeferredValue, useMemo, useState } from "react";
import {
  type CodecKind,
  type CodecOptions,
  DEFAULT_OPTIONS,
  runCodec,
  unsupportedMorseChars,
} from "@/lib/kit/encode";
import { Check, CopyButton, ErrorText, kit, Panel, TextArea } from "../ui";

type Action = "encode" | "decode";

const KINDS: { value: CodecKind; label: string; sample: string; placeholder: string }[] = [
  {
    value: "base64",
    label: "Base64",
    sample: "角度偏爱 · 夏天的海",
    placeholder: "编码：输入任意文字；解码：粘贴 Base64，例如 5L2g5aW9",
  },
  {
    value: "url",
    label: "URL",
    sample: "https://example.com/搜索?q=夏天 海边&page=1",
    placeholder: "编码：输入网址或参数；解码：粘贴 %E4%BD%A0 这样的内容",
  },
  {
    value: "unicode",
    label: "Unicode",
    sample: "角度偏爱 Summer 🌊",
    placeholder: "编码：输入文字；解码：粘贴 \\u4f60\\u597d 或 \\u{1F600}",
  },
  {
    value: "html",
    label: "HTML 实体",
    sample: '<p class="tip">夏天 & 海边 "冲浪"</p>',
    placeholder: "编码：输入 HTML；解码：粘贴 &lt;p&gt; 或 &#x4F60; 这样的实体",
  },
  {
    value: "hex",
    label: "十六进制",
    sample: "你好, Summer",
    placeholder: "编码：输入文字；解码：粘贴 e4 bd a0 或 0xe4, 0xbd 这样的字节",
  },
  {
    value: "morse",
    label: "摩斯电码",
    sample: "SOS, SEE YOU AT THE BEACH 2026!",
    placeholder: "编码：输入英文、数字；解码：粘贴 ... --- ... 这样的电码",
  },
];

const MAX_LENGTH = 1_000_000;

export default function EncodeTool() {
  const [kind, setKind] = useState<CodecKind>("base64");
  const [input, setInput] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [options, setOptions] = useState<CodecOptions>(DEFAULT_OPTIONS);
  const deferred = useDeferredValue(input);
  const current = KINDS.find((item) => item.value === kind) ?? KINDS[0];

  const result = useMemo((): { output: string; error?: string } => {
    if (!action || !deferred) return { output: "" };
    if (deferred.length > MAX_LENGTH) {
      return { output: "", error: "内容太长了（超过 100 万字），请分段处理" };
    }
    try {
      return { output: runCodec(kind, action, deferred, options) };
    } catch (error) {
      return { output: "", error: error instanceof Error ? error.message : String(error) };
    }
  }, [kind, action, deferred, options]);

  const unsupported = useMemo(
    () => (kind === "morse" && action === "encode" ? unsupportedMorseChars(deferred) : []),
    [kind, action, deferred],
  );

  const setOption = (key: keyof CodecOptions) => (value: boolean) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const nothingDecoded =
    action === "decode" &&
    !result.error &&
    result.output === deferred &&
    (kind === "unicode" || kind === "html");

  return (
    <div className={kit.stack}>
      <SegmentedControl
        selected={kind}
        onToggle={(value) => {
          setKind(value as CodecKind);
          setAction(null);
        }}
        buttons={KINDS.map((item) => ({ value: item.value, label: item.label }))}
      />

      <div className={kit.grid2}>
        <Panel
          title="输入"
          actions={
            <>
              <Button
                size="s"
                variant="tertiary"
                onClick={() => {
                  setInput(current.sample);
                  setAction("encode");
                }}
              >
                填入示例
              </Button>
              <Button
                size="s"
                variant="tertiary"
                prefixIcon="trash"
                disabled={!input}
                onClick={() => {
                  setInput("");
                  setAction(null);
                }}
              >
                清空
              </Button>
            </>
          }
        >
          <TextArea
            label={`要转换的内容（${current.label}）`}
            mono
            rows={10}
            value={input}
            onChange={setInput}
            placeholder={current.placeholder}
          />
          <div className={kit.row}>
            {kind === "base64" && (
              <Check
                label="URL 安全（用 -_，不补 =）"
                checked={options.urlSafe}
                onChange={setOption("urlSafe")}
              />
            )}
            {kind === "url" && (
              <Check
                label="保留 URL 结构（encodeURI）"
                checked={options.keepStructure}
                onChange={setOption("keepStructure")}
              />
            )}
            {kind === "unicode" && (
              <Check
                label="全部字符都转义"
                checked={options.escapeAll}
                onChange={setOption("escapeAll")}
              />
            )}
            {kind === "html" && (
              <Check
                label="非 ASCII 字符也转成 &#x…;"
                checked={options.htmlNonAscii}
                onChange={setOption("htmlNonAscii")}
              />
            )}
            {kind === "hex" && (
              <>
                <Check
                  label="不加空格"
                  checked={options.hexNoSpace}
                  onChange={setOption("hexNoSpace")}
                />
                <Check label="大写" checked={options.hexUpper} onChange={setOption("hexUpper")} />
              </>
            )}
          </div>
          {kind === "base64" && (
            <span className={kit.hint}>
              按 UTF-8 编码，中文和表情都没问题；解码时标准和 URL 安全两种写法都能识别，缺少 =
              也没关系。
            </span>
          )}
          {kind === "morse" && (
            <span className={kit.hint}>
              摩斯电码只支持英文字母、数字和常用标点，不支持中文。字母之间用空格，单词之间用 /
              分隔。
            </span>
          )}
          <div className={kit.row}>
            <Button
              size="s"
              variant={action === "decode" ? "secondary" : "primary"}
              disabled={!input}
              onClick={() => setAction("encode")}
            >
              编码
            </Button>
            <Button
              size="s"
              variant={action === "decode" ? "primary" : "secondary"}
              disabled={!input}
              onClick={() => setAction("decode")}
            >
              解码
            </Button>
          </div>
          {result.error && <ErrorText>{result.error}</ErrorText>}
          {unsupported.length > 0 && (
            <span className={kit.hint}>
              这些字符无法用摩斯电码表示，已跳过：{unsupported.slice(0, 20).join(" ")}
              {unsupported.length > 20 ? " …" : ""}
            </span>
          )}
          {nothingDecoded && <span className={kit.hint}>没有找到需要解码的内容。</span>}
        </Panel>

        <Panel
          title="结果"
          actions={
            <>
              <CopyButton text={result.output} />
              <Button
                size="s"
                variant="secondary"
                disabled={!result.output}
                onClick={() => {
                  setInput(result.output);
                  setAction(null);
                }}
              >
                ⇅ 把结果作为输入
              </Button>
            </>
          }
        >
          <TextArea
            label={action === "decode" ? "解码结果" : "编码结果"}
            mono
            rows={10}
            value={result.output}
            readOnly
            placeholder="点“编码”或“解码”后，结果显示在这里；之后修改输入会实时更新"
          />
        </Panel>
      </div>
    </div>
  );
}

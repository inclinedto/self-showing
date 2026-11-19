"use client";

import { Button } from "@once-ui-system/core";
import { useDeferredValue, useMemo, useState } from "react";
import {
  baseName,
  bitLength,
  groupDigits,
  isValidBase,
  parseInteger,
  rangeHints,
  toBase,
} from "@/lib/kit/radix";
import {
  Check,
  ErrorText,
  kit,
  Panel,
  ResultRow,
  Results,
  Select,
  Stat,
  Stats,
  TextInput,
} from "../ui";

type BaseChoice = "2" | "8" | "10" | "16" | "32" | "36" | "custom";

const BASE_OPTIONS: { value: BaseChoice; label: string }[] = [
  { value: "2", label: "二进制（2）" },
  { value: "8", label: "八进制（8）" },
  { value: "10", label: "十进制（10）" },
  { value: "16", label: "十六进制（16）" },
  { value: "32", label: "三十二进制（32）" },
  { value: "36", label: "三十六进制（36）" },
  { value: "custom", label: "自定义（2–36）" },
];

const PLACEHOLDERS: Partial<Record<BaseChoice, string>> = {
  2: "例如 1011 0110",
  8: "例如 755",
  10: "例如 2026",
  16: "例如 0xFF 或 dead_beef",
};

const PREFIX_LABELS: Record<number, string> = { 2: "0b", 8: "0o", 16: "0x" };

export default function RadixTool() {
  const [input, setInput] = useState("255");
  const [choice, setChoice] = useState<BaseChoice>("10");
  const [customBase, setCustomBase] = useState("7");
  const [outBase, setOutBase] = useState("7");
  const [upper, setUpper] = useState(false);

  const deferredInput = useDeferredValue(input);
  const base = choice === "custom" ? Number(customBase) : Number(choice);
  const parsed = useMemo(() => parseInteger(deferredInput, base), [deferredInput, base]);
  const value = parsed?.ok ? parsed.value : null;
  const outBaseNumber = Number(outBase);
  const outBaseValid = isValidBase(outBaseNumber);

  const rows = useMemo(() => {
    if (value === null) return [];
    const binary = toBase(value, 2);
    const decimal = toBase(value, 10);
    return [
      { label: "二进制", value: binary },
      { label: "二进制（4 位一组）", value: groupDigits(binary, 4, " ", true) },
      { label: "八进制", value: toBase(value, 8) },
      { label: "十进制", value: decimal },
      { label: "十进制（千分位）", value: groupDigits(decimal, 3, ",") },
      { label: "十六进制", value: toBase(value, 16, upper) },
      { label: "三十六进制", value: toBase(value, 36) },
    ];
  }, [value, upper]);

  const hints = useMemo(() => (value === null ? [] : rangeHints(value)), [value]);

  const loadSample = () => {
    setChoice("10");
    setInput("18,446,744,073,709,551,616");
  };

  return (
    <div className={kit.stack}>
      <Panel
        title="输入"
        actions={
          <Button size="s" variant="tertiary" onClick={loadSample}>
            填入示例
          </Button>
        }
      >
        <div className={choice === "custom" ? kit.grid3 : kit.grid2}>
          <TextInput
            label="数值"
            mono
            value={input}
            onChange={setInput}
            placeholder={PLACEHOLDERS[choice] ?? "输入一个整数"}
            hint="可以带负号和 0b / 0o / 0x 前缀，空格、下划线、逗号会被忽略"
          />
          <Select label="输入进制" value={choice} onChange={setChoice} options={BASE_OPTIONS} />
          {choice === "custom" && (
            <TextInput
              label="自定义进制"
              type="number"
              inputMode="numeric"
              min={2}
              max={36}
              step={1}
              value={customBase}
              onChange={setCustomBase}
              hint="2 到 36，超过 10 的数字用 a-z 表示"
            />
          )}
        </div>
        {parsed && !parsed.ok && <ErrorText>{parsed.error}</ErrorText>}
        {parsed?.ok && parsed.prefixBase && (
          <span className={kit.hint}>
            检测到 {PREFIX_LABELS[parsed.prefixBase]} 前缀，已按{baseName(parsed.prefixBase)}解析
          </span>
        )}
      </Panel>

      <Panel
        title="结果"
        actions={<Check label="十六进制大写" checked={upper} onChange={setUpper} />}
      >
        {value === null ? (
          !parsed && <p className={kit.empty}>输入一个整数，马上换算成各种进制</p>
        ) : (
          <>
            <Stats>
              <Stat label="二进制位数（bit）" value={bitLength(value)} />
              <Stat label="十进制位数" value={toBase(value < 0 ? -value : value, 10).length} />
            </Stats>
            {hints.map((hint) => (
              <span key={hint} className={kit.hint}>
                {hint}
              </span>
            ))}
            <div className={kit.grid2}>
              <TextInput
                label="自定义输出进制"
                type="number"
                inputMode="numeric"
                min={2}
                max={36}
                step={1}
                value={outBase}
                onChange={setOutBase}
                hint="填 2 到 36，结果在下面最后一行"
              />
            </div>
            {!outBaseValid && <ErrorText>输出进制必须是 2 到 36 之间的整数</ErrorText>}
            <Results>
              {rows.map((row) => (
                <ResultRow key={row.label} label={row.label} value={row.value} />
              ))}
              <ResultRow
                label={`${outBaseValid ? baseName(outBaseNumber) : "自定义进制"}输出`}
                value={outBaseValid ? toBase(value, outBaseNumber) : ""}
              />
            </Results>
          </>
        )}
      </Panel>
    </div>
  );
}

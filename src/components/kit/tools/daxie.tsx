"use client";

import { Button } from "@once-ui-system/core";
import { useMemo, useState } from "react";
import {
  MAX_INTEGER_DIGITS,
  parseAmount,
  toChineseLower,
  toPlain,
  toRmbUpper,
  toThousands,
} from "@/lib/kit/daxie";
import { ErrorText, kit, Panel, ResultRow, Results, TextInput } from "../ui";
import styles from "./daxie.module.scss";

const EXAMPLES = ["12345.67", "1005", "1000000.05", "1010.1", "-12.3"];

const CHART: [string, string][] = [
  ["零", "0"],
  ["壹", "1"],
  ["贰", "2"],
  ["叁", "3"],
  ["肆", "4"],
  ["伍", "5"],
  ["陆", "6"],
  ["柒", "7"],
  ["捌", "8"],
  ["玖", "9"],
  ["拾", "十"],
  ["佰", "百"],
  ["仟", "千"],
  ["万", "万"],
  ["亿", "亿"],
  ["元", "元"],
  ["角", "0.1 元"],
  ["分", "0.01 元"],
  ["整", "到元为止"],
];

export default function DaxieTool() {
  const [input, setInput] = useState("");
  const result = useMemo(() => parseAmount(input), [input]);
  const amount = result.kind === "ok" ? result.amount : undefined;
  const upper = amount ? toRmbUpper(amount) : "";

  return (
    <div className={kit.stack}>
      <Panel title="输入金额">
        <TextInput
          label="金额（元）"
          mono
          inputMode="decimal"
          autoComplete="off"
          value={input}
          onChange={setInput}
          placeholder="例如 12345.67"
          hint={`支持千分位逗号、空格、¥ 符号和负数，整数部分最多 ${MAX_INTEGER_DIGITS} 位（到万亿）`}
        />
        <div className={kit.row}>
          <span className={kit.hint}>试试：</span>
          {EXAMPLES.map((example) => (
            <Button key={example} size="s" variant="tertiary" onClick={() => setInput(example)}>
              {example}
            </Button>
          ))}
        </div>
        {result.kind === "error" && <ErrorText>{result.message}</ErrorText>}
        {amount?.rounded && (
          <span className={kit.hint}>小数超过两位，已按四舍五入保留到分：{toPlain(amount)}</span>
        )}
      </Panel>

      <Panel title="转换结果">
        {amount ? (
          <>
            <p className={styles.big} aria-live="polite">
              {upper}
            </p>
            <Results>
              <ResultRow label="人民币大写" value={upper} />
              <ResultRow label="中文小写" value={toChineseLower(amount)} />
              <ResultRow label="千分位" value={toThousands(amount)} />
              <ResultRow label="金额（元）" value={toPlain(amount)} />
            </Results>
          </>
        ) : (
          <div className={kit.empty}>输入金额后，大写结果会实时显示在这里</div>
        )}
        <span className={kit.hint}>
          按《支付结算办法》书写：到元为止的写“整”，到角为止的不写，有分的不写；中间连续的 0
          只写一个“零”。填支票、发票时，大写金额前要写“人民币”，两者之间不留空白。
        </span>
      </Panel>

      <Panel title="大写数字对照">
        <div className={styles.chart}>
          {CHART.map(([upperChar, lower]) => (
            <div key={upperChar} className={styles.cell}>
              <span className={styles.upper}>{upperChar}</span>
              <span className={styles.lower}>{lower}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

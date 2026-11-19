"use client";

import { IconButton, SegmentedControl } from "@once-ui-system/core";
import { useState } from "react";
import {
  CATEGORIES,
  convert,
  formatNumber,
  getUnits,
  isBelowAbsoluteZero,
  parseNumber,
  type UnitCategory,
} from "@/lib/kit/unit";
import { Check, ErrorText, kit, Panel, Select, TextInput, useCopy } from "../ui";

const NOTES: Record<UnitCategory, string> = {
  length: "1 丈 = 10 尺，1 尺 = 10 寸，1 市尺 = 1/3 米；1 市里 = 500 米。",
  mass: "1 斤 = 10 两 = 500 克，1 两 = 10 钱；1 公斤 = 2 斤。",
  area: "1 亩 = 10000/15 平方米 ≈ 666.67 平方米，15 亩 = 1 公顷。",
  volume: "这里的“杯”按公制量杯 250 毫升计算；美制和英制加仑不一样大。",
  temperature: "温度不是按倍数换算的：℉ = ℃ × 9/5 + 32，K = ℃ + 273.15。",
  data: "硬盘厂商按 1000 算，系统按 1024 算，所以 1 TB 硬盘在电脑里只显示约 931 GB。",
  speed: "马赫按海平面声速约 340.3 米/秒估算，实际随温度和高度变化。",
};

function UnitRow({
  label,
  value,
  current,
  grouping,
}: {
  label: string;
  value: number;
  current: boolean;
  grouping: boolean;
}) {
  const copy = useCopy();
  const plain = formatNumber(value);
  return (
    <div
      className={kit.result}
      style={current ? { background: "var(--brand-alpha-weak)" } : undefined}
    >
      <span className={kit.resultLabel}>
        {label}
        {current && "（输入）"}
      </span>
      <span className={kit.resultValue}>{formatNumber(value, grouping)}</span>
      <IconButton
        icon="clipboard"
        size="s"
        variant="tertiary"
        tooltip="复制数字"
        aria-label={`复制${label}的数值`}
        disabled={plain === "—"}
        onClick={() => copy(plain)}
      />
    </div>
  );
}

export default function UnitTool() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [input, setInput] = useState("1");
  const [from, setFrom] = useState("m");
  const [binary, setBinary] = useState(true);
  const [grouping, setGrouping] = useState(true);

  const units = getUnits(category, binary);
  const value = parseNumber(input);
  const belowZero =
    category === "temperature" && value !== null && isBelowAbsoluteZero(value, from);

  const switchCategory = (next: UnitCategory) => {
    setCategory(next);
    setFrom(CATEGORIES.find((item) => item.id === next)?.base ?? getUnits(next)[0].id);
  };

  return (
    <div className={kit.stack}>
      <SegmentedControl
        selected={category}
        onToggle={(next) => switchCategory(next as UnitCategory)}
        buttons={CATEGORIES.map((item) => ({ value: item.id, label: item.label }))}
      />
      <Panel title="输入">
        <div className={kit.grid2}>
          <TextInput
            label="数值"
            inputMode="decimal"
            value={input}
            onChange={setInput}
            placeholder="例如 1.5"
            maxLength={40}
          />
          <Select
            label="单位"
            value={from}
            onChange={setFrom}
            options={units.map((unit) => ({ value: unit.id, label: unit.label }))}
          />
        </div>
        <div className={kit.row}>
          {category === "data" && (
            <Select
              label="进率"
              value={binary ? "1024" : "1000"}
              onChange={(next) => setBinary(next === "1024")}
              options={[
                { value: "1024", label: "1024（二进制，系统显示）" },
                { value: "1000", label: "1000（十进制，厂商标注）" },
              ]}
            />
          )}
          <Check label="千分位分隔" checked={grouping} onChange={setGrouping} />
        </div>
        <p className={kit.hint}>{NOTES[category]}</p>
      </Panel>

      <Panel title="换算结果">
        {value === null ? (
          <ErrorText>{input.trim() ? "请输入有效的数字" : "输入一个数字开始换算"}</ErrorText>
        ) : (
          <>
            {belowZero && (
              <ErrorText>低于绝对零度（-273.15 ℃），现实中不存在这样的温度。</ErrorText>
            )}
            <div className={kit.results} aria-live="polite">
              {units.map((unit) => (
                <UnitRow
                  key={unit.id}
                  label={unit.label}
                  value={convert(value, from, unit.id, category, binary)}
                  current={unit.id === from}
                  grouping={grouping}
                />
              ))}
            </div>
            <p className={kit.hint}>结果保留最多 10 位有效数字，点复制按钮只复制数字本身。</p>
          </>
        )}
      </Panel>
    </div>
  );
}

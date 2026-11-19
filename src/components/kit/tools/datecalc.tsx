"use client";

import { Button, SegmentedControl } from "@once-ui-system/core";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  beijingToday,
  type DateDiff,
  dayOfYear,
  daysBetween,
  diffDates,
  formatChinese,
  formatYmd,
  monthsAndDays,
  parseYmd,
  type ShiftUnit,
  shiftDate,
  upcomingFestivals,
  WEEKDAYS,
  weekday,
  type Ymd,
} from "@/lib/kit/datecalc";
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

type Mode = "diff" | "shift" | "countdown";

const UNITS: { value: ShiftUnit; label: string }[] = [
  { value: "day", label: "天" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
];

const describe = (date: Ymd) => `${formatChinese(date)}（${WEEKDAYS[weekday(date)]}）`;

function computeShift(
  base: Ymd | null,
  amount: string,
  unit: ShiftUnit,
): { result?: Ymd; error?: string } {
  if (!base) return { error: "请选择起始日期" };
  const value = Number(amount.trim());
  if (amount.trim() === "" || !Number.isInteger(value))
    return { error: "请输入整数，往前推可以填负数" };
  if (Math.abs(value) > 1_000_000) return { error: "数字太大了，换小一点的吧" };
  const result = shiftDate(base, value, unit);
  if (result.y < 1 || result.y > 9999) return { error: "结果超出了可计算的年份范围（1–9999 年）" };
  return { result };
}

function DateInput({
  label,
  value,
  onChange,
}: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      label={label}
      type="date"
      value={value}
      onChange={onChange}
      min="1900-01-01"
      max="2999-12-31"
    />
  );
}

function DiffResult({ start, end, diff }: { start: Ymd; end: Ymd; diff: DateDiff }) {
  const span = Math.abs(diff.days);
  return (
    <>
      <p className={kit.hint} aria-live="polite">
        从 {describe(start)} 到 {describe(end)}，
        {diff.days < 0 ? `结束日期早于开始日期 ${span} 天` : `相差 ${span} 天`}。
      </p>
      <Stats>
        <Stat label="相差天数" value={`${diff.days} 天`} />
        <Stat
          label="折合周数"
          value={diff.weekDays ? `${diff.weeks} 周 ${diff.weekDays} 天` : `${diff.weeks} 周`}
        />
        <Stat
          label="折合月数"
          value={
            diff.monthDays ? `${diff.months} 个月 ${diff.monthDays} 天` : `${diff.months} 个月`
          }
        />
        <Stat label="工作日（周一至周五）" value={`${diff.workdays} 天`} />
      </Stats>
      <p className={kit.hint}>
        工作日只按周一到周五算，未计入法定节假日和调休。不勾选“包含结束当天”时，从开始日算起、不含结束日。
      </p>
    </>
  );
}

/** The page is statically generated, so "today" must be read on the client, never baked in at build time. */
export default function DateCalcTool() {
  const [today, setToday] = useState<Ymd | null>(null);
  useEffect(() => setToday(beijingToday()), []);
  return today ? <DateCalc today={today} /> : <p className={kit.empty}>正在读取今天的日期…</p>;
}

function DateCalc({ today }: { today: Ymd }) {
  const [mode, setMode] = useState<Mode>("diff");
  const [start, setStart] = useState(() => formatYmd(today));
  const [end, setEnd] = useState(() => formatYmd(addDays(today, 30)));
  const [inclusive, setInclusive] = useState(false);
  const [base, setBase] = useState(() => formatYmd(today));
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<ShiftUnit>("day");
  const [target, setTarget] = useState(() => formatYmd(upcomingFestivals(today)[0].date));
  const [targetName, setTargetName] = useState(() => upcomingFestivals(today)[0].name);

  const festivals = useMemo(() => upcomingFestivals(today), [today]);
  const startDate = parseYmd(start);
  const endDate = parseYmd(end);
  const baseDate = parseYmd(base);
  const targetDate = parseYmd(target);

  const shifted = computeShift(baseDate, amount, unit);

  return (
    <div className={kit.stack}>
      <SegmentedControl
        selected={mode}
        onToggle={(value) => setMode(value as Mode)}
        buttons={[
          { value: "diff", label: "相差天数" },
          { value: "shift", label: "日期推算" },
          { value: "countdown", label: "倒数日" },
        ]}
      />

      {mode === "diff" && (
        <Panel
          title="两个日期相差多少天"
          actions={
            <Button
              size="s"
              variant="tertiary"
              prefixIcon="convert"
              onClick={() => {
                setStart(end);
                setEnd(start);
              }}
            >
              交换
            </Button>
          }
        >
          <div className={kit.grid2}>
            <DateInput label="开始日期" value={start} onChange={setStart} />
            <DateInput label="结束日期" value={end} onChange={setEnd} />
          </div>
          <Check label="包含结束当天" checked={inclusive} onChange={setInclusive} />
          {startDate && endDate ? (
            <DiffResult
              start={startDate}
              end={endDate}
              diff={diffDates(startDate, endDate, inclusive)}
            />
          ) : (
            <ErrorText>请选择完整的开始和结束日期</ErrorText>
          )}
        </Panel>
      )}

      {mode === "shift" && (
        <Panel title="从某天往前或往后推">
          <div className={kit.grid3}>
            <DateInput label="起始日期" value={base} onChange={setBase} />
            <TextInput
              label="数量"
              type="number"
              step={1}
              value={amount}
              onChange={setAmount}
              hint="负数表示往前推"
            />
            <Select label="单位" value={unit} onChange={setUnit} options={UNITS} />
          </div>
          <div className={kit.row}>
            {[7, 30, 100, -30].map((days) => (
              <Button
                key={days}
                size="s"
                variant="secondary"
                onClick={() => {
                  setAmount(String(days));
                  setUnit("day");
                }}
              >
                {days > 0 ? `${days} 天后` : `${-days} 天前`}
              </Button>
            ))}
          </div>
          {shifted.result ? (
            <>
              <Stats>
                <Stat label={WEEKDAYS[weekday(shifted.result)]} value={formatYmd(shifted.result)} />
                <Stat
                  label={`是 ${shifted.result.y} 年的第几天`}
                  value={`第 ${dayOfYear(shifted.result)} 天`}
                />
              </Stats>
              <Results>
                <ResultRow label="结果日期" value={describe(shifted.result)} />
              </Results>
              {unit !== "day" && unit !== "week" && (
                <p className={kit.hint}>
                  按月或按年推算时，如果目标月份没有这一天，就取当月最后一天（例如 1 月 31 日加 1
                  个月是 2 月 28 日或 29 日）。
                </p>
              )}
            </>
          ) : (
            <ErrorText>{shifted.error}</ErrorText>
          )}
        </Panel>
      )}

      {mode === "countdown" && (
        <Panel title="倒数日">
          <div className={kit.grid2}>
            <DateInput label="目标日期" value={target} onChange={setTarget} />
            <TextInput
              label="事件名称（选填）"
              value={targetName}
              onChange={setTargetName}
              placeholder="例如：放暑假"
              maxLength={30}
            />
          </div>
          <div className={kit.row}>
            {festivals.map((festival) => (
              <Button
                key={festival.name}
                size="s"
                variant={
                  targetName === festival.name && target === formatYmd(festival.date)
                    ? "primary"
                    : "secondary"
                }
                onClick={() => {
                  setTarget(formatYmd(festival.date));
                  setTargetName(festival.name);
                }}
              >
                {festival.name} · {festival.daysLeft === 0 ? "今天" : `${festival.daysLeft} 天`}
              </Button>
            ))}
          </div>
          {targetDate ? (
            <Countdown today={today} target={targetDate} name={targetName.trim()} />
          ) : (
            <ErrorText>请选择目标日期</ErrorText>
          )}
          <p className={kit.hint}>
            “今天”按北京时间算，今天是 {describe(today)}
            。七夕、中秋、春节是农历节日，暂不提供快捷按钮。
          </p>
        </Panel>
      )}
    </div>
  );
}

function Countdown({ today, target, name }: { today: Ymd; target: Ymd; name: string }) {
  const days = daysBetween(today, target);
  const label = name || "目标日";
  const span = days >= 0 ? monthsAndDays(today, target) : monthsAndDays(target, today);
  const sentence =
    days === 0
      ? `今天就是${label}`
      : days > 0
        ? `距离 ${label} 还有 ${days} 天`
        : `${label} 已经过去 ${-days} 天`;
  return (
    <>
      <Stats>
        <Stat
          label={days === 0 ? "就是今天" : days > 0 ? `距离${label}还有` : `${label}已经过去`}
          value={`${Math.abs(days)} 天`}
        />
        <Stat
          label="约合"
          value={span.days ? `${span.months} 个月 ${span.days} 天` : `${span.months} 个月`}
        />
      </Stats>
      <Results>
        <ResultRow label="一句话" value={`${sentence}（${describe(target)}）`} />
      </Results>
    </>
  );
}

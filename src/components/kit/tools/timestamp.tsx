"use client";

import { Button } from "@once-ui-system/core";
import { useEffect, useMemo, useState } from "react";
import {
  beijingDateTime,
  beijingWithWeekday,
  dayOfYear,
  isoBeijing,
  isoWeek,
  parseDateTime,
  parseTimestamp,
  relativeTime,
  toDatetimeLocal,
  UNIT_LABELS,
  utcDateTime,
} from "@/lib/kit/timestamp";
import {
  CopyButton,
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

type Force = "auto" | "s" | "ms";

const FORCE_OPTIONS: { value: Force; label: string }[] = [
  { value: "auto", label: "自动识别" },
  { value: "s", label: "秒" },
  { value: "ms", label: "毫秒" },
];

export default function TimestampTool() {
  const [clock, setClock] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  const [tsInput, setTsInput] = useState("");
  const [force, setForce] = useState<Force>("auto");
  const [dateText, setDateText] = useState("");

  useEffect(() => {
    const start = Date.now();
    setClock(start);
    setTsInput(String(Math.floor(start / 1000)));
    setDateText(beijingDateTime(start));
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const shown = frozen ?? clock;
  const paused = frozen !== null;

  const parsedTs = useMemo(() => parseTimestamp(tsInput, force), [tsInput, force]);
  const parsedDate = useMemo(() => parseDateTime(dateText), [dateText]);

  const tsRows = useMemo(() => {
    if (!parsedTs?.ok) return null;
    const { ms } = parsedTs;
    const week = isoWeek(ms);
    return [
      { label: "北京时间", value: beijingWithWeekday(ms) },
      { label: "UTC 时间", value: utcDateTime(ms) },
      { label: "ISO 8601", value: isoBeijing(ms) },
      { label: "相对现在", value: clock === null ? "" : relativeTime(ms, clock) },
      { label: "当年第几天", value: `第 ${dayOfYear(ms)} 天` },
      { label: "第几周（ISO）", value: `${week.year} 年第 ${week.week} 周` },
    ];
  }, [parsedTs, clock]);

  const nowSeconds = shown === null ? "—" : String(Math.floor(shown / 1000));
  const nowMillis = shown === null ? "—" : String(shown);

  const fillNowTs = () => {
    const now = Date.now();
    setTsInput(force === "ms" ? String(now) : String(Math.floor(now / 1000)));
  };

  return (
    <div className={kit.stack}>
      <Panel
        title="现在"
        actions={
          <>
            <Button
              size="s"
              variant="secondary"
              disabled={clock === null}
              onClick={() => setFrozen(paused ? null : clock)}
            >
              {paused ? "继续" : "暂停"}
            </Button>
            <CopyButton text={shown === null ? "" : nowSeconds} label="复制秒" />
            <CopyButton text={shown === null ? "" : nowMillis} label="复制毫秒" />
          </>
        }
      >
        <Stats min={220}>
          <Stat label="秒（10 位）" value={nowSeconds} />
          <Stat label="毫秒（13 位）" value={nowMillis} />
        </Stats>
        <span className={kit.hint}>
          {shown === null ? "正在读取时间…" : `北京时间 ${beijingWithWeekday(shown)}`}
          {paused && "（已暂停）"}
        </span>
      </Panel>

      <div className={kit.grid2}>
        <Panel
          title="时间戳 → 时间"
          actions={
            <Button size="s" variant="tertiary" onClick={fillNowTs}>
              用当前时间
            </Button>
          }
        >
          <div className={kit.grid2}>
            <TextInput
              label="时间戳"
              mono
              inputMode="numeric"
              value={tsInput}
              onChange={setTsInput}
              placeholder="例如 1795073400"
              hint={
                parsedTs?.ok
                  ? `${force === "auto" ? "自动识别为" : "按"}${UNIT_LABELS[parsedTs.unit]}${force === "auto" ? "" : "换算"}（${parsedTs.digits} 位）`
                  : "10 位是秒，13 位是毫秒，16 位微秒，19 位纳秒"
              }
            />
            <Select label="单位" value={force} onChange={setForce} options={FORCE_OPTIONS} />
          </div>
          {parsedTs && !parsedTs.ok && <ErrorText>{parsedTs.error}</ErrorText>}
          {tsRows ? (
            <Results>
              {tsRows.map((row) => (
                <ResultRow key={row.label} label={row.label} value={row.value} />
              ))}
            </Results>
          ) : (
            !parsedTs && <p className={kit.empty}>输入时间戳，马上换算成北京时间</p>
          )}
        </Panel>

        <Panel
          title="时间 → 时间戳"
          actions={
            <Button
              size="s"
              variant="tertiary"
              onClick={() => setDateText(beijingDateTime(Date.now()))}
            >
              用当前时间
            </Button>
          }
        >
          <TextInput
            label="选择时间"
            type="datetime-local"
            step={1}
            value={parsedDate?.ok ? toDatetimeLocal(parsedDate.ms) : ""}
            onChange={(value) => setDateText(value ? value.replace("T", " ") : "")}
            hint="按北京时间（UTC+8）理解，和你电脑设置的时区无关"
          />
          <TextInput
            label="或者直接输入"
            mono
            value={dateText}
            onChange={setDateText}
            placeholder="2026-11-19 15:30:00"
            hint="支持 2026-11-19 15:30:00、2026/11/19 15:30、2026年11月19日 15时30分，以及带时区的 ISO 格式（如 2026-11-19T07:30:00Z）；不写时区就按北京时间"
          />
          {parsedDate && !parsedDate.ok && <ErrorText>{parsedDate.error}</ErrorText>}
          {parsedDate?.ok ? (
            <Results>
              <ResultRow label="秒" value={String(Math.floor(parsedDate.ms / 1000))} />
              <ResultRow label="毫秒" value={String(parsedDate.ms)} />
              <ResultRow
                label={parsedDate.explicitOffset ? "换算成北京时间" : "北京时间"}
                value={beijingWithWeekday(parsedDate.ms)}
              />
            </Results>
          ) : (
            !parsedDate && <p className={kit.empty}>选一个时间，或者把时间文字粘贴进来</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

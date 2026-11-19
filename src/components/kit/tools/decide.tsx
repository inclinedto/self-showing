"use client";

import { Button, SegmentedControl } from "@once-ui-system/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  checkDraw,
  cryptoSource,
  drawNumbers,
  flipCoin,
  parseOptions,
  pickOption,
  type RandomSource,
  randomBelow,
  rollDice,
} from "@/lib/kit/decide";
import {
  Check,
  CopyButton,
  ErrorText,
  kit,
  Panel,
  Range,
  Stat,
  Stats,
  TextArea,
  TextInput,
} from "../ui";
import styles from "./decide.module.scss";

type Mode = "food" | "coin" | "dice" | "number";

const STORAGE_KEY = "kit-decide-foods";
const DEFAULT_FOODS = [
  "黄焖鸡米饭",
  "麻辣烫",
  "兰州拉面",
  "螺蛳粉",
  "沙县小吃",
  "酸菜鱼",
  "寿司",
  "汉堡",
  "凉皮肉夹馍",
  "煲仔饭",
  "椰子鸡",
  "冰粉配烧烤",
  "麻辣香锅",
  "猪脚饭",
  "重庆小面",
  "过桥米线",
  "饺子",
  "盖浇饭",
  "火锅",
  "牛肉粉",
  "酸辣粉",
  "轻食沙拉",
  "炸鸡",
  "生煎包",
].join("\n");

/** 3×3 cells, row-major, that carry a pip for each face. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

let source: RandomSource | undefined;
function rng(): RandomSource {
  if (!source) source = cryptoSource();
  return source;
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function FoodPicker() {
  const [text, setText] = useState(DEFAULT_FOODS);
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState<string>();
  const [rolling, setRolling] = useState(false);
  const [avoidRecent, setAvoidRecent] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const timers = useRef<number[]>([]);
  const options = useMemo(() => parseOptions(text), [text]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setText(saved);
    } catch {
      // Storage can be blocked (private mode); the default list still works.
    }
    setLoaded(true);
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (text === DEFAULT_FOODS) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, text.slice(0, 20000));
    } catch {
      // Not saving is fine.
    }
  }, [text, loaded]);

  const start = () => {
    const pick = pickOption(options, avoidRecent ? history.slice(0, 3) : [], rng());
    if (!pick || rolling) return;
    const finish = () => {
      setRolling(false);
      setShown(pick);
      setHistory((previous) => [pick, ...previous].slice(0, 10));
    };
    if (options.length < 2 || reducedMotion()) return finish();
    setRolling(true);
    const interval = window.setInterval(
      () => setShown(options[randomBelow(options.length, rng())]),
      70,
    );
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      finish();
    }, 1200);
    timers.current = [interval, timeout];
  };

  return (
    <div className={kit.grid2}>
      <Panel title="今天吃什么">
        <div className={styles.card} aria-live="polite" aria-busy={rolling}>
          <span className={styles.cardLabel}>
            {rolling ? "正在挑选…" : shown ? "今天就吃" : "还没想好？"}
          </span>
          {shown ? (
            <span className={styles.cardValue}>{shown}</span>
          ) : (
            <span className={styles.cardPlaceholder}>🍜 点“开始”，交给运气决定</span>
          )}
        </div>
        <div className={kit.row}>
          <Button
            variant="primary"
            prefixIcon="sparkles"
            onClick={start}
            disabled={rolling || options.length === 0}
          >
            {shown ? "再来一次" : "开始"}
          </Button>
          <Check label="排除最近 3 次的结果" checked={avoidRecent} onChange={setAvoidRecent} />
        </div>
        {options.length === 0 && <ErrorText>候选列表是空的，先写几个想吃的吧</ErrorText>}
        {history.length > 0 && (
          <p className={kit.hint}>最近抽到：{history.slice(0, 5).join("、")}</p>
        )}
      </Panel>
      <Panel
        title="候选列表"
        actions={
          <Button
            size="s"
            variant="tertiary"
            prefixIcon="refresh"
            onClick={() => setText(DEFAULT_FOODS)}
          >
            恢复默认
          </Button>
        }
      >
        <TextArea
          label="一行一个"
          rows={12}
          value={text}
          onChange={setText}
          hint={`共 ${options.length} 个，自动保存在这台设备的浏览器里`}
        />
      </Panel>
    </div>
  );
}

function CoinFlip() {
  const [rotation, setRotation] = useState(0);
  const [heads, setHeads] = useState<boolean>();
  const [flipping, setFlipping] = useState(false);
  const [counts, setCounts] = useState({ heads: 0, tails: 0 });
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flip = () => {
    if (flipping) return;
    const result = flipCoin(rng());
    setRotation((previous) => previous - (previous % 360) + 1440 + (result ? 0 : 180));
    const done = () => {
      setFlipping(false);
      setHeads(result);
      setCounts((previous) =>
        result
          ? { ...previous, heads: previous.heads + 1 }
          : { ...previous, tails: previous.tails + 1 },
      );
    };
    if (reducedMotion()) return done();
    setFlipping(true);
    timer.current = window.setTimeout(done, 900);
  };

  return (
    <Panel title="抛硬币">
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.coin} style={{ transform: `rotateY(${rotation}deg)` }}>
          <span className={`${styles.face} ${styles.front}`}>正</span>
          <span className={`${styles.face} ${styles.back}`}>反</span>
        </div>
      </div>
      <p className={styles.verdict} aria-live="polite">
        {flipping
          ? "硬币飞起来了…"
          : heads === undefined
            ? "准备好了就抛一次"
            : heads
              ? "正面"
              : "反面"}
      </p>
      <div className={kit.row} style={{ justifyContent: "center" }}>
        <Button variant="primary" onClick={flip} disabled={flipping}>
          抛硬币
        </Button>
        <Button
          variant="tertiary"
          prefixIcon="refresh"
          disabled={flipping || counts.heads + counts.tails === 0}
          onClick={() => {
            setCounts({ heads: 0, tails: 0 });
            setHeads(undefined);
          }}
        >
          清零
        </Button>
      </div>
      <Stats>
        <Stat label="正面" value={`${counts.heads} 次`} />
        <Stat label="反面" value={`${counts.tails} 次`} />
        <Stat label="一共" value={`${counts.heads + counts.tails} 次`} />
      </Stats>
    </Panel>
  );
}

function DiceRoller() {
  const [count, setCount] = useState(2);
  const [faces, setFaces] = useState<{ id: string; value: number }[]>([]);

  const roll = () => {
    const stamp = Date.now();
    setFaces(rollDice(count, rng()).map((value, index) => ({ id: `${stamp}-${index}`, value })));
  };
  const sum = faces.reduce((total, face) => total + face.value, 0);

  return (
    <Panel title="掷骰子">
      <Range label="骰子数量" value={count} onChange={setCount} min={1} max={6} suffix=" 个" />
      <Button variant="primary" prefixIcon="dice" onClick={roll}>
        掷骰子
      </Button>
      {faces.length > 0 ? (
        <>
          <div className={styles.dice} aria-hidden="true">
            {faces.map((face) => (
              <div key={face.id} className={styles.die}>
                {CELLS.map((cell) => (
                  <span
                    key={cell}
                    className={
                      PIPS[face.value].includes(cell)
                        ? `${styles.pip} ${face.value === 1 || face.value === 4 ? styles.pipRed : ""}`
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
          <p className={styles.verdict} aria-live="polite">
            {faces.length > 1
              ? `${faces.map((face) => face.value).join(" + ")} = ${sum}`
              : `${sum} 点`}
          </p>
        </>
      ) : (
        <p className={kit.empty}>选好数量，点“掷骰子”</p>
      )}
    </Panel>
  );
}

function NumberDraw() {
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [count, setCount] = useState("1");
  const [unique, setUnique] = useState(true);
  const [sorted, setSorted] = useState(false);
  const [numbers, setNumbers] = useState<{ id: number; value: number }[]>([]);
  const check = checkDraw({ min, max, count, unique });
  const shown = sorted ? [...numbers].sort((a, b) => a.value - b.value) : numbers;

  return (
    <Panel title="随机数">
      <div className={kit.grid3}>
        <TextInput label="最小值" type="number" step={1} value={min} onChange={setMin} />
        <TextInput label="最大值" type="number" step={1} value={max} onChange={setMax} />
        <TextInput
          label="数量"
          type="number"
          min={1}
          max={1000}
          step={1}
          value={count}
          onChange={setCount}
        />
      </div>
      <div className={kit.row}>
        <Check label="不重复" checked={unique} onChange={setUnique} />
        <Check label="结果从小到大排序" checked={sorted} onChange={setSorted} />
      </div>
      <div className={kit.row}>
        <Button
          variant="primary"
          disabled={!check.ok}
          onClick={() => {
            if (!check.ok) return;
            const values = drawNumbers(check.min, check.max, check.count, unique, rng());
            setNumbers(values.map((value, id) => ({ id, value })));
          }}
        >
          生成
        </Button>
        <CopyButton text={shown.map((item) => item.value).join(" ")} label="复制结果" />
      </div>
      {!check.ok && <ErrorText>{check.error}</ErrorText>}
      {shown.length === 1 ? (
        <div className={styles.card} aria-live="polite">
          <span className={styles.cardLabel}>抽到的是</span>
          <span className={styles.cardValue}>{shown[0].value}</span>
        </div>
      ) : shown.length > 1 ? (
        <div className={styles.numbers} aria-live="polite">
          {shown.map((item) => (
            <span key={item.id} className={styles.number}>
              {item.value}
            </span>
          ))}
        </div>
      ) : null}
      <p className={kit.hint}>
        所有随机结果都来自浏览器的加密级随机数，且做了无偏处理，每个数机会均等。
      </p>
    </Panel>
  );
}

export default function DecideTool() {
  const [mode, setMode] = useState<Mode>("food");
  return (
    <div className={kit.stack}>
      <SegmentedControl
        selected={mode}
        onToggle={(value) => setMode(value as Mode)}
        buttons={[
          { value: "food", label: "今天吃什么" },
          { value: "coin", label: "抛硬币" },
          { value: "dice", label: "掷骰子" },
          { value: "number", label: "随机数" },
        ]}
      />
      <div hidden={mode !== "food"}>
        <FoodPicker />
      </div>
      <div hidden={mode !== "coin"}>
        <CoinFlip />
      </div>
      <div hidden={mode !== "dice"}>
        <DiceRoller />
      </div>
      <div hidden={mode !== "number"}>
        <NumberDraw />
      </div>
    </div>
  );
}

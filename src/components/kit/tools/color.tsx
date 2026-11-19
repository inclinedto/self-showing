"use client";

import { Button, Tag } from "@once-ui-system/core";
import classNames from "classnames";
import { useId, useMemo, useState } from "react";
import {
  colorScale,
  contrastRatio,
  formatCmyk,
  formatHsl,
  formatHsv,
  formatRatio,
  formatRgb,
  parseColor,
  type Rgba,
  readableOn,
  toHex,
  toHex6,
  wcagLevels,
} from "@/lib/kit/color";
import { ErrorText, Field, kit, Panel, ResultRow, Results, Stat, Stats, useCopy } from "../ui";
import styles from "./color.module.scss";

const PRESETS = [
  { name: "海水", hex: "#049EE2" },
  { name: "椰林", hex: "#2FB36B" },
  { name: "落日", hex: "#FD6325" },
  { name: "沙滩", hex: "#F2D7A6" },
  { name: "西瓜", hex: "#FF5A6E" },
];

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

type ColorState = { text: string; color: Rgba; invalid: boolean; update: (value: string) => void };

/** Free text plus the last colour it parsed to, so a half-typed value doesn't blank the preview. */
function useColorText(initial: string): ColorState {
  const [text, setText] = useState(initial);
  const [color, setColor] = useState<Rgba>(() => parseColor(initial) ?? BLACK);
  const update = (value: string) => {
    setText(value);
    const parsed = parseColor(value);
    if (parsed) setColor(parsed);
  };
  return { text, color, invalid: text.trim() !== "" && parseColor(text) === null, update };
}

function ColorField({
  label,
  hint,
  state,
  onChange = state.update,
}: {
  label: string;
  hint?: string;
  state: ColorState;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className={styles.colorRow}>
        <input
          type="color"
          className={styles.picker}
          aria-label={`${label}（取色器）`}
          value={toHex6(state.color)}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <input
          id={id}
          className={classNames(kit.control, kit.mono)}
          value={state.text}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={state.invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {state.invalid && (
        <ErrorText>认不出这个颜色，试试 #049EE2、rgb(4, 158, 226) 或 hsl(198, 97%, 45%)</ErrorText>
      )}
    </Field>
  );
}

function LevelTag({ label, pass }: { label: string; pass: boolean }) {
  return (
    <Tag size="m" variant={pass ? "success" : "danger"} prefixIcon={pass ? "check" : "close"}>
      {label} {pass ? "通过" : "不通过"}
    </Tag>
  );
}

export default function ColorTool() {
  const main = useColorText("#049EE2");
  const fg = useColorText("#049EE2");
  const bg = useColorText("#FFFFFF");
  const copy = useCopy();

  const setMain = (value: string) => {
    main.update(value);
    const parsed = parseColor(value);
    if (parsed) fg.update(toHex(parsed));
  };

  const swap = () => {
    const [fgText, bgText] = [fg.text, bg.text];
    fg.update(bgText);
    bg.update(fgText);
  };

  const { color } = main;
  const hex = toHex(color);
  const scale = useMemo(() => colorScale(color), [color]);
  const ratio = contrastRatio(fg.color, bg.color);
  const levels = wcagLevels(ratio);

  return (
    <div className={kit.stack}>
      <div className={kit.grid2}>
        <Panel title="颜色">
          <ColorField
            label="颜色值"
            state={main}
            onChange={setMain}
            hint="支持 #rgb、#rrggbb、#rrggbbaa、rgb()/rgba()、hsl()/hsla() 和常见颜色名（如 orange、粉色）"
          />
          <div className={kit.field}>
            <span className={kit.label}>夏日色板</span>
            <div className={styles.presets}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  className={styles.preset}
                  onClick={() => setMain(preset.hex)}
                  aria-pressed={hex === preset.hex}
                >
                  <span className={styles.dot} style={{ background: preset.hex }} />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.preview}>
            <div
              className={styles.previewFill}
              style={{ background: formatRgb(color), color: readableOn(color) }}
            >
              {hex}
            </div>
          </div>
        </Panel>

        <Panel title="各种格式">
          <Results>
            <ResultRow label="HEX" value={hex} />
            <ResultRow label="RGB" value={formatRgb(color)} />
            <ResultRow label="HSL" value={formatHsl(color)} />
            <ResultRow label="HSV" value={formatHsv(color)} />
            <ResultRow label="CMYK（近似）" value={formatCmyk(color)} />
            <ResultRow label="CSS 变量" value={`--color: ${toHex(color, false)};`} />
          </Results>
          <span className={kit.hint}>
            CMYK 用简单公式换算，和实际印刷出来的颜色会有出入，印刷前请以印厂的色卡为准。
          </span>
        </Panel>
      </div>

      <Panel title="色阶">
        <span className={kit.hint}>
          从很浅到很深的 11 个色阶（和白色、黑色混合得到），点一下就能复制色值。
        </span>
        <div className={styles.scale}>
          {scale.map((item) => (
            <button
              key={item.step}
              type="button"
              className={styles.swatch}
              style={{ background: item.hex, color: item.text }}
              onClick={() => copy(item.hex)}
              aria-label={`复制色阶 ${item.step}：${item.hex}`}
            >
              <span className={styles.swatchStep}>{item.step}</span>
              <span className={styles.swatchHex}>{item.hex}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="对比度检查"
        actions={
          <Button size="s" variant="secondary" prefixIcon="convert" onClick={swap}>
            交换颜色
          </Button>
        }
      >
        <div className={kit.grid2}>
          <ColorField label="文字色" state={fg} hint="默认跟随上面的颜色" />
          <ColorField label="背景色" state={bg} />
        </div>
        <Stats>
          <Stat label="WCAG 2.1 对比度" value={formatRatio(ratio)} />
        </Stats>
        <div className={kit.row} aria-live="polite">
          <LevelTag label="AA 正文" pass={levels.aa} />
          <LevelTag label="AA 大字" pass={levels.aaLarge} />
          <LevelTag label="AAA 正文" pass={levels.aaa} />
        </div>
        <span className={kit.hint}>
          正文至少 4.5:1，大字（18pt 以上，或 14pt 以上的粗体）至少 3:1；AAA 要求正文达到 7:1。
        </span>
        <div
          className={styles.sample}
          style={{ color: formatRgb(fg.color), background: formatRgb(bg.color) }}
        >
          <span className={styles.sampleNormal}>角度偏爱 Summer 123</span>
          <span className={styles.sampleLarge}>角度偏爱 Summer 123</span>
        </div>
      </Panel>
    </div>
  );
}

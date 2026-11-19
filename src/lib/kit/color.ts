/** Colour parsing, conversion, WCAG contrast and tint/shade scales. */

/** r/g/b are 0–255 integers, a is 0–1. */
export type Rgba = { r: number; g: number; b: number; a: number };

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  orange: "#ffa500",
  yellow: "#ffff00",
  cyan: "#00ffff",
  purple: "#800080",
  pink: "#ffc0cb",
  gray: "#808080",
  grey: "#808080",
  白色: "#ffffff",
  黑色: "#000000",
  红色: "#ff0000",
  绿色: "#008000",
  蓝色: "#0000ff",
  橙色: "#ffa500",
  黄色: "#ffff00",
  青色: "#00ffff",
  紫色: "#800080",
  粉色: "#ffc0cb",
  灰色: "#808080",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function parseNumber(text: string): number | null {
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return null;
  return Number(text);
}

function parseChannel(text: string): number | null {
  const value = parseNumber(text.endsWith("%") ? text.slice(0, -1) : text);
  if (value === null) return null;
  return Math.round(clamp(text.endsWith("%") ? (value * 255) / 100 : value, 0, 255));
}

function parseAlpha(text: string | undefined): number | null {
  if (text === undefined) return 1;
  const value = parseNumber(text.endsWith("%") ? text.slice(0, -1) : text);
  if (value === null) return null;
  return round(clamp(text.endsWith("%") ? value / 100 : value, 0, 1), 3);
}

function parsePercent(text: string): number | null {
  const value = parseNumber(text.endsWith("%") ? text.slice(0, -1) : text);
  return value === null ? null : clamp(value, 0, 100);
}

function parseHue(text: string): number | null {
  const match = /^(.*?)(deg|turn|rad|grad)?$/.exec(text);
  const value = match ? parseNumber(match[1]) : null;
  if (!match || value === null) return null;
  const degrees =
    match[2] === "turn"
      ? value * 360
      : match[2] === "rad"
        ? (value * 180) / Math.PI
        : match[2] === "grad"
          ? value * 0.9
          : value;
  return ((degrees % 360) + 360) % 360;
}

/** Splits "1, 2, 3, .5" or "1 2 3 / 50%" into three components plus an optional alpha. */
function splitArgs(body: string): { parts: string[]; alpha?: string } | null {
  if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    if (parts.length === 4) return { parts: parts.slice(0, 3), alpha: parts[3] };
    return parts.length === 3 ? { parts } : null;
  }
  const slashed = body.split("/");
  if (slashed.length > 2) return null;
  const parts = slashed[0].trim().split(/\s+/);
  return parts.length === 3 ? { parts, alpha: slashed[1]?.trim() } : null;
}

export function parseHex(text: string): Rgba | null {
  const match = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length <= 4) hex = Array.from(hex, (char) => char + char).join("");
  const channel = (index: number) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: hex.length === 8 ? round(channel(3) / 255, 3) : 1,
  };
}

/** Accepts #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba(), hsl()/hsla() (comma or space syntax) and a few names. */
export function parseColor(input: string): Rgba | null {
  const text = input.trim().toLowerCase().replace(/;$/, "").trim();
  if (!text) return null;
  const named = NAMED[text] ?? NAMED[`${text}色`];
  if (named) return parseHex(named);
  const hex = parseHex(text);
  if (hex) return hex;

  const fn = /^(rgba?|hsla?)\(\s*(.*?)\s*\)$/.exec(text);
  if (!fn) return null;
  const args = splitArgs(fn[2]);
  if (!args) return null;
  const a = parseAlpha(args.alpha);
  if (a === null) return null;
  if (fn[1].startsWith("rgb")) {
    const [r, g, b] = args.parts.map(parseChannel);
    if (r === null || g === null || b === null) return null;
    return { r, g, b, a };
  }
  const h = parseHue(args.parts[0]);
  const s = parsePercent(args.parts[1]);
  const l = parsePercent(args.parts[2]);
  if (h === null || s === null || l === null) return null;
  return { ...hslToRgb(h, s, l), a };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const amount = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    clamp(
      Math.round((light - amount * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255),
      0,
      255,
    );
  return { r: f(0), g: f(8), b: f(4) };
}

function hueOf(r: number, g: number, b: number, max: number, delta: number): number {
  if (delta === 0) return 0;
  const hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

/** h 0–360, s/l 0–100 (unrounded). */
export function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: hueOf(rn, gn, bn, max, delta), s: s * 100, l: l * 100 };
}

/** h 0–360, s/v 0–100 (unrounded). */
export function rgbToHsv({ r, g, b }: Rgba): { h: number; s: number; v: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const delta = max - Math.min(rn, gn, bn);
  return { h: hueOf(rn, gn, bn, max, delta), s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

/** Naive device-independent CMYK, 0–100. Real print colours depend on the ICC profile. */
export function rgbToCmyk({ r, g, b }: Rgba): { c: number; m: number; y: number; k: number } {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const part = (value: number) => ((1 - value / 255 - k) / (1 - k)) * 100;
  return { c: part(r), m: part(g), y: part(b), k: k * 100 };
}

const hex2 = (value: number) =>
  Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0");

/** "#RRGGBB", or "#RRGGBBAA" when translucent. */
export function toHex(color: Rgba, upper = true): string {
  const alpha = color.a < 1 ? hex2(color.a * 255) : "";
  const hex = `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}${alpha}`;
  return upper ? hex.toUpperCase() : hex;
}

/** "#rrggbb" for <input type="color"> (alpha dropped). */
export function toHex6(color: Rgba): string {
  return toHex({ ...color, a: 1 }, false);
}

export function formatRgb(color: Rgba): string {
  const { r, g, b, a } = color;
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
}

export function formatHsl(color: Rgba): string {
  const { h, s, l } = rgbToHsl(color);
  const body = `${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(l)}%`;
  return color.a < 1 ? `hsla(${body}, ${color.a})` : `hsl(${body})`;
}

export function formatHsv(color: Rgba): string {
  const { h, s, v } = rgbToHsv(color);
  return `hsv(${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(v)}%)`;
}

export function formatCmyk(color: Rgba): string {
  const { c, m, y, k } = rgbToCmyk(color);
  return `cmyk(${[c, m, y, k].map((value) => `${Math.round(value)}%`).join(", ")})`;
}

/** Composites a translucent colour over an opaque background. */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const mixChannel = (a: number, b: number) => Math.round(a * top.a + b * (1 - top.a));
  return {
    r: mixChannel(top.r, bottom.r),
    g: mixChannel(top.g, bottom.g),
    b: mixChannel(top.b, bottom.b),
    a: 1,
  };
}

/** WCAG 2.1 relative luminance of an opaque colour. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

/** WCAG contrast ratio (1–21). Translucent colours are composited (background over white first). */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const bg = background.a < 1 ? blend(background, WHITE) : background;
  const fg = foreground.a < 1 ? blend(foreground, bg) : foreground;
  const [light, dark] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** "4.52:1", truncated (not rounded) so a failing ratio never displays as passing. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100 + 1e-9) / 100).toFixed(2)}:1`;
}

export function wcagLevels(ratio: number): { aa: boolean; aaLarge: boolean; aaa: boolean } {
  return { aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7 };
}

/** Black or white, whichever reads better on the colour. */
export function readableOn(color: Rgba): "#000000" | "#FFFFFF" {
  const opaque = color.a < 1 ? blend(color, WHITE) : color;
  return contrastRatio(BLACK, opaque) >= contrastRatio(WHITE, opaque) ? "#000000" : "#FFFFFF";
}

function mix(color: Rgba, target: Rgba, amount: number): Rgba {
  const channel = (from: number, to: number) => Math.round(from + (to - from) * amount);
  return {
    r: channel(color.r, target.r),
    g: channel(color.g, target.g),
    b: channel(color.b, target.b),
    a: 1,
  };
}

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const TINTS = [0.92, 0.8, 0.64, 0.46, 0.24];
const SHADES = [0.16, 0.34, 0.5, 0.66, 0.8];

/** 11 steps from very light to very dark: tints (mixed with white), the colour itself, shades (mixed with black). */
export function colorScale(color: Rgba): { step: number; hex: string; text: string }[] {
  const base = { ...color, a: 1 };
  const colors = [
    ...TINTS.map((amount) => mix(base, WHITE, amount)),
    base,
    ...SHADES.map((amount) => mix(base, BLACK, amount)),
  ];
  return colors.map((item, index) => ({
    step: SCALE_STEPS[index],
    hex: toHex(item),
    text: readableOn(item),
  }));
}

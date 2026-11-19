import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Geist has no CJK glyphs, so Chinese text falls through to the system fonts listed here.
// next/font only accepts literal option objects, which is why the lists are repeated.
export const sansFont = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "sans-serif"],
});

export const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Menlo", "Consolas", "PingFang SC", "Microsoft YaHei", "monospace"],
});

/** Literary serif for the English lines (the hero quote and small accents). */
export const displayFont = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "Songti SC", "serif"],
});

/**
 * Applied as data-* attributes on <html>; values are Once UI design tokens.
 * Summer palette: cyan sea and sky, orange sun, sand beach.
 */
export const theme = {
  neutral: "sand",
  brand: "cyan",
  accent: "orange",
  solid: "color",
  "solid-style": "flat",
  border: "playful",
  surface: "translucent",
  transition: "all",
  scaling: "100",
} as const;

export const THEME_STORAGE_KEY = "data-theme";

import { Fredoka, Geist_Mono, Nunito, ZCOOL_KuaiLe } from "next/font/google";

// Nunito and Fredoka have no CJK glyphs, so Chinese text falls through to the next family in each stack:
// system fonts for body text, 站酷快乐体 for headings (see --font-heading in globals.scss).
// next/font only accepts literal option objects, which is why the lists are repeated.
export const sansFont = Nunito({
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

/** Rounded display face for English lines: the hero quote, kickers and headings. */
export const displayFont = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

/** 站酷快乐体: playful CJK headings. Google serves it in unicode-range slices, so pages only fetch the glyphs they use. */
export const cuteFont = ZCOOL_KuaiLe({
  variable: "--font-cute",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "sans-serif"],
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

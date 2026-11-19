import { Geist, Geist_Mono } from "next/font/google";

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

/** Applied as data-* attributes on <html>; values are Once UI design tokens. */
export const theme = {
  neutral: "gray",
  brand: "emerald",
  accent: "indigo",
  solid: "contrast",
  "solid-style": "flat",
  border: "playful",
  surface: "translucent",
  transition: "all",
  scaling: "100",
} as const;

export const THEME_STORAGE_KEY = "data-theme";

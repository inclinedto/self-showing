"use client";

import { useEffect } from "react";

const KEY = "kit:recent";
const LIMIT = 6;

export function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Remembers the tool page being viewed so the tools index can offer it under "最近用过". */
export function RecordRecent({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const next = [slug, ...readRecent().filter((item) => item !== slug)].slice(0, LIMIT);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode, quota); the list is only a convenience.
    }
  }, [slug]);
  return null;
}

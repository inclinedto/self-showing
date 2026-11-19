"use client";

import { IconButton, useTheme } from "@once-ui-system/core";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";
  return (
    <IconButton
      icon={dark ? "sun" : "moon"}
      variant="tertiary"
      size="m"
      tooltip={dark ? "切换到浅色" : "切换到深色"}
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    />
  );
}

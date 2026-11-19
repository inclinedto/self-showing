"use client";

import {
  type BorderStyle,
  IconProvider,
  LayoutProvider,
  type NeutralColor,
  type ScalingSize,
  type Schemes,
  type SolidStyle,
  type SolidType,
  type SurfaceStyle,
  ThemeProvider,
  ToastProvider,
  type TransitionStyle,
} from "@once-ui-system/core";
import { SessionProvider } from "@/components/session/SessionProvider";
import { iconLibrary } from "@/resources/icons";
import { theme } from "@/resources/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <ThemeProvider
        theme="system"
        brand={theme.brand as Schemes}
        accent={theme.accent as Schemes}
        neutral={theme.neutral as NeutralColor}
        solid={theme.solid as SolidType}
        solidStyle={theme["solid-style"] as SolidStyle}
        border={theme.border as BorderStyle}
        surface={theme.surface as SurfaceStyle}
        transition={theme.transition as TransitionStyle}
        scaling={theme.scaling as ScalingSize}
      >
        <ToastProvider>
          <IconProvider icons={iconLibrary}>
            <SessionProvider>{children}</SessionProvider>
          </IconProvider>
        </ToastProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}

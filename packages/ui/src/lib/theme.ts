import type { DockConfig } from "@glass-dock/shared";
import { FINISH } from "./themes";

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** CSS variables derived from the appearance config (tokens live in tokens.css). */
export function themeVars(a: DockConfig["appearance"]): Record<string, string> {
  const f = FINISH[a.finish];
  const tint = Math.min(0.92, a.tintOpacity * f.tint);
  return {
    "--glass-bg": hexToRgba(a.tint, tint),
    "--glass-bg-strong": hexToRgba(a.tint, Math.min(1, tint * 1.8)),
    "--glass-blur": `${Math.round(a.blurStrength * f.blur)}px`,
    "--glass-saturate": `${f.saturate}%`,
    "--radius-dock": `${a.radius}px`,
    "--radius-item": `${Math.round(a.radius * 0.64)}px`,
    "--accent": a.accent,
  };
}

import type { DockConfig } from "@glass-dock/shared";

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** CSS variables derived from the appearance config (tokens live in tokens.css). */
export function themeVars(a: DockConfig["appearance"]): Record<string, string> {
  return {
    "--glass-bg": hexToRgba(a.tint, a.tintOpacity),
    "--glass-bg-strong": hexToRgba(a.tint, Math.min(1, a.tintOpacity * 1.8)),
    "--glass-blur": `${a.blurStrength}px`,
    "--radius-dock": `${a.radius}px`,
    "--radius-item": `${Math.round(a.radius * 0.64)}px`,
    "--accent": a.accent,
  };
}

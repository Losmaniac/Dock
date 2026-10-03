import type { DockConfig } from "@glass-dock/shared";

export interface Preset {
  id: string;
  name: string;
  appearance: Partial<DockConfig["appearance"]>;
  dock?: Partial<DockConfig["dock"]>;
}

export const PRESETS: readonly Preset[] = [
  {
    id: "frosted",
    name: "Frosted",
    appearance: {
      theme: "system",
      blurMode: "acrylic",
      blurStrength: 28,
      tint: "#ffffff",
      tintOpacity: 0.14,
      radius: 22,
      accent: "#4f8cff",
      solid: false,
    },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    appearance: {
      theme: "dark",
      blurMode: "mica",
      blurStrength: 20,
      tint: "#0b0b10",
      tintOpacity: 0.55,
      radius: 18,
      accent: "#a78bfa",
      solid: false,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    appearance: {
      theme: "system",
      blurMode: "none",
      blurStrength: 0,
      tint: "#808080",
      tintOpacity: 0.25,
      radius: 10,
      accent: "#22c55e",
      solid: false,
    },
    dock: { magnification: 1.2, iconSize: 44 },
  },
];

/** Presets only touch look-and-feel; items, hotkeys and workspaces are never changed. */
export function applyPreset(cfg: DockConfig, preset: Preset): DockConfig {
  return {
    ...cfg,
    appearance: { ...cfg.appearance, ...preset.appearance },
    dock: { ...cfg.dock, ...preset.dock },
  };
}

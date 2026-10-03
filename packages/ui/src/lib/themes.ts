import type { DockConfig } from "@glass-dock/shared";

type Appearance = DockConfig["appearance"];

export interface DockTheme {
  id: string;
  name: string;
  blurb: string;
  /** Two colors for the gallery swatch. */
  swatch: [string, string];
  appearance: Partial<Appearance>;
}

/** Nine original looks. "auto" follows the system; "wallpaper" derives its colors from the desktop. */
export const THEMES: readonly DockTheme[] = [
  {
    id: "auto",
    name: "Auto",
    blurb: "Follows the system light or dark setting",
    swatch: ["#f2f4f8", "#20222a"],
    appearance: {
      theme: "system",
      tint: "#ffffff",
      tintOpacity: 0.14,
      accent: "#4f8cff",
      finish: "glass",
      blurStrength: 24,
    },
  },
  {
    id: "wallpaper",
    name: "Wallpaper",
    blurb: "Colors picked from your desktop picture",
    swatch: ["#7c3aed", "#06b6d4"],
    appearance: {
      theme: "system",
      tint: "#808080",
      tintOpacity: 0.2,
      accent: "#4f8cff",
      finish: "glass",
      blurStrength: 26,
      accentFromWallpaper: true,
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    blurb: "Neutral dark glass",
    swatch: ["#2b2d33", "#0e0f12"],
    appearance: {
      theme: "dark",
      tint: "#14151a",
      tintOpacity: 0.5,
      accent: "#8ab4ff",
      finish: "glass",
      blurStrength: 22,
      radius: 20,
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Deep blue-black with a violet accent",
    swatch: ["#1b2140", "#06070f"],
    appearance: {
      theme: "dark",
      tint: "#0a0f24",
      tintOpacity: 0.6,
      accent: "#a78bfa",
      finish: "frosted",
      blurStrength: 20,
      radius: 22,
    },
  },
  {
    id: "glacier",
    name: "Glacier",
    blurb: "Cool steel blue",
    swatch: ["#9fb7cf", "#3d5873"],
    appearance: {
      theme: "dark",
      tint: "#3b5a78",
      tintOpacity: 0.38,
      accent: "#7dd3fc",
      finish: "glass",
      blurStrength: 26,
      radius: 24,
    },
  },
  {
    id: "parchment",
    name: "Parchment",
    blurb: "Warm paper with an olive accent",
    swatch: ["#f3ead6", "#b9b17a"],
    appearance: {
      theme: "light",
      tint: "#f6edd8",
      tintOpacity: 0.62,
      accent: "#6b7a2a",
      finish: "frosted",
      blurStrength: 18,
      radius: 16,
    },
  },
  {
    id: "pine",
    name: "Pine",
    blurb: "Forest green glass",
    swatch: ["#2f5d46", "#0f2a1e"],
    appearance: {
      theme: "dark",
      tint: "#17382a",
      tintOpacity: 0.52,
      accent: "#6ee7a8",
      finish: "glass",
      blurStrength: 22,
      radius: 20,
    },
  },
  {
    id: "cloud",
    name: "Cloud",
    blurb: "Bright and airy",
    swatch: ["#ffffff", "#dfe6f1"],
    appearance: {
      theme: "light",
      tint: "#ffffff",
      tintOpacity: 0.55,
      accent: "#2563eb",
      finish: "frosted",
      blurStrength: 24,
      radius: 22,
    },
  },
  {
    id: "crystal",
    name: "Crystal",
    blurb: "Nearly transparent with a bright edge",
    swatch: ["#ffffff55", "#ffffff11"],
    appearance: {
      theme: "system",
      tint: "#ffffff",
      tintOpacity: 0.08,
      accent: "#38bdf8",
      finish: "clear",
      blurStrength: 10,
      radius: 26,
    },
  },
];

/** A theme only touches look-and-feel; items, hotkeys and workspaces are never changed. */
export function applyTheme(cfg: DockConfig, theme: DockTheme): DockConfig {
  return {
    ...cfg,
    appearance: {
      ...cfg.appearance,
      accentFromWallpaper: false,
      ...theme.appearance,
      themeId: theme.id,
    },
  };
}

export const FINISH_LABEL: Record<Appearance["finish"], string> = {
  glass: "Glass",
  frosted: "Frosted",
  clear: "Clear",
};

/** How each finish reshapes blur, tint strength and saturation. */
export const FINISH: Record<
  Appearance["finish"],
  { blur: number; tint: number; saturate: number }
> = {
  glass: { blur: 1, tint: 1, saturate: 180 },
  frosted: { blur: 1.45, tint: 1.6, saturate: 120 },
  clear: { blur: 0.5, tint: 0.45, saturate: 210 },
};

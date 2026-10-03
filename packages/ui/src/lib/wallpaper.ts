import type { DockConfig } from "@glass-dock/shared";

export interface WallpaperColors {
  /** Most vivid common color, `#rrggbb`. */
  accent: string;
  /** Average color, `#rrggbb`. */
  average: string;
  /** 0..1 relative luminance of the average. */
  luminance: number;
}

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, max / 255];
}

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/**
 * Colors from a small RGBA sample. The accent is the center of the hue bucket with the most
 * "vivid" weight (saturation x brightness), so a mostly grey photo with one red object picks red.
 */
export function analyzeWallpaper(rgba: ArrayLike<number>): WallpaperColors {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3]! < 128) continue;
    const [pr, pg, pb] = [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!];
    r += pr;
    g += pg;
    b += pb;
    n++;
    const [h, s, v] = hsv(pr, pg, pb);
    const w = s * s * v; // strongly prefer saturated, bright pixels
    const k = buckets[Math.floor(h / 30) % 12]!;
    k.w += w;
    k.r += pr * w;
    k.g += pg * w;
    k.b += pb * w;
  }
  if (n === 0) return { accent: "#4f8cff", average: "#808080", luminance: 0.2 };
  const avg: [number, number, number] = [r / n, g / n, b / n];
  const best = buckets.reduce((a, c) => (c.w > a.w ? c : a));
  const accent = best.w > 0 ? hex(best.r / best.w, best.g / best.w, best.b / best.w) : "#4f8cff";
  return {
    accent,
    average: hex(...avg),
    luminance: 0.2126 * lin(avg[0]) + 0.7152 * lin(avg[1]) + 0.0722 * lin(avg[2]),
  };
}

/** Keep an accent readable as text/focus ring: lift very dark colors, calm blown-out ones. */
export function usableAccent(color: string): string {
  const n = parseInt(color.slice(1), 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [h, s, v] = hsv(r, g, b);
  if (v < 0.55) {
    const k = 0.7 / Math.max(v, 0.05);
    [r, g, b] = [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)];
  }
  if (s < 0.25 && h >= 0) return hex(r, g, b);
  return hex(r, g, b);
}

/** Appearance after applying wallpaper colors; unchanged when disabled or no wallpaper. */
export function effectiveAppearance(
  a: DockConfig["appearance"],
  wp: WallpaperColors | null,
): DockConfig["appearance"] {
  if (!wp || !a.accentFromWallpaper) return a;
  const out = { ...a, accent: usableAccent(wp.accent) };
  if (a.themeId === "wallpaper") {
    out.tint = wp.average;
    out.theme = wp.luminance > 0.45 ? "light" : "dark";
    out.tintOpacity = Math.max(a.tintOpacity, 0.3);
  }
  return out;
}

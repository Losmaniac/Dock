import { describe, expect, it } from "vitest";
import { defaultConfig } from "@glass-dock/shared";
import { analyzeWallpaper, effectiveAppearance, usableAccent } from "./wallpaper";

const px = (...c: [number, number, number][]) =>
  Uint8ClampedArray.from(c.flatMap(([r, g, b]) => [r, g, b, 255]));

describe("wallpaper colors", () => {
  it("picks the vivid color out of a mostly grey image", () => {
    const grey = Array.from({ length: 30 }, () => [120, 120, 120] as [number, number, number]);
    const red = Array.from({ length: 4 }, () => [220, 30, 40] as [number, number, number]);
    const r = analyzeWallpaper(px(...grey, ...red));
    const n = parseInt(r.accent.slice(1), 16);
    expect((n >> 16) & 255).toBeGreaterThan(180);
    expect(n & 255).toBeLessThan(90);
  });
  it("reports luminance and ignores transparent pixels", () => {
    expect(analyzeWallpaper(px([0, 0, 0], [0, 0, 0])).luminance).toBeLessThan(0.01);
    expect(analyzeWallpaper(px([255, 255, 255])).luminance).toBeGreaterThan(0.95);
    expect(analyzeWallpaper(Uint8ClampedArray.from([255, 0, 0, 0])).accent).toBe("#4f8cff");
  });
  it("lifts a very dark accent", () => {
    const lifted = parseInt(usableAccent("#100010").slice(1), 16);
    expect(Math.max((lifted >> 16) & 255, lifted & 255)).toBeGreaterThan(120);
  });
  it("only recolors when enabled, and only the Wallpaper theme changes the tint", () => {
    const wp = { accent: "#ff8800", average: "#202020", luminance: 0.05 };
    const base = defaultConfig().appearance;
    expect(effectiveAppearance(base, wp)).toBe(base);
    const accentOnly = effectiveAppearance(
      { ...base, accentFromWallpaper: true, themeId: "pine" },
      wp,
    );
    expect(accentOnly.accent).toBe("#ff8800");
    expect(accentOnly.tint).toBe(base.tint);
    const full = effectiveAppearance(
      { ...base, accentFromWallpaper: true, themeId: "wallpaper" },
      wp,
    );
    expect(full.theme).toBe("dark");
    expect(full.tint).toBe("#202020");
  });
});

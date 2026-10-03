import { describe, expect, it } from "vitest";
import { defaultConfig, dockConfigSchema } from "@glass-dock/shared";
import { THEMES, applyTheme } from "./themes";

describe("themes", () => {
  it("offers nine uniquely named looks", () => {
    expect(THEMES).toHaveLength(9);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(9);
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(9);
  });
  it("every theme yields a valid config and records its id", () => {
    for (const t of THEMES) {
      const out = applyTheme(defaultConfig(), t);
      expect(dockConfigSchema.safeParse(out).success).toBe(true);
      expect(out.appearance.themeId).toBe(t.id);
    }
  });
  it("leaves items, hotkeys and position alone", () => {
    const base = { ...defaultConfig(), items: [{ id: "s", type: "separator" as const }] };
    const out = applyTheme(
      base,
      THEMES.find((t) => t.id === "graphite")!,
    );
    expect(out.items).toEqual(base.items);
    expect(out.hotkeys).toEqual(base.hotkeys);
    expect(out.dock).toEqual(base.dock);
  });
  it("only the wallpaper theme turns on wallpaper colors", () => {
    expect(
      applyTheme(
        defaultConfig(),
        THEMES.find((t) => t.id === "wallpaper")!,
      ).appearance.accentFromWallpaper,
    ).toBe(true);
    expect(
      applyTheme(
        defaultConfig(),
        THEMES.find((t) => t.id === "pine")!,
      ).appearance.accentFromWallpaper,
    ).toBe(false);
  });
});

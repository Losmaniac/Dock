import { describe, expect, it } from "vitest";
import { defaultConfig, migrateConfig, newDock, parseConfig } from "./config";

describe("config schema", () => {
  it("fills defaults with one dock", () => {
    const cfg = defaultConfig();
    expect(cfg.docks).toHaveLength(1);
    expect(cfg.docks[0]!.position).toBe("bottom");
    expect(cfg.docks[0]!.magnification).toBe(1.6);
    expect(cfg.docks[0]!.items).toEqual([]);
    expect(cfg.system.hideTaskbar).toBe(false);
    expect(cfg.system.onboarded).toBe(false);
  });

  it("accepts docks with every item type", () => {
    const res = parseConfig({
      version: 2,
      docks: [
        {
          id: "d1",
          items: [
            { id: "a", type: "app", label: "VS Code", path: "C:\\Code.exe", args: [] },
            { id: "b", type: "url", label: "Calendar", url: "https://example.com" },
            { id: "c", type: "widget", widget: "system-stats" },
            {
              id: "d",
              type: "widget",
              widget: "stopwatch",
              size: "wide",
              options: { state: "{}" },
            },
          ],
        },
        { id: "d2", monitor: "\\\\.\\DISPLAY2", position: "top" },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("falls back to defaults and reports the error on corrupt config", () => {
    const res = parseConfig({ version: 2, docks: [{ id: "x", iconSize: 500 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("iconSize");
      expect(res.config.docks[0]!.iconSize).toBe(56);
    }
  });

  it("rejects unknown versions and an empty dock list", () => {
    expect(parseConfig({ version: 99 }).ok).toBe(false);
    expect(parseConfig({ version: 2, docks: [] }).ok).toBe(false);
  });

  it("creates docks with unique ids", () => expect(newDock().id).not.toBe(newDock().id));
});

describe("v1 -> v2 migration", () => {
  const v1 = {
    version: 1,
    dock: {
      position: "left",
      iconSize: 64,
      hideTaskbar: true,
      monitors: "primary",
      autoHide: true,
    },
    items: [
      { id: "a", type: "app", label: "A", path: "C:\\a.exe", args: [] },
      { id: "w", type: "widget", widget: "clock" },
    ],
    appearance: { accent: "#112233" },
    workspaces: [],
  };

  it("moves dock + items into the first dock and keeps settings", () => {
    const res = parseConfig(v1);
    expect(res.ok).toBe(true);
    const c = res.config;
    expect(c.version).toBe(2);
    expect(c.docks).toHaveLength(1);
    expect(c.docks[0]).toMatchObject({
      position: "left",
      iconSize: 64,
      autoHide: true,
      name: "Main dock",
    });
    expect(c.docks[0]!.items).toHaveLength(2);
    expect(c.appearance.accent).toBe("#112233");
  });

  it("moves hideTaskbar to system and drops the legacy monitors field", () => {
    const m = migrateConfig(v1) as {
      system: { hideTaskbar: boolean };
      docks: Record<string, unknown>[];
    };
    expect(m.system.hideTaskbar).toBe(true);
    expect((m.system as unknown as { onboarded: boolean }).onboarded).toBe(true);
    expect("hideTaskbar" in m.docks[0]!).toBe(false);
    expect("monitors" in m.docks[0]!).toBe(false);
  });

  it("migrates an empty v1 config and leaves v2 untouched", () => {
    expect(parseConfig({ version: 1 }).ok).toBe(true);
    const v2 = { version: 2, docks: [{ id: "z" }] };
    expect(migrateConfig(v2)).toBe(v2);
  });
});

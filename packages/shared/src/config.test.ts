import { describe, expect, it } from "vitest";
import { defaultConfig, parseConfig } from "./config";

describe("config schema", () => {
  it("fills defaults from a minimal config", () => {
    const cfg = defaultConfig();
    expect(cfg.dock.position).toBe("bottom");
    expect(cfg.dock.magnification).toBe(1.6);
    expect(cfg.items).toEqual([]);
  });

  it("accepts the excerpt from the spec", () => {
    const res = parseConfig({
      version: 1,
      items: [
        { id: "a", type: "app", label: "VS Code", path: "C:\\Code.exe", args: [] },
        { id: "b", type: "url", label: "Calendar", url: "https://example.com" },
        { id: "c", type: "widget", widget: "system-stats" },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("falls back to defaults and reports the error on corrupt config", () => {
    const res = parseConfig({ version: 1, dock: { iconSize: 500 } });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("iconSize");
      expect(res.config.dock.iconSize).toBe(56);
    }
  });

  it("rejects unknown versions", () => {
    expect(parseConfig({ version: 99 }).ok).toBe(false);
  });
});

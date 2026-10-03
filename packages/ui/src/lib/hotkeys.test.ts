import { describe, expect, it } from "vitest";
import { defaultConfig } from "@glass-dock/shared";
import { desiredHotkeys, diffHotkeys } from "./hotkeys";

describe("hotkeys", () => {
  it("expands defaults to toggle, palette and nine jump keys", () => {
    const d = desiredHotkeys(defaultConfig().hotkeys);
    expect(d["toggle-dock"]).toBe("Ctrl+Alt+D");
    expect(d["jump:9"]).toBe("Ctrl+Alt+9");
    expect(Object.keys(d)).toHaveLength(12);
  });
  it("skips disabled entries", () => {
    const cfg = defaultConfig().hotkeys;
    const d = desiredHotkeys({ ...cfg, jumpModifier: "", toggleDock: "" });
    expect(Object.keys(d)).toEqual(["command-palette", "window-switcher"]);
  });
  it("includes workspace hotkeys", () => {
    const ws = [
      { id: "w1", name: "Work", hotkey: "Ctrl+Alt+F1", steps: [] },
      { id: "w2", name: "Play", steps: [] },
    ];
    const d = desiredHotkeys(defaultConfig().hotkeys, ws);
    expect(d["ws:w1"]).toBe("Ctrl+Alt+F1");
    expect("ws:w2" in d).toBe(false);
  });
  it("diffs removals and changes only", () => {
    const { remove, set } = diffHotkeys({ a: "X", b: "Y", c: "Z" }, { a: "X", b: "Q" });
    expect(remove).toEqual(["c"]);
    expect(set).toEqual([["b", "Q"]]);
  });
});

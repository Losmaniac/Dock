import { describe, expect, it } from "vitest";
import { defaultConfig } from "@glass-dock/shared";
import { desiredHotkeys, diffHotkeys } from "./hotkeys";

describe("hotkeys", () => {
  it("expands defaults to toggle, palette and nine jump keys", () => {
    const d = desiredHotkeys(defaultConfig().hotkeys);
    expect(d["toggle-dock"]).toBe("Ctrl+Alt+D");
    expect(d["jump:9"]).toBe("Ctrl+Alt+9");
    expect(Object.keys(d)).toHaveLength(11);
  });
  it("skips disabled entries", () => {
    const cfg = defaultConfig().hotkeys;
    const d = desiredHotkeys({ ...cfg, jumpModifier: "", toggleDock: "" });
    expect(Object.keys(d)).toEqual(["command-palette"]);
  });
  it("diffs removals and changes only", () => {
    const { remove, set } = diffHotkeys({ a: "X", b: "Y", c: "Z" }, { a: "X", b: "Q" });
    expect(remove).toEqual(["c"]);
    expect(set).toEqual([["b", "Q"]]);
  });
});

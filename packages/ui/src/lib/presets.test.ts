import { describe, expect, it } from "vitest";
import { defaultConfig, dockConfigSchema } from "@glass-dock/shared";
import { PRESETS, applyPreset } from "./presets";

describe("presets", () => {
  it("every preset produces a valid config", () => {
    for (const p of PRESETS)
      expect(dockConfigSchema.safeParse(applyPreset(defaultConfig(), p)).success).toBe(true);
  });
  it("leaves items, hotkeys and position alone", () => {
    const base = { ...defaultConfig(), items: [{ id: "s", type: "separator" as const }] };
    const out = applyPreset(base, PRESETS[2]!);
    expect(out.items).toEqual(base.items);
    expect(out.hotkeys).toEqual(base.hotkeys);
    expect(out.dock.position).toBe(base.dock.position);
    expect(out.dock.iconSize).toBe(44);
  });
});

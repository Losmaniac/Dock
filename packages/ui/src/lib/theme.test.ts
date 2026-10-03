import { describe, expect, it } from "vitest";
import { defaultConfig } from "@glass-dock/shared";
import { hexToRgba, themeVars } from "./theme";

describe("theme", () => {
  it("converts hex to rgba", () =>
    expect(hexToRgba("#4f8cff", 0.5)).toBe("rgba(79, 140, 255, 0.5)"));
  it("derives variables from config", () => {
    const v = themeVars(defaultConfig().appearance);
    expect(v["--glass-bg"]).toBe("rgba(255, 255, 255, 0.12)");
    expect(v["--glass-blur"]).toBe("24px");
    expect(v["--glass-saturate"]).toBe("180%");
    expect(v["--radius-dock"]).toBe("22px");
  });
  it("reshapes blur and tint per finish", () => {
    const base = defaultConfig().appearance;
    const frosted = themeVars({ ...base, finish: "frosted" });
    const clear = themeVars({ ...base, finish: "clear" });
    expect(parseInt(frosted["--glass-blur"]!)).toBeGreaterThan(24);
    expect(parseInt(clear["--glass-blur"]!)).toBeLessThan(24);
    expect(frosted["--glass-bg"]).toContain("0.192");
  });
});

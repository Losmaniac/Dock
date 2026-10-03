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
    expect(v["--radius-dock"]).toBe("22px");
  });
});

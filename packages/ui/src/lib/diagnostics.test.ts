import { describe, expect, it } from "vitest";
import { defaultConfig } from "@glass-dock/shared";
import { diagnosticsText } from "./diagnostics";

describe("diagnosticsText", () => {
  it("summarizes the setup without leaking secrets", () => {
    const cfg = defaultConfig();
    cfg.integrations.weatherKey = "SECRET-KEY";
    cfg.integrations.calendarUrl = "https://private.example/cal.ics?token=abc";
    cfg.docks[0]!.items.push({
      id: "a",
      type: "app",
      label: "Private App",
      path: "C:\\Users\\me\\secret.exe",
      args: [],
    });
    const t = diagnosticsText(
      cfg,
      [{ id: "M", primary: true, width: 1920, height: 1080, scale: 1.25 }],
      { userAgent: "UA", dataDir: "D:\\x" },
    );
    expect(t).toContain("Docks: 1");
    expect(t).toContain("1920x1080@125% (primary)");
    expect(t).toContain("weather yes");
    for (const secret of ["SECRET-KEY", "token=abc", "Private App", "secret.exe"])
      expect(t).not.toContain(secret);
  });
});

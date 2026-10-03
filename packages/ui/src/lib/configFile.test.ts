import { describe, expect, it } from "vitest";
import { defaultConfig } from "@glass-dock/shared";
import { exportJson, importJson } from "./configFile";

describe("config import/export", () => {
  it("round-trips", () => {
    const cfg = defaultConfig();
    expect(importJson(exportJson(cfg))).toEqual({ ok: true, config: cfg });
  });
  it("rejects bad JSON and bad schema with a reason", () => {
    expect(importJson("nope")).toMatchObject({ ok: false });
    const r = importJson(JSON.stringify({ version: 1, dock: { iconSize: 1 } }));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toContain("dock.iconSize");
  });
});

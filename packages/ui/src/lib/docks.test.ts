import { describe, expect, it } from "vitest";
import { defaultConfig, newDock, type MonitorInfo } from "@glass-dock/shared";
import { currentDock, docksForMissingMonitors, extraDockIds, findItem, isOrphan } from "./docks";

const mon = (id: string, primary = false): MonitorInfo => ({
  id,
  primary,
  width: 1920,
  height: 1080,
  scale: 1,
});

function twoDocks() {
  const cfg = defaultConfig();
  const second = newDock({
    name: "Widgets",
    monitor: "M2",
    items: [{ id: "w1", type: "widget", widget: "clock", size: "compact", options: {} }],
  });
  cfg.docks.push(second);
  return { cfg, second };
}

describe("docks", () => {
  it("the main window shows the first dock; others show their own", () => {
    const { cfg, second } = twoDocks();
    expect(currentDock(cfg, null)).toBe(cfg.docks[0]);
    expect(currentDock(cfg, second.id)).toBe(second);
    expect(currentDock(cfg, "gone")).toBe(cfg.docks[0]);
  });
  it("detects windows whose dock was removed or became the main one", () => {
    const { cfg, second } = twoDocks();
    expect(isOrphan(cfg, null)).toBe(false);
    expect(isOrphan(cfg, second.id)).toBe(false);
    expect(isOrphan(cfg, "gone")).toBe(true);
    cfg.docks.shift(); // the second dock is now first, so it belongs to the main window
    expect(isOrphan(cfg, second.id)).toBe(true);
  });
  it("finds items in any dock and lists extra window ids", () => {
    const { cfg, second } = twoDocks();
    expect(findItem(cfg, "w1")?.type).toBe("widget");
    expect(findItem(cfg, "nope")).toBeUndefined();
    expect(extraDockIds(cfg)).toEqual([second.id]);
  });
  it("adds docks only for monitors that have none, resolving 'primary'", () => {
    const { cfg } = twoDocks();
    const monitors = [mon("M1", true), mon("M2"), mon("M3")];
    const added = docksForMissingMonitors(cfg, monitors, cfg.docks[0]!);
    expect(added.map((d) => d.monitor)).toEqual(["M3"]);
    expect(added[0]!.items).toEqual([]);
    expect(
      docksForMissingMonitors(defaultConfig(), [mon("M1", true)], defaultConfig().docks[0]!),
    ).toEqual([]);
  });
});

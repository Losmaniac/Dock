import { describe, expect, it, vi } from "vitest";
import { loadConfigFromRaw } from "./config-io";

describe("loadConfigFromRaw", () => {
  it("returns defaults on first run without a backup", async () => {
    const backup = vi.fn();
    const cfg = await loadConfigFromRaw(null, backup);
    expect(cfg.version).toBe(2);
    expect(backup).not.toHaveBeenCalled();
  });

  it("backs up and falls back on invalid JSON", async () => {
    const backup = vi.fn();
    await loadConfigFromRaw("{oops", backup);
    expect(backup).toHaveBeenCalledOnce();
  });

  it("backs up and falls back on schema violations", async () => {
    const backup = vi.fn();
    const cfg = await loadConfigFromRaw(
      JSON.stringify({ version: 2, docks: [{ id: "d", iconSize: 1 }] }),
      backup,
    );
    expect(backup).toHaveBeenCalledOnce();
    expect(cfg.docks[0]!.iconSize).toBe(56);
  });

  it("keeps a valid config untouched", async () => {
    const backup = vi.fn();
    const cfg = await loadConfigFromRaw(
      JSON.stringify({ version: 2, docks: [{ id: "d", iconSize: 64 }] }),
      backup,
    );
    expect(cfg.docks[0]!.iconSize).toBe(64);
    expect(backup).not.toHaveBeenCalled();
  });
});

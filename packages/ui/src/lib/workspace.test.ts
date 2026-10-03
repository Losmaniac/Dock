import { describe, expect, it } from "vitest";
import type { Placement, WindowInfo, Workspace } from "@glass-dock/shared";
import { captureWorkspace, runWorkspace, type RunnerDeps } from "./workspace";

const win = (path: string, hwnd = "1"): WindowInfo => ({
  hwnd,
  title: "t",
  processName: "a.exe",
  processPath: path,
  focused: false,
  minimized: false,
  elevated: false,
  topmost: false,
});
const P: Placement = { monitorId: "M", x: 0, y: 0, w: 0.5, h: 1, maximized: false };

function fakeDeps(initial: WindowInfo[], appearAfterLaunch = true) {
  const log: string[] = [];
  let windows = [...initial];
  let t = 0;
  const deps: RunnerDeps = {
    launch: async (item) => {
      log.push(`launch:${"path" in item ? item.path : ""}`);
      if (appearAfterLaunch && item.type === "app")
        windows.push(win(item.path, String(windows.length + 10)));
    },
    listWindows: async () => windows,
    snap: async (h, l) => void log.push(`snap:${h}:${l}`),
    place: async (h) => void log.push(`place:${h}`),
    setMuted: async (m) => void log.push(`mute:${m}`),
    sleep: async (ms) => void (t += ms),
    now: () => t,
  };
  return { deps, log, setWindows: (w: WindowInfo[]) => (windows = w) };
}

const ws = (steps: Workspace["steps"]): Workspace => ({ id: "w", name: "Work", steps });

describe("runWorkspace", () => {
  it("launches, waits for the window, then places it", async () => {
    const { deps, log } = fakeDeps([]);
    const r = await runWorkspace(
      ws([
        { type: "launch", target: { type: "app", path: "C:\\a.exe", args: [] } },
        { type: "place", match: { path: "C:\\a.exe" }, placement: P },
        { type: "mute", muted: true },
      ]),
      deps,
    );
    expect(r).toEqual({ done: 3, failures: [] });
    expect(log).toEqual(["launch:C:\\a.exe", "place:10", "mute:true"]);
  });

  it("does not start a second copy of a running app", async () => {
    const { deps, log } = fakeDeps([win("C:\\a.exe")]);
    await runWorkspace(
      ws([{ type: "launch", target: { type: "app", path: "c:\\A.EXE", args: [] } }]),
      deps,
    );
    expect(log).toEqual([]);
  });

  it("records a timeout and keeps going", async () => {
    const { deps, log } = fakeDeps([], false);
    const r = await runWorkspace(
      ws([
        { type: "snap", match: { path: "C:\\never.exe" }, layout: "left-half" },
        { type: "mute", muted: false },
      ]),
      deps,
      { timeoutMs: 1000, pollMs: 250 },
    );
    expect(r.done).toBe(1);
    expect(r.failures[0]).toContain("window did not appear");
    expect(log).toEqual(["mute:false"]);
  });
});

describe("captureWorkspace", () => {
  it("captures one launch+place pair per app, skipping minimized and elevated windows", async () => {
    const list = [
      win("C:\\a.exe", "1"),
      win("C:\\a.exe", "2"),
      { ...win("C:\\b.exe", "3"), minimized: true },
      { ...win("C:\\c.exe", "4"), elevated: true },
    ];
    const out = await captureWorkspace("Snap", "id", list, async () => P);
    expect(out.steps.map((s) => s.type)).toEqual(["launch", "place"]);
    expect(out.steps[1]).toMatchObject({ match: { path: "C:\\a.exe" } });
  });
});

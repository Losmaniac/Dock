import { describe, expect, it } from "vitest";
import type { DockItem, WindowInfo } from "@glass-dock/shared";
import { buildEntries, clickAction } from "./entries";

const win = (o: Partial<WindowInfo>): WindowInfo => ({
  hwnd: "1",
  title: "t",
  processName: "a.exe",
  processPath: "C:\\A\\a.exe",
  focused: false,
  minimized: false,
  elevated: false,
  ...o,
});
const app = (id: string, path: string): DockItem => ({
  id,
  type: "app",
  label: id,
  path,
  args: [],
});

describe("buildEntries", () => {
  it("merges running windows into pinned items without duplicates (case-insensitive)", () => {
    const { pinned, running } = buildEntries(
      [app("a", "c:\\a\\A.EXE")],
      [win({ hwnd: "1" }), win({ hwnd: "2" })],
    );
    expect(running).toHaveLength(0);
    expect(pinned[0]).toMatchObject({ kind: "app" });
    expect(pinned[0]!.kind === "app" && pinned[0]!.windows).toHaveLength(2);
  });

  it("groups unpinned windows by process into one item", () => {
    const { running } = buildEntries(
      [],
      [
        win({ hwnd: "1", processPath: "C:\\B\\b.exe", processName: "b.exe" }),
        win({ hwnd: "2", processPath: "C:\\B\\b.exe", processName: "b.exe" }),
        win({ hwnd: "3", processPath: "C:\\C\\c.exe", processName: "c.exe" }),
      ],
    );
    expect(running).toHaveLength(2);
    expect(running[0]).toMatchObject({ label: "b" });
    expect(running[0]!.kind === "running" && running[0]!.windows).toHaveLength(2);
  });

  it("separates Store apps hosted by the same process using the AUMID", () => {
    const host = "C:\\Windows\\System32\\ApplicationFrameHost.exe";
    const { running } = buildEntries(
      [],
      [
        win({ processPath: host, aumid: "Calc!App" }),
        win({ processPath: host, aumid: "Photos!App" }),
      ],
    );
    expect(running).toHaveLength(2);
  });

  it("keeps non-app items in place", () => {
    const { pinned } = buildEntries([{ id: "s", type: "separator" }], []);
    expect(pinned[0]).toMatchObject({ kind: "other", id: "s" });
  });
});

describe("clickAction", () => {
  it("launches when nothing runs", () => expect(clickAction([])).toEqual({ type: "launch" }));
  it("focuses an unfocused window, preferring a non-minimized one", () =>
    expect(clickAction([win({ hwnd: "1", minimized: true }), win({ hwnd: "2" })])).toEqual({
      type: "focus",
      hwnd: "2",
    }));
  it("minimizes the focused window", () =>
    expect(clickAction([win({ hwnd: "1" }), win({ hwnd: "2", focused: true })])).toEqual({
      type: "minimize",
      hwnd: "2",
    }));
});

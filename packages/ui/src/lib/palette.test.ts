import { describe, expect, it } from "vitest";
import type { DockItem, WindowInfo } from "@glass-dock/shared";
import { buildEntries } from "./entries";
import { buildPaletteItems } from "./palette";

const w: WindowInfo = {
  hwnd: "5",
  title: "Report.docx - Word",
  processName: "WINWORD.EXE",
  processPath: "C:\\w\\WINWORD.EXE",
  focused: false,
  minimized: false,
  elevated: false,
  topmost: false,
};
const app: DockItem = { id: "a", type: "app", label: "Notepad", path: "C:\\n.exe", args: [] };

describe("buildPaletteItems", () => {
  const { pinned, running } = buildEntries([app, { id: "s", type: "separator" }], [w]);
  const all = buildPaletteItems([...pinned, ...running], [w], true);

  it("lists apps, windows and actions", () => {
    expect(all.filter((i) => i.group === "App").map((i) => i.title)).toEqual([
      "Notepad",
      "WINWORD",
    ]);
    expect(all.some((i) => i.group === "Window" && i.title.startsWith("Report"))).toBe(true);
    expect(all.some((i) => i.title === "Open settings")).toBe(true);
  });
  it("offers snap actions only when there is a window to snap", () => {
    expect(all.some((i) => i.title.startsWith("Snap:"))).toBe(true);
    expect(buildPaletteItems([], [], false).some((i) => i.title.startsWith("Snap:"))).toBe(false);
  });
  it("skips separators and widgets", () => expect(all.some((i) => i.id === "entry:s")).toBe(false));
});

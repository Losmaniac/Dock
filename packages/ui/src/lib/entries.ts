import type { DockItem, WindowInfo } from "@glass-dock/shared";

type AppItem = Extract<DockItem, { type: "app" }>;

export type Entry =
  | { kind: "app"; id: string; item: AppItem; windows: WindowInfo[] }
  | {
      kind: "running";
      id: string;
      key: string;
      label: string;
      path: string;
      aumid: string | null;
      windows: WindowInfo[];
    }
  | { kind: "other"; id: string; item: Exclude<DockItem, AppItem> };

export const windowKey = (w: Pick<WindowInfo, "aumid" | "processPath">): string =>
  w.aumid ? `aumid:${w.aumid.toLowerCase()}` : `path:${w.processPath.toLowerCase()}`;

export const itemKey = (i: Pick<AppItem, "aumid" | "path">): string =>
  i.aumid ? `aumid:${i.aumid.toLowerCase()}` : `path:${i.path.toLowerCase()}`;

const stripExe = (n: string) => n.replace(/\.exe$/i, "");

/** Pinned items keep config order; running apps that are not pinned follow, grouped by process. */
export function buildEntries(
  items: DockItem[],
  windows: WindowInfo[],
): { pinned: Entry[]; running: Entry[] } {
  const byKey = new Map<string, WindowInfo[]>();
  for (const w of windows) {
    const k = windowKey(w);
    byKey.set(k, [...(byKey.get(k) ?? []), w]);
  }
  const used = new Set<string>();
  const pinned: Entry[] = items.map((item) => {
    if (item.type !== "app") return { kind: "other", id: item.id, item };
    const k = itemKey(item);
    used.add(k);
    return { kind: "app", id: item.id, item, windows: byKey.get(k) ?? [] };
  });
  const running: Entry[] = [...byKey.entries()]
    .filter(([k]) => !used.has(k))
    .map(([key, ws]) => {
      const first = ws[0]!;
      return {
        kind: "running" as const,
        id: `run:${key}`,
        key,
        label: stripExe(first.processName) || first.title,
        path: first.processPath,
        aumid: first.aumid ?? null,
        windows: ws,
      };
    });
  return { pinned, running };
}

export type ClickAction =
  { type: "launch" } | { type: "focus"; hwnd: string } | { type: "minimize"; hwnd: string };

/** not running -> launch; running unfocused -> focus; focused -> minimize. */
export function clickAction(windows: WindowInfo[]): ClickAction {
  if (windows.length === 0) return { type: "launch" };
  const focused = windows.find((w) => w.focused);
  if (focused) return { type: "minimize", hwnd: focused.hwnd };
  const target = windows.find((w) => !w.minimized) ?? windows[0]!;
  return { type: "focus", hwnd: target.hwnd };
}

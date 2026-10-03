import type { WindowInfo, Workspace } from "@glass-dock/shared";
import { SNAP_LAYOUTS, ACTION_IDS, snapActionId, wsActionId } from "./actions";
import type { Entry } from "./entries";

export interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  group: "App" | "Window" | "Action";
  /** What running it does; interpreted by the palette component. */
  run:
    | { type: "entry"; entryId: string }
    | { type: "window"; hwnd: string }
    | { type: "action"; actionId: string };
}

const labelOf = (e: Entry): string | null =>
  e.kind === "app"
    ? e.item.label
    : e.kind === "running"
      ? e.label
      : e.item.type === "folder" || e.item.type === "url"
        ? e.item.label
        : null;

export function buildPaletteItems(
  entries: Entry[],
  windows: WindowInfo[],
  hasTarget: boolean,
  workspaces: Workspace[] = [],
): PaletteItem[] {
  const items: PaletteItem[] = [];
  for (const e of entries) {
    const title = labelOf(e);
    if (title)
      items.push({
        id: `entry:${e.id}`,
        title,
        subtitle: e.kind === "other" ? e.item.type : "Open or focus",
        group: "App",
        run: { type: "entry", entryId: e.id },
      });
  }
  for (const w of windows) {
    items.push({
      id: `win:${w.hwnd}`,
      title: w.title,
      subtitle: w.processName,
      group: "Window",
      run: { type: "window", hwnd: w.hwnd },
    });
  }
  for (const w of workspaces)
    items.push({
      id: `ws:${w.id}`,
      title: `Workspace: ${w.name}`,
      subtitle: `${w.steps.length} steps`,
      group: "Action",
      run: { type: "action", actionId: wsActionId(w.id) },
    });
  items.push(
    {
      id: "act:switcher",
      title: "Window switcher",
      subtitle: "All windows by app",
      group: "Action",
      run: { type: "action", actionId: ACTION_IDS.switcher },
    },
    {
      id: "act:settings",
      title: "Open settings",
      subtitle: "Dock",
      group: "Action",
      run: { type: "action", actionId: ACTION_IDS.settings },
    },
    {
      id: "act:autohide",
      title: "Toggle auto-hide",
      subtitle: "Dock",
      group: "Action",
      run: { type: "action", actionId: ACTION_IDS.toggleAutoHide },
    },
  );
  if (hasTarget) {
    for (const s of SNAP_LAYOUTS)
      items.push({
        id: `snap:${s.layout}`,
        title: `Snap: ${s.label}`,
        subtitle: "Previously focused window",
        group: "Action",
        run: { type: "action", actionId: snapActionId(s.layout) },
      });
  }
  return items;
}

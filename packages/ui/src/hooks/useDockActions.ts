import { useCallback } from "react";
import type { LaunchItem, WindowInfo } from "@glass-dock/shared";
import { OPACITY_STEPS, SNAP_LAYOUTS, ACTION_IDS, parseAction } from "../lib/actions";
import { buildEntries, clickAction, type Entry } from "../lib/entries";
import { runWorkspace } from "../lib/workspace";
import type { AppEntry } from "../lib/overlay";
import type { MenuAction } from "../components/ContextMenu";
import { messageOf, useDock } from "../store/dockStore";

export const launchItemOf = (e: AppEntry): LaunchItem => {
  const aumid = e.kind === "app" ? e.item.aumid : e.aumid;
  if (aumid) return { type: "uwp", aumid };
  return e.kind === "app"
    ? { type: "app", path: e.item.path, args: e.item.args }
    : { type: "app", path: e.path };
};

/** The window actions apply to: focused first, then any visible one. */
export const pickTarget = (ws: WindowInfo[]): WindowInfo | undefined =>
  ws.find((w) => w.focused) ?? ws.find((w) => !w.minimized) ?? ws[0];

/** User intent -> platform calls. Errors surface as toasts, never silently. */
export function useDockActions() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const setOpen = useDock((s) => s.setOpen);

  const run = useCallback(
    (p: Promise<unknown>) => void p.catch((e) => report(messageOf(e))),
    [report],
  );

  const click = useCallback(
    (e: AppEntry) => {
      const a = clickAction(e.windows);
      if (a.type === "launch") run(platform.launch(launchItemOf(e)));
      else if (a.type === "focus") run(platform.focusWindow(a.hwnd));
      else run(platform.minimizeWindow(a.hwnd));
    },
    [platform, run],
  );

  const newInstance = useCallback(
    (e: AppEntry) => run(platform.launch(launchItemOf(e))),
    [platform, run],
  );

  const activate = useCallback(
    (e: Entry) => {
      if (e.kind !== "other") return click(e);
      const it = e.item;
      if (it.type === "folder") setOpen({ kind: "stack", item: it });
      else if (it.type === "url") run(platform.launch({ type: "url", url: it.url }));
      else if (it.type === "widget") setOpen({ kind: "widget", widget: it.widget });
    },
    [click, platform, run, setOpen],
  );

  const menuFor = useCallback(
    (e: AppEntry): MenuAction[] => {
      const { unpin, pinRunning, monitors } = useDock.getState();
      const label = e.kind === "app" ? e.item.label : e.label;
      const t = pickTarget(e.windows);
      const actions: MenuAction[] = [{ label: "Open new window", onSelect: () => newInstance(e) }];
      if (t) {
        actions.push(
          {
            label: "Always on top",
            checked: t.topmost,
            separatorBefore: true,
            onSelect: () => run(platform.setAlwaysOnTop(t.hwnd, !t.topmost)),
          },
          {
            label: "Snap",
            children: SNAP_LAYOUTS.map((s) => ({
              label: s.label,
              onSelect: () => run(platform.snapWindow(t.hwnd, s.layout)),
            })),
          },
          {
            label: "Opacity",
            children: OPACITY_STEPS.map((v) => ({
              label: `${Math.round(v * 100)} %`,
              onSelect: () => run(platform.setWindowOpacity(t.hwnd, v)),
            })),
          },
        );
        if (monitors.length > 1) {
          actions.push({
            label: "Move to monitor",
            children: monitors.map((m, i) => ({
              label: `${i + 1}${m.primary ? " (primary)" : ""}: ${m.width}×${m.height}`,
              onSelect: () => run(platform.moveWindowToMonitor(t.hwnd, m.id)),
            })),
          });
        }
        actions.push({
          label: e.windows.length > 1 ? `Close all windows (${e.windows.length})` : "Close window",
          danger: true,
          separatorBefore: true,
          onSelect: () => e.windows.forEach((w) => run(platform.closeWindow(w.hwnd))),
        });
      }
      actions.push(
        e.kind === "app"
          ? { label: "Unpin from dock", separatorBefore: !t, onSelect: () => unpin(e.id) }
          : {
              label: "Pin to dock",
              separatorBefore: !t,
              onSelect: () => pinRunning(label, e.path, e.aumid),
            },
        { label: "Properties", onSelect: () => setOpen({ kind: "props", entry: e }) },
      );
      return actions;
    },
    [platform, run, newInstance, setOpen],
  );

  /** Hotkeys and the palette both land here. `target` is the window to snap, if known. */
  const runAction = useCallback(
    (id: string, target: string | null) => {
      const st = useDock.getState();
      const a = parseAction(id);
      if (a.type === "snap") {
        const hwnd = target ?? st.windows.find((w) => w.focused)?.hwnd;
        if (hwnd) run(platform.snapWindow(hwnd, a.layout));
        else report("No window to snap.");
      } else if (a.type === "jump") {
        const { pinned } = buildEntries(st.config.items, st.windows);
        const nth = pinned.filter(
          (p) => p.kind !== "other" || ["folder", "url"].includes(p.item.type),
        )[a.index - 1];
        if (nth) activate(nth);
      } else if (a.type === "workspace") {
        const ws = st.config.workspaces.find((w) => w.id === a.id);
        if (!ws) return report("That workspace no longer exists.");
        void runWorkspace(ws, {
          launch: (item) => platform.launch(item),
          listWindows: () => platform.listWindows(),
          snap: (h, l) => platform.snapWindow(h, l),
          place: (h, pl) => platform.placeWindow(h, pl),
          setMuted: (m) => platform.setMuted("output", m),
          sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
          now: () => Date.now(),
        }).then((r) =>
          report(
            r.failures.length
              ? `Workspace "${ws.name}": ${r.failures.join("; ")}`
              : `Workspace "${ws.name}" applied.`,
          ),
        );
      } else if (a.id === ACTION_IDS.switcher) {
        st.setOpen(st.open?.kind === "switcher" ? null : { kind: "switcher" });
      } else if (a.id === ACTION_IDS.palette) {
        st.setOpen(
          st.open?.kind === "palette"
            ? null
            : { kind: "palette", target: st.windows.find((w) => w.focused)?.hwnd ?? null },
        );
      } else if (a.id === ACTION_IDS.settings) st.setOpen({ kind: "settings" });
      else if (a.id === ACTION_IDS.toggleAutoHide)
        st.edit((d) => void (d.dock.autoHide = !d.dock.autoHide));
    },
    [platform, run, report, activate],
  );

  const runEntry = useCallback(
    (entryId: string) => {
      const st = useDock.getState();
      const { pinned, running } = buildEntries(st.config.items, st.windows);
      const e = [...pinned, ...running].find((x) => x.id === entryId);
      if (e) activate(e);
    },
    [activate],
  );

  return { click, newInstance, activate, menuFor, runAction, runEntry, run };
}

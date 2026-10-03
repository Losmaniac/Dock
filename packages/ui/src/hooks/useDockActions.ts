import { useCallback } from "react";
import type { LaunchItem } from "@glass-dock/shared";
import { clickAction, type Entry } from "../lib/entries";
import type { MenuAction } from "../components/ContextMenu";
import { useDock } from "../store/dockStore";

export const launchItemOf = (e: Extract<Entry, { kind: "app" | "running" }>): LaunchItem => {
  const aumid = e.kind === "app" ? e.item.aumid : e.aumid;
  if (aumid) return { type: "uwp", aumid };
  return e.kind === "app"
    ? { type: "app", path: e.item.path, args: e.item.args }
    : { type: "app", path: e.path };
};

/** User intent -> platform calls. Errors surface as toasts, never silently. */
export function useDockActions() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const { unpin, pinRunning } = useDock.getState();

  const run = useCallback((p: Promise<unknown>) => void p.catch(report), [report]);

  const click = useCallback(
    (e: Extract<Entry, { kind: "app" | "running" }>) => {
      const a = clickAction(e.windows);
      if (a.type === "launch") run(platform.launch(launchItemOf(e)));
      else if (a.type === "focus") run(platform.focusWindow(a.hwnd));
      else run(platform.minimizeWindow(a.hwnd));
    },
    [platform, run],
  );

  const newInstance = useCallback(
    (e: Extract<Entry, { kind: "app" | "running" }>) => run(platform.launch(launchItemOf(e))),
    [platform, run],
  );

  const menuFor = useCallback(
    (e: Extract<Entry, { kind: "app" | "running" }>): MenuAction[] => {
      const label = e.kind === "app" ? e.item.label : e.label;
      const actions: MenuAction[] = [{ label: "Open new window", onSelect: () => newInstance(e) }];
      if (e.windows.length > 0) {
        actions.push({
          label: e.windows.length > 1 ? `Close all windows (${e.windows.length})` : "Close window",
          danger: true,
          onSelect: () => e.windows.forEach((w) => run(platform.closeWindow(w.hwnd))),
        });
      }
      actions.push(
        e.kind === "app"
          ? { label: "Unpin from dock", separatorBefore: true, onSelect: () => unpin(e.id) }
          : {
              label: "Pin to dock",
              separatorBefore: true,
              onSelect: () => pinRunning(label, e.path, e.aumid),
            },
      );
      return actions;
    },
    [platform, run, newInstance, unpin, pinRunning],
  );

  return { click, newInstance, menuFor, run };
}

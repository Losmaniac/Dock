import type { DockConfig } from "@glass-dock/shared";
import { ACTION_IDS, jumpActionId, snapActionId, wsActionId } from "./actions";
import { SNAP_LAYOUTS } from "./actions";

/** Every accelerator the config asks for, keyed by action id. Empty entries are skipped. */
export function desiredHotkeys(
  h: DockConfig["hotkeys"],
  workspaces: DockConfig["workspaces"] = [],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (h.toggleDock) out[ACTION_IDS.toggleDock] = h.toggleDock;
  if (h.commandPalette) out[ACTION_IDS.palette] = h.commandPalette;
  if (h.switcher) out[ACTION_IDS.switcher] = h.switcher;
  if (h.focusDock) out[ACTION_IDS.focusDock] = h.focusDock;
  for (const w of workspaces) if (w.hotkey) out[wsActionId(w.id)] = w.hotkey;
  if (h.jumpModifier) for (let n = 1; n <= 9; n++) out[jumpActionId(n)] = `${h.jumpModifier}+${n}`;
  for (const { layout } of SNAP_LAYOUTS) {
    const accel = h.snap[layout];
    if (accel) out[snapActionId(layout)] = accel;
  }
  return out;
}

/** Actions to unregister (present before, absent now) and to (re)register (new or changed). */
export function diffHotkeys(prev: Record<string, string>, next: Record<string, string>) {
  const remove = Object.keys(prev).filter((id) => !(id in next));
  const set = Object.entries(next).filter(([id, a]) => prev[id] !== a);
  return { remove, set };
}

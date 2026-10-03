import { useEffect, useRef } from "react";
import { desiredHotkeys, diffHotkeys } from "../lib/hotkeys";
import { messageOf, useDock } from "../store/dockStore";

/** Keeps OS-level hotkeys in sync with config. Registration failures are shown, never swallowed. */
export function useHotkeys(runAction: (id: string, target: string | null) => void, enabled = true) {
  const platform = useDock((s) => s.platform)!;
  const ready = useDock((s) => s.ready);
  const key = useDock((s) => JSON.stringify(desiredHotkeys(s.config.hotkeys, s.config.workspaces)));
  const registered = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!ready || !enabled) return;
    const { remove, set } = diffHotkeys(
      registered.current,
      JSON.parse(key) as Record<string, string>,
    );
    for (const id of remove) {
      delete registered.current[id];
      platform.registerHotkey("", id).catch(() => {});
    }
    for (const [id, accel] of set) {
      platform
        .registerHotkey(accel, id)
        .then(() => void (registered.current[id] = accel))
        .catch((e) => useDock.getState().report(messageOf(e)));
    }
  }, [platform, ready, enabled, key]);

  useEffect(
    () => (enabled ? platform.onHotkey((id) => runAction(id, null)) : undefined),
    [platform, runAction, enabled],
  );
}

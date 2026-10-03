import { useEffect } from "react";
import { itemKey, type Entry } from "../lib/entries";
import { useDock } from "../store/dockStore";

/** Request icons for every visible app entry (cached by the store and by Rust on disk). */
export function useEntryIcons(pinned: Entry[], running: Entry[]) {
  const loadIcon = useDock((s) => s.loadIcon);
  useEffect(() => {
    for (const e of [...pinned, ...running]) {
      if (e.kind === "app")
        loadIcon(itemKey(e.item), e.item.aumid ? { aumid: e.item.aumid } : { path: e.item.path });
      else if (e.kind === "running")
        loadIcon(e.key, e.aumid ? { aumid: e.aumid } : { path: e.path });
    }
  }, [pinned, running, loadIcon]);
}

/** Keeps native window state in sync with UI state: blur, focusability, Escape to close. */
export function useShellSync(needsKeyboard: boolean, closeOverlay: () => void) {
  const platform = useDock((s) => s.platform)!;
  const blur = useDock((s) => (s.config.appearance.solid ? "none" : s.config.appearance.blurMode));

  useEffect(() => {
    void platform.setBlurMode(blur).catch(() => {});
  }, [platform, blur]);

  useEffect(() => {
    void platform.setFocusable(needsKeyboard).catch(() => {});
  }, [platform, needsKeyboard]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeOverlay();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOverlay]);
}

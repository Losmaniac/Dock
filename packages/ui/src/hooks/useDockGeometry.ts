import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { DockDef } from "@glass-dock/shared";
import { computeGeometry } from "../lib/geometry";
import { useDock } from "../store/dockStore";

export interface Overlay {
  w: number;
  h: number;
  fullscreen?: boolean;
}

/**
 * Owns hover / auto-hide state and keeps the native window sized to what is on screen.
 * The window only grows while something needs room (hover headroom, menus, panels).
 */
export function useDockGeometry(
  navRef: RefObject<HTMLElement | null>,
  dock: DockDef,
  overlay: Overlay | null,
  ready: boolean,
) {
  const platform = useDock((s) => s.platform);
  // New array identity on every monitors-changed event (display layout or work area changed).
  const monitors = useDock((s) => s.monitors);
  const [nav, setNav] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState(false);
  const [revealed, setRevealed] = useState(!dock.autoHide);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const later = (name: string, ms: number, fn: () => void) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = setTimeout(fn, ms);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!ready || !el) return;
    const measure = () => setNav({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [navRef, ready]);

  useEffect(() => {
    if (!dock.autoHide) setRevealed(true);
    else if (!hovered && !overlay) setRevealed(false);
  }, [dock.autoHide, hovered, overlay]);

  const enter = useCallback(() => {
    clearTimeout(timers.current.leave);
    setHovered(true);
    if (dock.autoHide) later("reveal", dock.autoHideDelay, () => setRevealed(true));
  }, [dock.autoHide, dock.autoHideDelay]);

  const leave = useCallback(() => {
    clearTimeout(timers.current.reveal);
    later("leave", dock.autoHide ? 500 : 120, () => {
      setHovered(false);
      if (dock.autoHide) setRevealed(false);
    });
  }, [dock.autoHide]);

  const geometry = computeGeometry({
    position: dock.position,
    autoHide: dock.autoHide,
    revealed,
    hovered,
    overlay,
    nav,
    iconSize: dock.iconSize,
    magnification: dock.magnification,
    monitor: dock.monitor,
    reserveSpace: dock.reserveSpace,
  });
  const key = JSON.stringify(geometry);
  useEffect(() => {
    if (nav.w === 0 || !platform) return;
    platform.setDockGeometry(JSON.parse(key)).catch((e) => useDock.getState().report(e));
  }, [key, nav.w, platform, monitors]);

  return { hidden: dock.autoHide && !revealed && !overlay, enter, leave, nav };
}

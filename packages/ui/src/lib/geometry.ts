import type { DockGeometry, DockPosition } from "@glass-dock/shared";

export interface GeometryInput {
  position: DockPosition;
  autoHide: boolean;
  revealed: boolean;
  hovered: boolean;
  overlay: { w: number; h: number } | null;
  /** Measured layout size of the dock bar. */
  nav: { w: number; h: number };
  iconSize: number;
  magnification: number;
}

export const TOOLTIP_ROOM = 36;
export const OVERLAY_GAP = 12;
export const EDGE_GAP = 8;

export const isHorizontal = (p: DockPosition) => p === "bottom" || p === "top";

/**
 * Decide how big the dock window must be. The transparent part of the window blocks clicks on
 * apps underneath (AGENTS.md pitfall 5), so it only grows while something needs the room.
 */
export function computeGeometry(i: GeometryInput): DockGeometry {
  const horizontal = isHorizontal(i.position);
  const along = horizontal ? i.nav.w : i.nav.h;
  const across = horizontal ? i.nav.h : i.nav.w;
  const margin = i.autoHide ? 0 : EDGE_GAP;
  const base = { position: i.position, margin };

  if (i.autoHide && !i.revealed && !i.overlay) {
    return { ...base, mode: "hidden", length: along, thickness: across };
  }
  if (i.overlay) {
    // The panel direction follows the dock: it grows away from the screen edge.
    const overlayAlong = horizontal ? i.overlay.w : i.overlay.w;
    return {
      ...base,
      mode: "active",
      length: Math.max(along, overlayAlong),
      thickness: across + OVERLAY_GAP + i.overlay.h,
    };
  }
  if (i.hovered) {
    const headroom = Math.round(i.iconSize * (i.magnification - 1)) + TOOLTIP_ROOM;
    return { ...base, mode: "active", length: along, thickness: across + headroom };
  }
  return { ...base, mode: "rest", length: along, thickness: across };
}

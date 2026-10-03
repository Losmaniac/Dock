import type { CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import { isHorizontal } from "../lib/geometry";

/** Invisible strip on the screen edge that reveals an auto-hidden dock. */
export function HotEdge(p: { position: DockPosition; enter: () => void; leave: () => void }) {
  const style: CSSProperties = isHorizontal(p.position)
    ? { left: 0, right: 0, height: 6 }
    : { top: 0, bottom: 0, width: 6 };
  return (
    <div
      aria-hidden
      className="absolute"
      onPointerEnter={p.enter}
      onPointerLeave={p.leave}
      style={{ [p.position]: 0, ...style }}
    />
  );
}

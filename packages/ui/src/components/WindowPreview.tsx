import type { CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import { isHorizontal, OVERLAY_GAP } from "../lib/geometry";
import type { AppEntry } from "../lib/overlay";
import { useDock } from "../store/dockStore";
import { WindowThumb } from "./WindowThumb";

export const THUMB = { w: 176, h: 108 };
const MAX = 4;

export const previewSize = (e: AppEntry) => {
  const n = Math.min(e.windows.length, MAX);
  return { w: n * (THUMB.w + 12) + 16, h: THUMB.h + 64 };
};

/** Anchor is relative to the dock bar, so it stays valid while the window resizes around it. */
export function WindowPreview(p: {
  entry: AppEntry;
  position: DockPosition;
  across: number;
  navLength: number;
  anchor: number; // item center along the bar, px from the bar start
  keep: () => void;
  leave: () => void;
}) {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const size = previewSize(p.entry);
  const horizontal = isHorizontal(p.position);
  const span = horizontal ? size.w : size.h;
  const extra = Math.max(0, span - p.navLength);
  const along = Math.min(Math.max(p.anchor - span / 2, -extra / 2), p.navLength - span + extra / 2);
  const off = p.across + OVERLAY_GAP;
  const style: CSSProperties = {
    position: "absolute",
    width: size.w,
    ...(p.position === "bottom" && { bottom: off, left: along }),
    ...(p.position === "top" && { top: off, left: along }),
    ...(p.position === "left" && { left: off, top: along }),
    ...(p.position === "right" && { right: off, top: along }),
  };
  const shown = p.entry.windows.slice(0, MAX);
  return (
    <div
      className="panel z-20 flex flex-col p-2"
      style={style}
      onPointerEnter={p.keep}
      onPointerLeave={p.leave}
    >
      <div className="flex gap-1.5">
        {shown.map((w) => (
          <WindowThumb
            key={w.hwnd}
            win={w}
            w={THUMB.w}
            h={THUMB.h}
            onClick={() => platform.focusWindow(w.hwnd).catch((e) => report(e))}
          />
        ))}
      </div>
      {p.entry.windows.length > MAX && (
        <span className="px-1 pt-1 text-xs opacity-60">+{p.entry.windows.length - MAX} more</span>
      )}
    </div>
  );
}

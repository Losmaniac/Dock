import { useRef } from "react";
import type { WindowInfo } from "@glass-dock/shared";
import { useThumbnail } from "../hooks/useThumbnail";

/** Reserves a rectangle; Rust composites the live window image into it (not DOM content). */
export function WindowThumb({
  win,
  w,
  h,
  label,
  onClick,
}: {
  win: WindowInfo;
  w: number;
  h: number;
  label?: string;
  onClick: () => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  useThumbnail(slot, win.hwnd, !win.minimized);
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 rounded-lg p-1 text-left hover:bg-white/15 focus-visible:bg-white/15"
      style={{ width: w + 8 }}
      title={win.title}
    >
      <div
        ref={slot}
        style={{ width: w, height: h }}
        className="flex items-center justify-center rounded bg-black/30 text-xs opacity-90"
      >
        {win.minimized ? "Minimized" : null}
      </div>
      <span className="truncate text-xs">{win.title}</span>
      {label && <span className="truncate text-[10px] opacity-60">{label}</span>}
    </button>
  );
}

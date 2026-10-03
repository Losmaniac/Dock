import { useEffect, useMemo, useRef, useState } from "react";
import { windowKey } from "../lib/entries";
import { useDock } from "../store/dockStore";
import { WindowThumb } from "./WindowThumb";

const MAX = 12;

/** Full-screen window switcher, grouped by app. Arrow keys / Tab move, Enter focuses, Esc closes. */
export function Switcher({ close }: { close: () => void }) {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const windows = useDock((s) => s.windows);
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const groups = useMemo(() => {
    const by = new Map<string, typeof windows>();
    for (const w of windows) by.set(windowKey(w), [...(by.get(windowKey(w)) ?? []), w]);
    let left = MAX;
    return [...by.values()]
      .map((ws) => ws.slice(0, left))
      .map((ws) => ((left -= ws.length), ws))
      .filter((ws) => ws.length);
  }, [windows]);
  const flat = groups.flat();

  useEffect(() => root.current?.focus(), []);

  const pick = (i: number) => {
    const w = flat[i];
    close();
    if (w) platform.focusWindow(w.hwnd).catch(report);
  };

  const move = (d: number) =>
    setIndex((i) => (flat.length ? (i + d + flat.length) % flat.length : 0));

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-label="Window switcher"
      onClick={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
          e.preventDefault();
          move(1);
        } else if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowUp" ||
          (e.key === "Tab" && e.shiftKey)
        ) {
          e.preventDefault();
          move(-1);
        } else if (e.key === "Enter") pick(index);
      }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/45 p-10 outline-none"
    >
      {groups.map((ws) => (
        <div key={ws[0]!.hwnd} className="flex flex-col items-center gap-1">
          <span className="text-sm opacity-80">{ws[0]!.processName.replace(/\.exe$/i, "")}</span>
          <div className="flex gap-3">
            {ws.map((w) => (
              <div
                key={w.hwnd}
                className={`rounded-xl ${flat[index]?.hwnd === w.hwnd ? "ring-2 ring-accent" : ""}`}
                onMouseEnter={() => setIndex(flat.indexOf(w))}
              >
                <WindowThumb win={w} w={220} h={130} onClick={() => pick(flat.indexOf(w))} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {flat.length === 0 && <p className="text-lg">No windows</p>}
      {windows.length > MAX && (
        <p className="text-xs opacity-70">
          Showing {MAX} of {windows.length} windows
        </p>
      )}
    </div>
  );
}

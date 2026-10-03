import { useEffect, useMemo, useRef, useState } from "react";
import { buildEntries } from "../lib/entries";
import { rank } from "../lib/fuzzy";
import { buildPaletteItems, type PaletteItem } from "../lib/palette";
import { useDock } from "../store/dockStore";

export const PALETTE_SIZE = { w: 560, h: 380 };

export function CommandPalette(props: {
  target: string | null;
  close: () => void;
  runEntry: (entryId: string) => void;
  runAction: (actionId: string, target: string | null) => void;
}) {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const items = useDock((s) => s.config.items);
  const windows = useDock((s) => s.windows);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const all = useMemo(() => {
    const { pinned, running } = buildEntries(items, windows);
    return buildPaletteItems([...pinned, ...running], windows, props.target !== null);
  }, [items, windows, props.target]);
  const results = useMemo(() => rank(all, query, (i) => `${i.title} ${i.subtitle}`), [all, query]);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setIndex(0), [query]);

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    props.close();
    if (item.run.type === "entry") props.runEntry(item.run.entryId);
    else if (item.run.type === "window") platform.focusWindow(item.run.hwnd).catch(report);
    else props.runAction(item.run.actionId, props.target);
  };

  return (
    <div
      className="panel flex flex-col p-3"
      style={{ width: PALETTE_SIZE.w, height: PALETTE_SIZE.h }}
      role="dialog"
      aria-label="Command palette"
    >
      <input
        ref={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") run(results[index]);
        }}
        placeholder="Search apps, windows and actions…"
        aria-label="Search"
        className="mb-2 rounded-lg bg-white/15 px-3 py-2 text-base outline-none placeholder:opacity-60"
      />
      <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto">
        {results.map((r, i) => (
          <li
            key={r.id}
            role="option"
            aria-selected={i === index}
            onMouseEnter={() => setIndex(i)}
            onClick={() => run(r)}
            className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-sm ${i === index ? "bg-white/20" : ""}`}
          >
            <span className="truncate">{r.title}</span>
            <span className="ml-3 shrink-0 text-xs opacity-60">
              {r.group} · {r.subtitle}
            </span>
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-2 text-sm opacity-60">No results</li>}
      </ul>
    </div>
  );
}

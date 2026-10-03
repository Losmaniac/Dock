import { LayoutGrid } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DocHit, RecentFile, StartApp } from "@glass-dock/shared";
import { buildSections, categoriesOf, type Row } from "../lib/launcher";
import { itemKey } from "../lib/entries";
import { messageOf, useDock } from "../store/dockStore";

export const LAUNCHER_SIZE = { w: 640, h: 540 };

const iconKey = (r: Row) =>
  r.kind === "app" ? (r.app.aumid ?? r.app.path ?? r.title) : r.kind === "file" ? r.path : "";

export function Launcher({ close }: { close: () => void }) {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const items = useDock((s) => s.config.items);
  const icons = useDock((s) => s.icons);
  const loadIcon = useDock((s) => s.loadIcon);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [apps, setApps] = useState<StartApp[]>([]);
  const [recents, setRecents] = useState<RecentFile[]>([]);
  const [docs, setDocs] = useState<DocHit[]>([]);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    void platform
      .getStartApps()
      .then(setApps)
      .catch((e) => report(messageOf(e)));
    void platform
      .getRecentFiles()
      .then(setRecents)
      .catch(() => {});
  }, [platform, report]);

  // Document search is debounced and runs only for a non-empty query.
  useEffect(() => {
    if (!query.trim()) return setDocs([]);
    let alive = true;
    const t = setTimeout(
      () =>
        void platform
          .searchDocuments(query)
          .then((d) => alive && setDocs(d))
          .catch(() => {}),
      120,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [platform, query]);

  const pinned = useMemo(() => {
    const keys = new Set(items.flatMap((i) => (i.type === "app" ? [itemKey(i)] : [])));
    return apps.filter((a) =>
      keys.has(a.aumid ? `aumid:${a.aumid.toLowerCase()}` : `path:${(a.path ?? "").toLowerCase()}`),
    );
  }, [items, apps]);

  const sections = useMemo(
    () => buildSections({ query, category, apps, pinned, recents, docs }),
    [query, category, apps, pinned, recents, docs],
  );
  const flat = sections.flatMap((s) => s.rows);

  useEffect(() => setIndex(0), [query, category]);
  useEffect(() => {
    for (const r of flat.slice(0, 40)) {
      const k = iconKey(r);
      if (!k) continue;
      loadIcon(k, r.kind === "app" && r.app.aumid ? { aumid: r.app.aumid } : { path: k });
    }
  }, [flat, loadIcon]);

  const run = (r: Row | undefined) => {
    if (!r) return;
    close();
    const done = (p: Promise<unknown>) => void p.catch((e) => report(messageOf(e)));
    if (r.kind === "app")
      done(
        platform.launch(
          r.app.aumid
            ? { type: "uwp", aumid: r.app.aumid }
            : {
                type: r.app.path?.toLowerCase().endsWith(".exe") ? "app" : "file",
                path: r.app.path ?? "",
              },
        ),
      );
    else if (r.kind === "file")
      done(
        platform.launch(
          r.isDir ? { type: "folder", path: r.path } : { type: "file", path: r.path },
        ),
      );
    else if (r.kind === "settings") done(platform.launch({ type: "settings", page: r.page }));
    else useDock.getState().setOpen({ kind: "settings" });
  };

  let n = -1;
  return (
    <div
      className="panel flex flex-col p-3"
      style={{ width: LAUNCHER_SIZE.w, height: LAUNCHER_SIZE.h }}
      role="dialog"
      aria-label="Launcher"
    >
      <input
        ref={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search apps, files and settings"
        placeholder="Search apps, files and settings…"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") run(flat[index]);
        }}
        className="mb-2 rounded-lg bg-white/15 px-3 py-2 text-base outline-none placeholder:opacity-60"
      />
      {!query && (
        <div className="mb-2 flex flex-wrap gap-1" role="tablist" aria-label="Categories">
          <button
            role="tab"
            aria-selected={category === null}
            onClick={() => setCategory(null)}
            className={`rounded-full px-2.5 py-0.5 text-xs ${category === null ? "bg-accent text-white" : "bg-white/15 hover:bg-white/25"}`}
          >
            Home
          </button>
          {categoriesOf(apps).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-2.5 py-0.5 text-xs ${category === c ? "bg-accent text-white" : "bg-white/15 hover:bg-white/25"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div role="listbox" className="min-h-0 flex-1 overflow-y-auto">
        {sections.map((s) => (
          <section key={s.heading} className="mb-2">
            <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              {s.heading}
            </h3>
            {s.rows.map((r) => {
              const i = ++n;
              const icon = icons[iconKey(r)];
              return (
                <div
                  key={r.id}
                  role="option"
                  aria-selected={i === index}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => run(r)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${i === index ? "bg-white/20" : ""}`}
                >
                  {icon ? (
                    <img src={icon} alt="" className="h-7 w-7 shrink-0" draggable={false} />
                  ) : (
                    <LayoutGrid size={22} className="shrink-0 opacity-50" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <span className="max-w-[45%] shrink-0 truncate text-xs opacity-60">
                    {r.subtitle}
                  </span>
                </div>
              );
            })}
          </section>
        ))}
        {sections.length === 0 && <p className="px-2 py-3 text-sm opacity-60">No results</p>}
      </div>
    </div>
  );
}

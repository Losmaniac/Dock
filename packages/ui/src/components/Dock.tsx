import { motion, Reorder, useMotionValue } from "framer-motion";
import { Globe, Settings } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import { buildEntries, itemKey, type Entry } from "../lib/entries";
import { isHorizontal } from "../lib/geometry";
import { themeVars } from "../lib/theme";
import { useEntryIcons, useShellSync } from "../hooks/useShellSync";
import { useDockActions } from "../hooks/useDockActions";
import { useDockGeometry } from "../hooks/useDockGeometry";
import { useFileDrop } from "../hooks/useFileDrop";
import { useDock } from "../store/dockStore";
import { ClockWidget } from "./ClockWidget";
import { DockItem } from "./DockItem";
import { HotEdge } from "./HotEdge";
import { OverlayLayer, sizeOf, type Open } from "./OverlayLayer";
import { Toasts } from "./Toasts";

type AppEntry = Extract<Entry, { kind: "app" | "running" }>;

const ALIGN: Record<DockPosition, string> = {
  bottom: "items-end justify-center",
  top: "items-start justify-center",
  left: "items-center justify-start",
  right: "items-center justify-end",
};

export function Dock() {
  const platform = useDock((s) => s.platform)!;
  const { config, windows, icons, ready } = useDock();
  const { reorder } = useDock.getState();
  const { dock, appearance } = config;
  const horizontal = isHorizontal(dock.position);
  const [open, setOpen] = useState<Open | null>(null);
  const closeOverlay = useCallback(() => setOpen(null), []);
  const navRef = useRef<HTMLElement>(null);
  const pointer = useMotionValue(Infinity);
  const { click, newInstance, menuFor, run } = useDockActions();
  const geo = useDockGeometry(navRef, dock, open ? sizeOf(open) : null, ready);
  useFileDrop();

  const { pinned, running } = useMemo(
    () => buildEntries(config.items, windows),
    [config.items, windows],
  );

  useEntryIcons(pinned, running);
  useShellSync(open?.kind === "settings", closeOverlay);

  if (!ready) return null;

  const hide = { bottom: { y: 160 }, top: { y: -160 }, left: { x: -160 }, right: { x: 160 } }[
    dock.position
  ];
  const common = {
    size: dock.iconSize,
    magnification: dock.magnification,
    pointer,
    position: dock.position,
  };

  const renderApp = (e: AppEntry) => (
    <DockItem
      {...common}
      id={e.id}
      label={e.kind === "app" ? e.item.label : e.label}
      icon={icons[e.kind === "app" ? itemKey(e.item) : e.key] || undefined}
      windowCount={e.windows.length}
      running={e.windows.length > 0}
      focused={e.windows.some((w) => w.focused)}
      minimized={e.windows.length > 0 && e.windows.every((w) => w.minimized)}
      onClick={() => click(e)}
      onAux={() => newInstance(e)}
      onContext={() =>
        setOpen({
          kind: "menu",
          title: e.kind === "app" ? e.item.label : e.label,
          actions: [
            ...menuFor(e),
            {
              label: "Properties",
              separatorBefore: true,
              onSelect: () => setOpen({ kind: "props", entry: e }),
            },
          ],
        })
      }
    />
  );

  const renderPinned = (e: Entry) => {
    if (e.kind !== "other") return renderApp(e as AppEntry);
    const it = e.item;
    if (it.type === "separator")
      return (
        <div className={horizontal ? "mx-1 h-8 w-px bg-white/25" : "my-1 h-px w-8 bg-white/25"} />
      );
    if (it.type === "widget")
      return it.widget === "clock" ? <ClockWidget size={dock.iconSize} /> : null;
    const folder = it.type === "folder";
    return (
      <DockItem
        {...common}
        id={it.id}
        label={it.label}
        fallback={folder ? "📁" : <Globe />}
        onClick={() =>
          folder
            ? setOpen({ kind: "stack", item: it })
            : run(platform.launch({ type: "url", url: it.url }))
        }
        onContext={() =>
          setOpen({
            kind: "menu",
            title: it.label,
            actions: [
              ...(folder
                ? [
                    {
                      label: "Open in Explorer",
                      onSelect: () => run(platform.launch({ type: "folder", path: it.path })),
                    },
                  ]
                : []),
              {
                label: "Remove from dock",
                danger: true,
                onSelect: () => useDock.getState().unpin(it.id),
              },
            ],
          })
        }
      />
    );
  };

  const across = horizontal ? geo.nav.h : geo.nav.w;
  const gearSize = Math.round(dock.iconSize * 0.7);

  return (
    <div
      className={`flex h-full w-full overflow-hidden ${ALIGN[dock.position]} ${appearance.solid ? "solid" : ""}`}
      data-theme={appearance.theme}
      style={themeVars(appearance) as CSSProperties}
    >
      <motion.nav
        ref={navRef}
        aria-label="Dock"
        animate={geo.hidden ? hide : { x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className={`glass flex items-center gap-2 p-2 ${horizontal ? "flex-row" : "flex-col"}`}
        onPointerEnter={geo.enter}
        onPointerLeave={() => {
          geo.leave();
          pointer.set(Infinity);
        }}
        onPointerMove={(e) => pointer.set(horizontal ? e.clientX : e.clientY)}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen({ kind: "settings" });
        }}
      >
        <Reorder.Group
          axis={horizontal ? "x" : "y"}
          values={pinned.map((p) => p.id)}
          onReorder={reorder}
          as="div"
          className={`flex items-center gap-2 ${horizontal ? "flex-row" : "flex-col"}`}
        >
          {pinned.map((e) => (
            <Reorder.Item key={e.id} value={e.id} as="div" layout="position">
              {renderPinned(e)}
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {running.length > 0 && (
          <div className={horizontal ? "mx-1 h-8 w-px bg-white/25" : "my-1 h-px w-8 bg-white/25"} />
        )}
        {running.map((e) => (e.kind === "running" ? <div key={e.id}>{renderApp(e)}</div> : null))}
        <button
          aria-label="Settings"
          onClick={() => setOpen({ kind: "settings" })}
          style={{ width: gearSize, height: gearSize }}
          className="flex items-center justify-center rounded-item opacity-70 hover:bg-white/15 hover:opacity-100"
        >
          <Settings size={gearSize * 0.55} />
        </button>
      </motion.nav>

      {geo.hidden && <HotEdge position={dock.position} enter={geo.enter} leave={geo.leave} />}

      <OverlayLayer open={open} position={dock.position} across={across} close={closeOverlay} />
      <Toasts />
    </div>
  );
}

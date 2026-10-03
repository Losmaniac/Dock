import { motion, Reorder, type MotionValue } from "framer-motion";
import { Globe, LayoutGrid, Settings } from "lucide-react";
import { forwardRef } from "react";
import type { DockDef } from "@glass-dock/shared";
import { totalBadge } from "../lib/badge";
import { itemKey, type Entry } from "../lib/entries";
import { isHorizontal } from "../lib/geometry";
import type { AppEntry } from "../lib/overlay";
import type { MenuAction } from "./ContextMenu";
import { DockItem } from "./DockItem";
import { useDock } from "../store/dockStore";
import { WIDGETS } from "../widgets/registry";

interface Props {
  dock: DockDef;
  pinned: Entry[];
  running: Entry[];
  icons: Record<string, string>;
  pointer: MotionValue<number>;
  hidden: boolean;
  active: boolean;
  enter: () => void;
  leave: () => void;
  onReorder: (ids: string[]) => void;
  activate: (e: Entry) => void;
  newInstance: (e: AppEntry) => void;
  openMenu: (title: string, actions: MenuAction[]) => void;
  menuFor: (e: AppEntry) => MenuAction[];
  openSettings: () => void;
  openLauncher: () => void;
  removeItem: (id: string) => void;
  openFolder: (path: string) => void;
  onHover: (entry: AppEntry, center: number | null) => void;
  /** Keyboard focus left the dock. */
  onBlurOut: () => void;
}

const HIDE = { bottom: { y: 160 }, top: { y: -160 }, left: { x: -160 }, right: { x: 160 } };

export const DockBar = forwardRef<HTMLElement, Props>(function DockBar(p, ref) {
  const { dock } = p;
  const horizontal = isHorizontal(dock.position);
  const common = {
    size: dock.iconSize,
    magnification: dock.magnification,
    pointer: p.pointer,
    position: dock.position,
  };
  const dir = horizontal ? "flex-row" : "flex-col";
  const divider = (
    <div className={horizontal ? "mx-1 h-8 w-px bg-white/25" : "my-1 h-px w-8 bg-white/25"} />
  );

  const app = (e: AppEntry) => {
    const label = e.kind === "app" ? e.item.label : e.label;
    return (
      <DockItem
        {...common}
        id={e.id}
        label={label}
        icon={p.icons[e.kind === "app" ? itemKey(e.item) : e.key] || undefined}
        windowCount={e.windows.length}
        running={e.windows.length > 0}
        focused={e.windows.some((w) => w.focused)}
        minimized={e.windows.length > 0 && e.windows.every((w) => w.minimized)}
        badge={totalBadge(e.windows.map((w) => w.title))}
        onHover={(c) => p.onHover(e, c)}
        onClick={() => p.activate(e)}
        onAux={() => p.newInstance(e)}
        onContext={() => p.openMenu(label, p.menuFor(e))}
      />
    );
  };

  const pinnedItem = (e: Entry) => {
    if (e.kind !== "other") return app(e);
    const it = e.item;
    if (it.type === "separator") return divider;
    if (it.type === "widget") {
      return (
        <DockItem
          {...common}
          id={it.id}
          label={WIDGETS[it.widget].label}
          wide={it.size === "wide"}
          fallback={(() => {
            const Face = WIDGETS[it.widget].Face;
            return <Face item={it} active={p.active} wide={it.size === "wide"} />;
          })()}
          onClick={() => p.activate(e)}
          onContext={() =>
            p.openMenu(WIDGETS[it.widget].label, [
              {
                label: it.size === "wide" ? "Make compact" : "Make wide",
                onSelect: () =>
                  useDock
                    .getState()
                    .setWidgetSize(it.widget, it.size === "wide" ? "compact" : "wide"),
              },
              { label: "Remove from dock", danger: true, onSelect: () => p.removeItem(it.id) },
            ])
          }
        />
      );
    }
    const folder = it.type === "folder";
    return (
      <DockItem
        {...common}
        id={it.id}
        label={it.label}
        fallback={folder ? "📁" : <Globe />}
        onClick={() => p.activate(e)}
        onContext={() =>
          p.openMenu(it.label, [
            ...(folder
              ? [{ label: "Open in Explorer", onSelect: () => p.openFolder(it.path) }]
              : []),
            { label: "Remove from dock", danger: true, onSelect: () => p.removeItem(it.id) },
          ])
        }
      />
    );
  };

  const gear = Math.round(dock.iconSize * 0.7);
  return (
    <motion.nav
      ref={ref}
      role="toolbar"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) p.onBlurOut();
      }}
      aria-label="Dock"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      onKeyDown={(e) => {
        const next = horizontal ? "ArrowRight" : "ArrowDown";
        const prev = horizontal ? "ArrowLeft" : "ArrowUp";
        if (![next, prev, "Home", "End"].includes(e.key)) return;
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>("button")];
        const i = items.indexOf(document.activeElement as HTMLElement);
        const target =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? items.length - 1
              : (i + (e.key === next ? 1 : -1) + items.length) % items.length;
        e.preventDefault();
        items[target]?.focus();
      }}
      animate={p.hidden ? HIDE[dock.position] : { x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className={`glass flex items-center gap-2 p-2 ${dir}`}
      onPointerEnter={p.enter}
      onPointerLeave={() => {
        p.leave();
        p.pointer.set(Infinity);
      }}
      onPointerMove={(e) => p.pointer.set(horizontal ? e.clientX : e.clientY)}
      onContextMenu={(e) => {
        e.preventDefault();
        p.openSettings();
      }}
    >
      <Reorder.Group
        axis={horizontal ? "x" : "y"}
        values={p.pinned.map((e) => e.id)}
        onReorder={p.onReorder}
        as="div"
        className={`flex items-center gap-2 ${dir}`}
      >
        {p.pinned.map((e) => (
          <Reorder.Item key={e.id} value={e.id} as="div" layout="position">
            {pinnedItem(e)}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {p.running.length > 0 && divider}
      {p.running.map((e) => (e.kind === "running" ? <div key={e.id}>{app(e)}</div> : null))}
      <button
        aria-label="Launcher"
        onClick={p.openLauncher}
        style={{ width: gear, height: gear }}
        className="flex items-center justify-center rounded-item opacity-70 hover:bg-white/15 hover:opacity-100"
      >
        <LayoutGrid size={gear * 0.55} />
      </button>
      <button
        aria-label="Settings"
        onClick={p.openSettings}
        style={{ width: gear, height: gear }}
        className="flex items-center justify-center rounded-item opacity-70 hover:bg-white/15 hover:opacity-100"
      >
        <Settings size={gear * 0.55} />
      </button>
    </motion.nav>
  );
});

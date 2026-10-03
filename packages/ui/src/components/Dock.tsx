import { useMotionValue } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import { buildEntries } from "../lib/entries";
import { isHorizontal } from "../lib/geometry";
import { needsKeyboard } from "../lib/overlay";
import { themeVars } from "../lib/theme";
import { useDockActions } from "../hooks/useDockActions";
import { useDockGeometry } from "../hooks/useDockGeometry";
import { useFileDrop } from "../hooks/useFileDrop";
import { useHotkeys } from "../hooks/useHotkeys";
import { useWallpaper } from "../hooks/useWallpaper";
import { effectiveAppearance } from "../lib/wallpaper";
import { usePreview } from "../hooks/usePreview";
import { useEntryIcons, useShellSync } from "../hooks/useShellSync";
import { useDock } from "../store/dockStore";
import { DockBar } from "./DockBar";
import { HotEdge } from "./HotEdge";
import { OverlayLayer, sizeOf } from "./OverlayLayer";
import { Toasts } from "./Toasts";
import { WIDGETS } from "../widgets/registry";
import { WindowPreview, previewSize } from "./WindowPreview";

const ALIGN: Record<DockPosition, string> = {
  bottom: "items-end justify-center",
  top: "items-start justify-center",
  left: "items-center justify-start",
  right: "items-center justify-end",
};

export function Dock() {
  const platform = useDock((s) => s.platform)!;
  const { config, windows, icons, ready, open, setOpen, reorder, unpin } = useDock();
  const { dock } = config;
  const wallpaper = useWallpaper(config.appearance.accentFromWallpaper);
  const appearance = effectiveAppearance(config.appearance, wallpaper);
  const horizontal = isHorizontal(dock.position);
  const closeOverlay = useCallback(() => setOpen(null), [setOpen]);
  const navRef = useRef<HTMLElement>(null);
  const pointer = useMotionValue(Infinity);
  const actions = useDockActions();
  const { pinned, running } = useMemo(
    () => buildEntries(config.items, windows),
    [config.items, windows],
  );
  const pv = usePreview(open !== null || dock.autoHide);
  const liveEntry = pv.preview
    ? [...pinned, ...running].find((e) => e.id === pv.preview!.entry.id)
    : undefined;
  const previewEntry =
    liveEntry && liveEntry.kind !== "other" && liveEntry.windows.length > 0 ? liveEntry : null;
  const overlay = open ? sizeOf(open) : previewEntry ? previewSize(previewEntry) : null;
  const geo = useDockGeometry(navRef, dock, overlay, ready);
  useFileDrop();
  useHotkeys(actions.runAction);

  useEntryIcons(pinned, running);
  const keyboardMode = useDock((s) => s.keyboardMode);
  const widgetKeyboard =
    open?.kind === "widget" &&
    config.items.some(
      (i) => i.id === open.itemId && i.type === "widget" && WIDGETS[i.widget].keyboard,
    );
  useShellSync(needsKeyboard(open, keyboardMode, !!widgetKeyboard), closeOverlay);
  const { enter, leave } = geo;
  useEffect(() => {
    if (!keyboardMode) return leave();
    enter(); // keep the dock revealed and roomy for tooltips while navigating by keyboard
    navRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [keyboardMode, enter, leave]);

  if (!ready) return null;
  const across = horizontal ? geo.nav.h : geo.nav.w;

  return (
    <div
      className={`flex h-full w-full overflow-hidden ${ALIGN[dock.position]} ${appearance.solid ? "solid" : ""}`}
      data-theme={appearance.theme}
      data-finish={appearance.finish}
      style={themeVars(appearance) as CSSProperties}
    >
      <div className="relative">
        <DockBar
          onBlurOut={() => useDock.getState().setKeyboardMode(false)}
          onHover={(entry, center) => {
            const nav = navRef.current?.getBoundingClientRect();
            if (!nav || center === null) return pv.hover(entry, null);
            pv.hover(entry, center - (horizontal ? nav.left : nav.top));
          }}
          ref={navRef}
          dock={dock}
          pinned={pinned}
          running={running}
          icons={icons}
          pointer={pointer}
          hidden={geo.hidden}
          active={!geo.hidden}
          enter={geo.enter}
          leave={geo.leave}
          onReorder={reorder}
          activate={actions.activate}
          newInstance={actions.newInstance}
          menuFor={actions.menuFor}
          openMenu={(title, list) => setOpen({ kind: "menu", title, actions: list })}
          openSettings={() => setOpen({ kind: "settings" })}
          openLauncher={() => setOpen({ kind: "launcher" })}
          removeItem={unpin}
          openFolder={(path) => actions.run(platform.launch({ type: "folder", path }))}
        />
        {previewEntry && !open && (
          <WindowPreview
            entry={previewEntry}
            position={dock.position}
            across={across}
            navLength={horizontal ? geo.nav.w : geo.nav.h}
            anchor={pv.preview?.anchor ?? 0}
            keep={pv.keep}
            leave={pv.leave}
          />
        )}
      </div>
      {geo.hidden && <HotEdge position={dock.position} enter={geo.enter} leave={geo.leave} />}
      <OverlayLayer
        open={open}
        position={dock.position}
        across={across}
        close={closeOverlay}
        runEntry={actions.runEntry}
        runAction={actions.runAction}
      />
      <Toasts />
    </div>
  );
}

import { useMotionValue } from "framer-motion";
import { useCallback, useMemo, useRef, type CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import { buildEntries } from "../lib/entries";
import { isHorizontal } from "../lib/geometry";
import { needsKeyboard } from "../lib/overlay";
import { themeVars } from "../lib/theme";
import { useDockActions } from "../hooks/useDockActions";
import { useDockGeometry } from "../hooks/useDockGeometry";
import { useFileDrop } from "../hooks/useFileDrop";
import { useHotkeys } from "../hooks/useHotkeys";
import { useEntryIcons, useShellSync } from "../hooks/useShellSync";
import { useDock } from "../store/dockStore";
import { DockBar } from "./DockBar";
import { HotEdge } from "./HotEdge";
import { OverlayLayer, sizeOf } from "./OverlayLayer";
import { Toasts } from "./Toasts";

const ALIGN: Record<DockPosition, string> = {
  bottom: "items-end justify-center",
  top: "items-start justify-center",
  left: "items-center justify-start",
  right: "items-center justify-end",
};

export function Dock() {
  const platform = useDock((s) => s.platform)!;
  const { config, windows, icons, ready, open, setOpen, reorder, unpin } = useDock();
  const { dock, appearance } = config;
  const horizontal = isHorizontal(dock.position);
  const closeOverlay = useCallback(() => setOpen(null), [setOpen]);
  const navRef = useRef<HTMLElement>(null);
  const pointer = useMotionValue(Infinity);
  const actions = useDockActions();
  const geo = useDockGeometry(navRef, dock, open ? sizeOf(open) : null, ready);
  useFileDrop();
  useHotkeys(actions.runAction);

  const { pinned, running } = useMemo(
    () => buildEntries(config.items, windows),
    [config.items, windows],
  );
  useEntryIcons(pinned, running);
  useShellSync(needsKeyboard(open), closeOverlay);

  if (!ready) return null;
  const across = horizontal ? geo.nav.h : geo.nav.w;

  return (
    <div
      className={`flex h-full w-full overflow-hidden ${ALIGN[dock.position]} ${appearance.solid ? "solid" : ""}`}
      data-theme={appearance.theme}
      style={themeVars(appearance) as CSSProperties}
    >
      <DockBar
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
        removeItem={unpin}
        openFolder={(path) => actions.run(platform.launch({ type: "folder", path }))}
      />
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

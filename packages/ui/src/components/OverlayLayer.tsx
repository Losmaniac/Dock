import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import type { Open } from "../lib/overlay";
import { OVERLAY_GAP } from "../lib/geometry";
import type { Overlay } from "../hooks/useDockGeometry";
import { CommandPalette, PALETTE_SIZE } from "./CommandPalette";
import { findItem } from "../lib/docks";
import { useDock } from "../store/dockStore";
import { ContextMenu, MENU_ROW, menuRows } from "./ContextMenu";
import { LAUNCHER_SIZE, Launcher } from "./Launcher";
import { WELCOME_SIZE, Welcome } from "./Welcome";
import { FolderStack, STACK_SIZE } from "./FolderStack";
import { PropertiesPanel, PROPS_SIZE } from "./PropertiesPanel";
import { SETTINGS_SIZE, SettingsPanel } from "./SettingsPanel";
import { Switcher } from "./Switcher";
import { WidgetPanel, widgetPanelSize } from "./WidgetPanel";

export function sizeOf(o: Open): Overlay {
  switch (o.kind) {
    case "settings":
      return SETTINGS_SIZE;
    case "stack":
      return STACK_SIZE;
    case "props":
      return PROPS_SIZE;
    case "palette":
      return PALETTE_SIZE;
    case "widget": {
      const it = findItem(useDock.getState().config, o.itemId);
      return it?.type === "widget" ? widgetPanelSize(it.widget) : { w: 300, h: 220 };
    }
    case "launcher":
      return LAUNCHER_SIZE;
    case "welcome":
      return WELCOME_SIZE;
    case "switcher":
      return { w: 1, h: 1, fullscreen: true };
    case "menu":
      return { w: 240, h: 48 + (menuRows(o.actions) + 1) * (MENU_ROW + 2) + 12 };
  }
}

function panelStyle(p: DockPosition, across: number): CSSProperties {
  const off = across + OVERLAY_GAP;
  switch (p) {
    case "bottom":
      return { bottom: off, left: "50%", transform: "translateX(-50%)" };
    case "top":
      return { top: off, left: "50%", transform: "translateX(-50%)" };
    case "left":
      return { left: off, top: "50%", transform: "translateY(-50%)" };
    case "right":
      return { right: off, top: "50%", transform: "translateY(-50%)" };
  }
}

export function OverlayLayer(props: {
  open: Open | null;
  runEntry: (entryId: string) => void;
  runAction: (actionId: string, target: string | null) => void;
  position: DockPosition;
  across: number;
  close: () => void;
}) {
  const { open, close } = props;
  if (open?.kind === "switcher") return <Switcher close={close} />;
  return (
    <AnimatePresence>
      {open && (
        <div
          key={open.kind}
          className="absolute z-20"
          style={panelStyle(props.position, props.across)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {open.kind === "menu" && (
              <ContextMenu title={open.title} actions={open.actions} close={close} />
            )}
            {open.kind === "launcher" && <Launcher close={close} />}
            {open.kind === "welcome" && <Welcome close={close} />}
            {open.kind === "settings" && <SettingsPanel close={close} run={props.runAction} />}
            {open.kind === "stack" && <FolderStack item={open.item} close={close} />}
            {open.kind === "widget" && <WidgetPanel itemId={open.itemId} close={close} />}
            {open.kind === "palette" && (
              <CommandPalette
                target={open.target}
                close={close}
                runEntry={props.runEntry}
                runAction={props.runAction}
              />
            )}
            {open.kind === "props" && <PropertiesPanel entry={open.entry} close={close} />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

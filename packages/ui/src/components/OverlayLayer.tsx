import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { DockPosition } from "@glass-dock/shared";
import type { Entry } from "../lib/entries";
import { OVERLAY_GAP } from "../lib/geometry";
import type { Overlay } from "../hooks/useDockGeometry";
import { ContextMenu, MENU_ROW, type MenuAction } from "./ContextMenu";
import { FolderStack, STACK_SIZE } from "./FolderStack";
import { PropertiesPanel, PROPS_SIZE } from "./PropertiesPanel";
import { SETTINGS_SIZE, SettingsPanel } from "./SettingsPanel";

type AppEntry = Extract<Entry, { kind: "app" | "running" }>;
export type Open =
  | { kind: "menu"; title: string; actions: MenuAction[] }
  | { kind: "settings" }
  | { kind: "stack"; item: Extract<Extract<Entry, { kind: "other" }>["item"], { type: "folder" }> }
  | { kind: "props"; entry: AppEntry };

export const sizeOf = (o: Open): Overlay =>
  o.kind === "settings"
    ? SETTINGS_SIZE
    : o.kind === "stack"
      ? STACK_SIZE
      : o.kind === "props"
        ? PROPS_SIZE
        : { w: 240, h: 48 + o.actions.length * (MENU_ROW + 2) + 12 };

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
  position: DockPosition;
  across: number;
  close: () => void;
}) {
  const { open, close } = props;
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
            {open.kind === "settings" && <SettingsPanel close={close} />}
            {open.kind === "stack" && <FolderStack item={open.item} close={close} />}
            {open.kind === "props" && <PropertiesPanel entry={open.entry} close={close} />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

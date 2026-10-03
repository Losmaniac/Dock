import type { DockItem } from "@glass-dock/shared";
import type { Entry } from "./entries";
import type { MenuAction } from "../components/ContextMenu";

export type AppEntry = Extract<Entry, { kind: "app" | "running" }>;
export type WidgetKind = Extract<DockItem, { type: "widget" }>["widget"];

/** What is currently shown above the dock bar. At most one at a time. */
export type Open =
  | { kind: "menu"; title: string; actions: MenuAction[] }
  | { kind: "settings" }
  | { kind: "palette"; target: string | null }
  | { kind: "widget"; widget: WidgetKind }
  | { kind: "stack"; item: Extract<DockItem, { type: "folder" }> }
  | { kind: "props"; entry: AppEntry };

export const needsKeyboard = (o: Open | null) => o?.kind === "settings" || o?.kind === "palette";

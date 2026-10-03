import type { FC } from "react";
import type { DockItem } from "@glass-dock/shared";

export type WidgetItem = Extract<DockItem, { type: "widget" }>;

export interface FaceProps {
  item: WidgetItem;
  /** False while the dock is hidden; faces must not poll or tick then. */
  active: boolean;
  wide: boolean;
}

export interface PanelProps {
  item: WidgetItem;
  close: () => void;
}

export interface WidgetDef {
  label: string;
  Face: FC<FaceProps>;
  Panel?: FC<PanelProps>;
  panel?: { w: number; h: number };
  /** The panel has text fields, so the dock window must be allowed to take keyboard focus. */
  keyboard?: boolean;
  /** Shown in settings under this group. */
  group: "Time" | "Tools" | "System" | "Media" | "Online";
}

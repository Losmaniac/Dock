import type { SnapLayout } from "@glass-dock/shared";

export const SNAP_LAYOUTS: readonly { layout: SnapLayout; label: string }[] = [
  { layout: "left-half", label: "Left half" },
  { layout: "right-half", label: "Right half" },
  { layout: "top-half", label: "Top half" },
  { layout: "bottom-half", label: "Bottom half" },
  { layout: "top-left", label: "Top left" },
  { layout: "top-right", label: "Top right" },
  { layout: "bottom-left", label: "Bottom left" },
  { layout: "bottom-right", label: "Bottom right" },
  { layout: "left-third", label: "Left third" },
  { layout: "center-third", label: "Center third" },
  { layout: "right-third", label: "Right third" },
  { layout: "maximize", label: "Maximize" },
];

export const OPACITY_STEPS = [1, 0.9, 0.75, 0.5] as const;

export const ACTION_IDS = {
  palette: "command-palette",
  toggleDock: "toggle-dock",
  settings: "open-settings",
  toggleAutoHide: "toggle-autohide",
} as const;

export const snapActionId = (l: SnapLayout) => `snap:${l}`;
export const jumpActionId = (n: number) => `jump:${n}`;

export type ParsedAction =
  | { type: "snap"; layout: SnapLayout }
  | { type: "jump"; index: number }
  | { type: "simple"; id: string };

export function parseAction(id: string): ParsedAction {
  if (id.startsWith("snap:")) return { type: "snap", layout: id.slice(5) as SnapLayout };
  if (id.startsWith("jump:")) return { type: "jump", index: Number(id.slice(5)) };
  return { type: "simple", id };
}

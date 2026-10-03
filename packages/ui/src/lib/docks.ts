import {
  newDock,
  type DockConfig,
  type DockDef,
  type DockItem,
  type MonitorInfo,
} from "@glass-dock/shared";

/** The dock a window shows: `null` means the main window, which shows the first dock. */
export function currentDock(cfg: DockConfig, dockId: string | null): DockDef {
  return (dockId ? cfg.docks.find((d) => d.id === dockId) : undefined) ?? cfg.docks[0]!;
}

/** True when this window's dock was removed from the config (the window should go away). */
export const isOrphan = (cfg: DockConfig, dockId: string | null): boolean =>
  dockId !== null && !cfg.docks.slice(1).some((d) => d.id === dockId);

/** Item ids are unique across docks, so widgets and menus can look an item up globally. */
export function findItem(cfg: DockConfig, id: string): DockItem | undefined {
  for (const d of cfg.docks) {
    const it = d.items.find((i) => i.id === id);
    if (it) return it;
  }
  return undefined;
}

/** Ids of the docks that need their own window (everything after the main one). */
export const extraDockIds = (cfg: DockConfig): string[] => cfg.docks.slice(1).map((d) => d.id);

/** A dock for every monitor that has none yet, cloning layout settings (not items) from `template`. */
export function docksForMissingMonitors(
  cfg: DockConfig,
  monitors: MonitorInfo[],
  template: DockDef,
): DockDef[] {
  const taken = new Set(
    cfg.docks.map((d) =>
      d.monitor === "primary" ? (monitors.find((m) => m.primary)?.id ?? "primary") : d.monitor,
    ),
  );
  return monitors
    .filter((m) => !taken.has(m.id))
    .map((m, i) =>
      newDock({
        name: `Dock ${cfg.docks.length + i + 1}`,
        monitor: m.id,
        position: template.position,
        iconSize: template.iconSize,
        magnification: template.magnification,
        autoHide: template.autoHide,
        autoHideDelay: template.autoHideDelay,
      }),
    );
}

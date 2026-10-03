import type { DockConfig, MonitorInfo } from "@glass-dock/shared";

/** Plain-text summary for bug reports. Contains no paths, keys, titles or file names. */
export function diagnosticsText(
  cfg: DockConfig,
  monitors: MonitorInfo[],
  env: { userAgent: string; dataDir: string },
): string {
  const widgets = cfg.docks.flatMap((d) => d.items).filter((i) => i.type === "widget");
  const lines = [
    "Glass Dock diagnostics",
    `Config version: ${cfg.version}`,
    `Docks: ${cfg.docks.length} (${cfg.docks.map((d) => `${d.position}@${d.monitor === "primary" ? "primary" : "monitor"}`).join(", ")})`,
    `Items: ${cfg.docks.reduce((n, d) => n + d.items.length, 0)}, widgets: ${widgets.length}`,
    `Theme: ${cfg.appearance.themeId} / ${cfg.appearance.finish}, blur ${cfg.appearance.blurMode}${cfg.appearance.solid ? ", solid" : ""}`,
    `Hide taskbar: ${cfg.system.hideTaskbar}`,
    `Online widgets configured: calendar ${cfg.integrations.calendarUrl ? "yes" : "no"}, weather ${cfg.integrations.weatherKey ? "yes" : "no"}`,
    `Workspaces: ${cfg.workspaces.length}`,
    `Monitors: ${monitors.map((m) => `${m.width}x${m.height}@${Math.round(m.scale * 100)}%${m.primary ? " (primary)" : ""}`).join(", ") || "unknown"}`,
    `Data folder: ${env.dataDir}`,
    `Runtime: ${env.userAgent}`,
  ];
  return lines.join("\n");
}

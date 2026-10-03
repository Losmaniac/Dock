import type { DocHit, RecentFile, StartApp } from "@glass-dock/shared";
import { rank } from "./fuzzy";

export interface SettingsLink {
  title: string;
  page: string;
}

/** A few common Windows Settings pages. Empty page = Settings home. */
export const SETTINGS_LINKS: readonly SettingsLink[] = [
  { title: "Windows Settings", page: "" },
  { title: "Display", page: "display" },
  { title: "Sound", page: "sound" },
  { title: "Network and Wi-Fi", page: "network-wifi" },
  { title: "Bluetooth and devices", page: "bluetooth" },
  { title: "Apps", page: "appsfeatures" },
  { title: "Personalization", page: "personalization" },
  { title: "Power and battery", page: "powersleep" },
  { title: "Windows Update", page: "windowsupdate" },
];

export type Row =
  | { kind: "app"; id: string; title: string; subtitle: string; app: StartApp }
  | { kind: "file"; id: string; title: string; subtitle: string; path: string; isDir: boolean }
  | { kind: "settings"; id: string; title: string; subtitle: string; page: string }
  | { kind: "dock-settings"; id: string; title: string; subtitle: string };

export interface Sections {
  heading: string;
  rows: Row[];
}

const appRow = (a: StartApp): Row => ({
  kind: "app",
  id: `app:${a.aumid ?? a.path ?? a.name}`,
  title: a.name,
  subtitle: a.category,
  app: a,
});
const fileRow = (f: RecentFile | DocHit): Row => ({
  kind: "file",
  id: `file:${f.path}`,
  title: f.name,
  subtitle: f.path,
  path: f.path,
  isDir: f.isDir,
});
const settingsRows = (): Row[] =>
  SETTINGS_LINKS.map((s) => ({
    kind: "settings",
    id: `settings:${s.page}`,
    title: s.title,
    subtitle: "Windows Settings",
    page: s.page,
  }));
const dockSettings: Row = {
  kind: "dock-settings",
  id: "dock-settings",
  title: "Glass Dock settings",
  subtitle: "This dock",
};

export const categoriesOf = (apps: StartApp[]): string[] =>
  [...new Set(apps.map((a) => a.category))].sort((a, b) =>
    a === "Apps" ? -1 : b === "Apps" ? 1 : a.localeCompare(b),
  );

/**
 * What the launcher shows. No query: the chosen category (or pinned apps and recent files).
 * With a query: matching apps, Settings pages and the dock's own settings, then documents.
 */
export function buildSections(p: {
  query: string;
  category: string | null;
  apps: StartApp[];
  pinned: StartApp[];
  recents: RecentFile[];
  docs: DocHit[];
}): Sections[] {
  const q = p.query.trim();
  if (q) {
    const apps = rank(p.apps, q, (a) => a.name, 12).map(appRow);
    const settings = rank([...settingsRows(), dockSettings], q, (r) => r.title, 5);
    const out: Sections[] = [
      { heading: "Apps", rows: apps },
      { heading: "Settings", rows: settings },
      { heading: "Documents", rows: p.docs.map(fileRow) },
    ];
    return out.filter((s) => s.rows.length);
  }
  if (p.category) {
    return [
      { heading: p.category, rows: p.apps.filter((a) => a.category === p.category).map(appRow) },
    ];
  }
  return [
    { heading: "Pinned", rows: p.pinned.map(appRow) },
    { heading: "Recent files", rows: p.recents.slice(0, 8).map(fileRow) },
    { heading: "Settings", rows: [dockSettings, ...settingsRows().slice(0, 3)] },
  ].filter((s) => s.rows.length);
}

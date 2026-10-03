import { create } from "zustand";
import type { DockConfig, DockItem, MonitorInfo, PathInfo, WindowInfo } from "@glass-dock/shared";
import { defaultConfig } from "@glass-dock/shared";
import type { PlatformAPI } from "@glass-dock/platform";
import type { Open, WidgetKind } from "../lib/overlay";

export interface Toast {
  id: number;
  text: string;
}

interface DockState {
  platform: PlatformAPI | null;
  ready: boolean;
  config: DockConfig;
  windows: WindowInfo[];
  monitors: MonitorInfo[];
  open: Open | null;
  setOpen(o: Open | null): void;
  toggleWidget(widget: WidgetKind, on: boolean): void;
  icons: Record<string, string>;
  toasts: Toast[];
  init(platform: PlatformAPI): () => void;
  edit(fn: (draft: DockConfig) => void): void;
  setConfig(cfg: DockConfig): void;
  reorder(ids: string[]): void;
  pinPath(info: PathInfo): void;
  pinRunning(label: string, path: string, aumid: string | null): void;
  unpin(id: string): void;
  loadIcon(key: string, source: { path: string } | { aumid: string }): void;
  report(error: unknown): void;
}

let toastId = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const messageOf = (e: unknown): string =>
  typeof e === "object" && e && "message" in e
    ? String((e as { message: unknown }).message)
    : String(e);

const uid = () => crypto.randomUUID();

export const useDock = create<DockState>((set, get) => {
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get()
        .platform?.saveConfig(get().config)
        .catch((e) => get().report(e));
    }, 400);
  };

  return {
    platform: null,
    ready: false,
    config: defaultConfig(),
    windows: [],
    monitors: [],
    open: null,
    setOpen: (open) => set({ open }),
    icons: {},
    toasts: [],

    init(platform) {
      set({ platform });
      let alive = true;
      void platform.loadConfig().then((config) => alive && set({ config, ready: true }));
      void platform.listWindows().then((windows) => alive && set({ windows }));
      void platform.getMonitors().then((monitors) => alive && set({ monitors }));
      const off = platform.onWindowsChanged((windows) => set({ windows }));
      const offMon = platform.onMonitorsChanged((monitors) => set({ monitors }));
      return () => {
        alive = false;
        off();
        offMon();
      };
    },

    edit(fn) {
      const draft = structuredClone(get().config);
      fn(draft);
      set({ config: draft });
      save();
    },

    setConfig(config) {
      set({ config });
      save();
    },

    reorder(ids) {
      get().edit((d) => {
        const byId = new Map(d.items.map((i) => [i.id, i]));
        d.items = ids.map((id) => byId.get(id)).filter((i): i is DockItem => !!i);
      });
    },

    toggleWidget(widget, on) {
      get().edit((d) => {
        const has = d.items.some((i) => i.type === "widget" && i.widget === widget);
        if (on && !has) d.items.push({ id: uid(), type: "widget", widget });
        if (!on) d.items = d.items.filter((i) => !(i.type === "widget" && i.widget === widget));
      });
    },

    pinPath(info) {
      get().edit((d) => {
        const lower = info.path.toLowerCase();
        if (d.items.some((i) => "path" in i && i.path.toLowerCase() === lower)) return;
        if (info.kind === "app") {
          d.items.push({
            id: uid(),
            type: "app",
            label: info.label,
            path: info.path,
            args: info.args,
          });
        } else if (info.kind === "folder") {
          d.items.push({ id: uid(), type: "folder", label: info.label, path: info.path });
        }
      });
    },

    pinRunning(label, path, aumid) {
      get().edit((d) => {
        d.items.push({
          id: uid(),
          type: "app",
          label,
          path,
          args: [],
          ...(aumid ? { aumid } : {}),
        });
      });
    },

    unpin(id) {
      get().edit((d) => {
        d.items = d.items.filter((i) => i.id !== id);
      });
    },

    loadIcon(key, source) {
      const { platform, icons } = get();
      if (!platform || key in icons) return;
      set({ icons: { ...icons, [key]: "" } }); // mark in flight
      platform
        .getIcon(source)
        .then((url) => set((s) => ({ icons: { ...s.icons, [key]: url } })))
        .catch(() => set((s) => ({ icons: { ...s.icons, [key]: "" } })));
    },

    report(error) {
      const t = { id: ++toastId, text: messageOf(error) };
      set((s) => ({ toasts: [...s.toasts, t] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), 5000);
    },
  };
});
